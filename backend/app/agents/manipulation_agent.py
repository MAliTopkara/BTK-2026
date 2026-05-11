"""
Katman 3 — Manipülatif Tasarım / Dark Pattern Tespiti
TASK-12: Sahte aciliyet, sosyal kanıt manipülasyonu ve dark pattern analizi.
"""

from __future__ import annotations

import logging

from app.agents.base import BaseAgent
from app.models.scan import LayerResult, ProductData
from app.services.gemini import generate_json
from app.utils.prompts import manipulation_detection_prompt

logger = logging.getLogger(__name__)

_HTML_EXCERPT_LIMIT = 1500  # token tasarrufu

_PATTERN_LABELS: dict[str, str] = {
    "fake_urgency": "Sahte aciliyet",
    "fake_social_proof": "Sahte sosyal kanıt",
    "confirmshaming": "Reddetme manipülasyonu",
    "hidden_cost": "Gizli maliyet",
    "preselection": "Otomatik seçim",
}


class ManipulationAgent(BaseAgent):
    layer_id = "manipulation"
    name = "Manipülatif Tasarım"

    async def analyze(self, product: ProductData) -> LayerResult:
        if not product.urgency_indicators and not product.raw_html:
            return LayerResult(
                layer_id=self.layer_id,
                name=self.name,
                status="INFO",
                score=None,
                finding="Analiz için aciliyet göstergesi veya sayfa içeriği bulunamadı",
            )

        html_excerpt = (product.raw_html or "")[:_HTML_EXCERPT_LIMIT]
        prompt = manipulation_detection_prompt(product.urgency_indicators, html_excerpt)

        try:
            result = await generate_json(prompt)
        except Exception as exc:
            logger.warning("[manipulation] Gemini hatası: %s", exc)
            return LayerResult(
                layer_id=self.layer_id,
                name=self.name,
                status="WARN",
                score=50,
                finding="Gemini analizi başarısız, manipülasyon doğrulanamıyor",
                confidence=0.2,
            )

        patterns: list[dict] = result.get("patterns_found", [])
        score = max(0, min(100, int(result.get("manipulation_score", 50))))
        summary = result.get("summary", "")

        high_severity = [p for p in patterns if p.get("severity") == "high"]
        status = _score_to_status(score)
        finding = _build_finding(patterns, summary)

        return LayerResult(
            layer_id=self.layer_id,
            name=self.name,
            status=status,
            score=score,
            finding=finding,
            details={
                "patterns_found": patterns,
                "pattern_count": len(patterns),
                "high_severity_count": len(high_severity),
                "urgency_indicators": product.urgency_indicators,
                "gemini_summary": summary,
            },
            confidence=0.8,
        )


# ---------------------------------------------------------------------------
# Yardımcı fonksiyonlar
# ---------------------------------------------------------------------------

def _score_to_status(score: int) -> str:
    # manipulation_score: 100 = temiz, 0 = çok manipülatif
    if score >= 70:
        return "OK"
    if score >= 40:
        return "WARN"
    return "RISK"


def _build_finding(patterns: list[dict], summary: str) -> str:
    if not patterns:
        return "Manipülatif tasarım kalıbı tespit edilmedi"
    labels = [
        _PATTERN_LABELS.get(p.get("type", ""), p.get("type", "bilinmeyen"))
        for p in patterns
    ]
    unique_labels = list(dict.fromkeys(labels))  # sıra koruyan unique
    types_str = ", ".join(unique_labels[:3])
    suffix = f" (+{len(unique_labels) - 3} daha)" if len(unique_labels) > 3 else ""
    return f"{len(patterns)} manipülatif kalıp: {types_str}{suffix}"
