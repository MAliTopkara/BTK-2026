"""
Katman 8 — Karar Motoru (Decision Agent)
TASK-24: 7 katman çıktısını ağırlıklı skorla birleştirir, Gemini 2.5 Pro
thinking modu ile Türkçe akıl yürütme + final karar üretir.
"""

from __future__ import annotations

import logging
from typing import Literal

from app.models.scan import LayerResult, ReasoningStep
from app.services.gemini import generate_json_with_thinking
from app.utils.prompts import decision_agent_prompt

logger = logging.getLogger(__name__)

# PROJECT.md'deki katman ağırlıkları
_WEIGHTS: dict[str, float] = {
    "review": 0.20,
    "discount": 0.20,
    "manipulation": 0.10,
    "seller": 0.15,
    "visual": 0.20,
    "crossplatform": 0.05,
    "phishing": 0.10,
}


# Veri kalitesi eşiği: skor üreten katman (RISK/WARN/OK) sayısı bu sayının
# altındaysa BUY verdict'i CAUTION'a indirilir. Sebep: scraper bazı sitelerde
# yorum/fiyat geçmişi/urgency çekemeyince agent'lar INFO döner, kalan az sayıda
# OK üzerinden hesaplanan ortalama "yanıltıcı pozitif" üretir. Bu guard demoda
# ve gerçek kullanımda "veri yok ama BUY" hatasını engeller.
_MIN_SCORING_LAYERS_FOR_BUY = 4


async def run_decision(
    layer_results: dict[str, LayerResult],
) -> tuple[int, Literal["BUY", "CAUTION", "AVOID"], list[ReasoningStep], str]:
    """
    7 katman sonucunu birleştirip karar üretir.

    Veri kalitesi guard: yeterli sayıda katman skor üretmediyse (4'ten az)
    BUY otomatik olarak CAUTION'a düşürülür — yanıltıcı pozitif önlemi.

    Returns:
        (overall_score, verdict, reasoning_steps, final_explanation)
    """
    overall_score = _compute_overall_score(layer_results)
    verdict = _score_to_verdict(overall_score)

    # Skor üreten katmanları say (crossplatform hariç, çünkü fırsat katmanı)
    scoring_layers = [
        r for lid, r in layer_results.items()
        if r.score is not None and lid != "crossplatform"
    ]
    insufficient_data = len(scoring_layers) < _MIN_SCORING_LAYERS_FOR_BUY

    if verdict == "BUY" and insufficient_data:
        logger.info(
            "Veri kalitesi guard: BUY -> CAUTION (sadece %d katman skor üretti)",
            len(scoring_layers),
        )
        verdict = "CAUTION"
        # Skoru da 50 ile bantla — "yetersiz veri" işareti
        overall_score = min(overall_score, 55)

    reasoning_steps, final_explanation = await _gemini_reasoning(
        layer_results, overall_score, verdict
    )

    # Guard tetiklenmişse reasoning'in başına bir uyarı ekle
    if verdict == "CAUTION" and insufficient_data:
        warning_step = ReasoningStep(
            step=0,
            content=(
                f"⚠️ Veri kalitesi düşük: yalnızca {len(scoring_layers)}/6 katman "
                "skor üretebildi (yorum, fiyat geçmişi veya manipülasyon sinyali "
                "çekilemedi). Bu yüzden 'AL' yerine 'DİKKATLİ OL' diyorum."
            ),
        )
        reasoning_steps = [warning_step, *reasoning_steps]

    return overall_score, verdict, reasoning_steps, final_explanation


# ---------------------------------------------------------------------------
# Skor ve verdict
# ---------------------------------------------------------------------------

def compute_overall_score(layer_results: dict[str, LayerResult]) -> int:
    """Public wrapper — mock_runner ve testler için."""
    return _compute_overall_score(layer_results)


def score_to_verdict(score: int) -> Literal["BUY", "CAUTION", "AVOID"]:
    """Public wrapper — mock_runner ve testler için."""
    return _score_to_verdict(score)


def _compute_overall_score(layer_results: dict[str, LayerResult]) -> int:
    """
    Mevcut katmanların ağırlıklı ortalaması.
    score=None olan katmanlar (INFO) hesaba katılmaz.
    crossplatform katmanı skor hesabına dahil edilmez (fırsat katmanı).
    """
    weighted_sum = 0.0
    total_weight = 0.0
    for layer_id, result in layer_results.items():
        if result.score is None:
            continue
        if layer_id == "crossplatform":
            continue   # Pozitif sinyal — negatif etki yaratmasın
        weight = _WEIGHTS.get(layer_id, 0.0)
        weighted_sum += result.score * weight
        total_weight += weight
    if total_weight == 0:
        return 50
    return round(weighted_sum / total_weight)


def _score_to_verdict(score: int) -> Literal["BUY", "CAUTION", "AVOID"]:
    if score >= 70:
        return "BUY"
    if score >= 40:
        return "CAUTION"
    return "AVOID"


# ---------------------------------------------------------------------------
# Gemini reasoning
# ---------------------------------------------------------------------------

async def _gemini_reasoning(
    layer_results: dict[str, LayerResult],
    overall_score: int,
    verdict: str,
) -> tuple[list[ReasoningStep], str]:
    """
    Gemini 2.5 Pro thinking modu ile akıl yürütme zinciri üretir.
    Hata durumunda rule-based fallback döner.
    """
    layers_list = [
        {
            "layer_id": r.layer_id,
            "name": r.name,
            "status": r.status,
            "score": r.score,
            "finding": r.finding,
        }
        for r in layer_results.values()
    ]

    try:
        result, _thinking = await generate_json_with_thinking(
            decision_agent_prompt(layers_list, overall_score, verdict)
        )
        steps = _parse_reasoning_steps(result.get("reasoning_steps", []))
        explanation = result.get("final_explanation", "")
        if not explanation:
            explanation = _fallback_explanation(overall_score, verdict, layer_results)
        return steps, explanation
    except Exception as exc:
        logger.warning("Decision Agent Gemini hatası, fallback kullanılıyor: %s", exc)
        return _fallback_reasoning(overall_score, verdict, layer_results)


def _parse_reasoning_steps(raw: list) -> list[ReasoningStep]:
    """Gemini yanıtından ReasoningStep listesi oluşturur."""
    steps: list[ReasoningStep] = []
    for i, item in enumerate(raw):
        if not isinstance(item, dict):
            continue
        content = item.get("content", "")
        if not content:
            continue
        steps.append(ReasoningStep(step=item.get("step", i + 1), content=content))
    return steps


def _fallback_reasoning(
    overall_score: int,
    verdict: str,
    layer_results: dict[str, LayerResult],
) -> tuple[list[ReasoningStep], str]:
    """Gemini kullanılamadığında rule-based akıl yürütme zinciri."""
    steps: list[ReasoningStep] = []

    risk_layers = [r for r in layer_results.values() if r.status == "RISK"]
    warn_layers = [r for r in layer_results.values() if r.status == "WARN"]
    ok_layers = [r for r in layer_results.values() if r.status == "OK"]

    step_num = 1
    if risk_layers:
        names = ", ".join(r.name for r in risk_layers[:2])
        steps.append(ReasoningStep(
            step=step_num,
            content=f"Kritik riskler tespit edildi: {names}.",
        ))
        step_num += 1

    if warn_layers:
        names = ", ".join(r.name for r in warn_layers[:2])
        steps.append(ReasoningStep(
            step=step_num,
            content=f"Dikkat gerektiren katmanlar: {names}.",
        ))
        step_num += 1

    if ok_layers:
        names = ", ".join(r.name for r in ok_layers[:3])
        steps.append(ReasoningStep(
            step=step_num,
            content=f"Güvenli katmanlar: {names}.",
        ))
        step_num += 1

    steps.append(ReasoningStep(
        step=step_num,
        content=f"Genel skor {overall_score}/100 olarak hesaplandı.",
    ))

    explanation = _fallback_explanation(overall_score, verdict, layer_results)
    return steps, explanation


def build_fallback_explanation(
    score: int,
    verdict: str,
    layer_results: dict[str, LayerResult],
) -> str:
    """Public wrapper — test_scan_endpoint.py uyumluluğu için."""
    return _fallback_explanation(score, verdict, layer_results)


def _fallback_explanation(
    score: int,
    verdict: str,
    layer_results: dict[str, LayerResult],
) -> str:
    verdict_tr = {"BUY": "AL", "CAUTION": "DİKKATLİ OL", "AVOID": "ALMA"}.get(verdict, verdict)
    risk_layers = [r.name for r in layer_results.values() if r.status == "RISK"]
    warn_layers = [r.name for r in layer_results.values() if r.status == "WARN"]

    parts = [f"Genel skor: {score}/100 — Karar: {verdict_tr}."]
    if risk_layers:
        parts.append(f"Yüksek risk: {', '.join(risk_layers)}.")
    if warn_layers:
        parts.append(f"Dikkat: {', '.join(warn_layers)}.")
    if not risk_layers and not warn_layers:
        parts.append("Analiz edilen katmanlarda belirgin sorun tespit edilmedi.")
    return " ".join(parts)
