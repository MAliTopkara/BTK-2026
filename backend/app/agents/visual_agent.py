"""
Katman 5 — Görsel Doğrulama
TASK-21: Ürün görsellerini Gemini Vision ile analiz eder.
Stok fotoğraf, AI üretimi, replica risk, logo tutarsızlığı tespiti.
"""

from __future__ import annotations

import logging

from app.agents.base import BaseAgent
from app.models.scan import LayerResult, ProductData
from app.services.gemini import analyze_image
from app.utils.prompts import visual_analysis_prompt

logger = logging.getLogger(__name__)

_MAX_IMAGES = 3          # token maliyeti limiti
_MIN_AUTH_SCORE = 70     # bu altı WARN
_RISK_THRESHOLD = 40     # bu altı RISK


class VisualAgent(BaseAgent):
    layer_id = "visual"
    name = "Görsel Doğrulama"

    async def analyze(self, product: ProductData) -> LayerResult:
        images = [img for img in product.images if img][:_MAX_IMAGES]

        if not images:
            return LayerResult(
                layer_id=self.layer_id,
                name=self.name,
                status="INFO",
                score=None,
                finding="Analiz edilecek ürün görseli bulunamadı",
                details={},
                confidence=0.0,
            )

        # Her görsel için ayrı analiz — sonuçları birleştir
        results = []
        for img_url in images:
            try:
                result = await analyze_image(
                    prompt=visual_analysis_prompt(),
                    image_url=img_url,
                )
                results.append(result)
            except Exception as exc:
                logger.warning("Görsel analiz hatası (%s): %s", img_url, exc)

        if not results:
            return LayerResult(
                layer_id=self.layer_id,
                name=self.name,
                status="INFO",
                score=None,
                finding="Görseller analiz edilemedi",
                details={"analyzed_count": 0},
                confidence=0.0,
            )

        score, flags, details = _aggregate_results(results, len(images))
        status = _score_to_status(score)
        finding = _build_finding(score, flags, len(results))

        return LayerResult(
            layer_id=self.layer_id,
            name=self.name,
            status=status,
            score=score,
            finding=finding,
            details=details,
            confidence=0.80,
        )


# ---------------------------------------------------------------------------
# Yardımcı fonksiyonlar
# ---------------------------------------------------------------------------

def _aggregate_results(
    results: list[dict],
    total_images: int,
) -> tuple[int, list[str], dict]:
    """
    Birden fazla görsel analiz sonucunu birleştirir.
    En düşük authenticity_score belirleyici.
    """
    auth_scores = []
    all_flags: list[str] = []
    ai_likelihoods: list[float] = []
    replica_risks: list[str] = []
    stock_count = 0

    for r in results:
        auth = r.get("authenticity_score")
        if isinstance(auth, (int, float)):
            auth_scores.append(int(auth))

        flags = r.get("flags", [])
        if isinstance(flags, list):
            all_flags.extend(flags)

        ai_like = r.get("ai_generated_likelihood")
        if isinstance(ai_like, (int, float)):
            ai_likelihoods.append(float(ai_like))

        replica = r.get("replica_risk", "low")
        if isinstance(replica, str):
            replica_risks.append(replica)

        if r.get("is_stock_photo"):
            stock_count += 1

    # Birleşik skor: analizlerin ortalaması ağırlıklı değil, minimum belirleyici
    if auth_scores:
        # %70 minimum + %30 ortalama
        min_score = min(auth_scores)
        avg_score = sum(auth_scores) // len(auth_scores)
        score = int(0.7 * min_score + 0.3 * avg_score)
    else:
        score = 50

    # AI üretimi yüksekse skoru düşür
    if ai_likelihoods:
        avg_ai = sum(ai_likelihoods) / len(ai_likelihoods)
        if avg_ai > 0.7:
            score = min(score, 30)
        elif avg_ai > 0.4:
            score = min(score, 60)

    # Replica risk yüksekse skoru düşür
    high_replica = replica_risks.count("high")
    if high_replica > 0:
        score = min(score, 35)
    elif len(results) > 0 and replica_risks.count("medium") >= max(1, len(results) // 2):
        score = min(score, 60)

    score = max(0, min(100, score))

    # Tekrar eden flag'leri temizle
    unique_flags = list(dict.fromkeys(all_flags))

    details = {
        "analyzed_count": len(results),
        "total_images": total_images,
        "authenticity_scores": auth_scores,
        "stock_photo_count": stock_count,
        "avg_ai_likelihood": round(sum(ai_likelihoods) / len(ai_likelihoods), 2) if ai_likelihoods else 0.0,
        "replica_risks": replica_risks,
        "flags": unique_flags,
        "per_image_results": results,
    }

    return score, unique_flags, details


def _score_to_status(score: int) -> str:
    if score < _RISK_THRESHOLD:
        return "RISK"
    if score < _MIN_AUTH_SCORE:
        return "WARN"
    return "OK"


def _build_finding(score: int, flags: list[str], analyzed: int) -> str:
    if score >= _MIN_AUTH_SCORE:
        return f"{analyzed} görsel analiz edildi — özgünlük skoru yüksek"

    flag_str = ""
    if flags:
        top_flags = flags[:3]
        flag_str = ": " + ", ".join(top_flags)

    if score < _RISK_THRESHOLD:
        return f"{analyzed} görselde ciddi sorun tespit edildi{flag_str}"
    return f"{analyzed} görselde şüpheli unsur bulundu{flag_str}"
