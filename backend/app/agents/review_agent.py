"""
Katman 1 — Sahte Yorum Tespiti
TASK-09: TF-IDF benzerlik + burst pattern + Gemini sınıflandırma.
"""

from __future__ import annotations

import logging
from datetime import timedelta

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

from app.agents.base import BaseAgent
from app.models.scan import LayerResult, ProductData, ReviewData
from app.services.gemini import generate_json
from app.utils.prompts import review_analysis_prompt

logger = logging.getLogger(__name__)

_SIMILARITY_THRESHOLD = 0.75   # bu üzeri benzerlik → şüpheli
_BURST_WINDOW_HOURS = 24        # saat penceresi
_BURST_MIN_COUNT = 5            # pencerede min yorum sayısı
_MAX_REVIEWS_FOR_GEMINI = 50    # token tasarrufu


class ReviewAgent(BaseAgent):
    layer_id = "review"
    name = "Sahte Yorum Tespiti"

    async def analyze(self, product: ProductData) -> LayerResult:
        reviews = product.reviews
        if not reviews:
            return LayerResult(
                layer_id=self.layer_id,
                name=self.name,
                status="INFO",
                score=None,
                finding="Analiz edilecek yorum bulunamadı",
            )

        tfidf_suspicious = _tfidf_suspicious_indices(reviews)
        burst_detected = _detect_burst(reviews)
        gemini_result = await _gemini_classify(reviews)

        gemini_suspicious = set(gemini_result.get("suspicious_indices", []))
        all_suspicious = tfidf_suspicious | gemini_suspicious
        total = len(reviews)

        score = _calculate_score(len(all_suspicious), total, burst_detected)
        status = _score_to_status(score)
        finding = _build_finding(len(all_suspicious), total, burst_detected)

        return LayerResult(
            layer_id=self.layer_id,
            name=self.name,
            status=status,
            score=score,
            finding=finding,
            details={
                "total_reviews": total,
                "suspicious_count": len(all_suspicious),
                "suspicious_pct": round(len(all_suspicious) / total * 100, 1),
                "burst_detected": burst_detected,
                "tfidf_suspicious_indices": sorted(tfidf_suspicious),
                "gemini_suspicious_indices": sorted(gemini_suspicious),
                "gemini_reasoning": gemini_result.get("reasoning", ""),
            },
            confidence=0.85,
        )


# ---------------------------------------------------------------------------
# Yardımcı fonksiyonlar
# ---------------------------------------------------------------------------

def _tfidf_suspicious_indices(reviews: list[ReviewData]) -> set[int]:
    """Cosine similarity ile birbirine çok benzeyen yorumları işaretle."""
    texts = [r.text for r in reviews]
    if len(texts) < 2:
        return set()
    try:
        matrix = TfidfVectorizer(min_df=1).fit_transform(texts)
        sim = cosine_similarity(matrix)
        suspicious: set[int] = set()
        for i in range(len(texts)):
            for j in range(i + 1, len(texts)):
                if sim[i, j] > _SIMILARITY_THRESHOLD:
                    suspicious.add(i)
                    suspicious.add(j)
        return suspicious
    except Exception as exc:
        logger.warning("TF-IDF analizi başarısız: %s", exc)
        return set()


def _detect_burst(reviews: list[ReviewData]) -> bool:
    """Kısa sürede yığılan yorum patlamasını tespit et."""
    dated = sorted(
        [r for r in reviews if r.date is not None],
        key=lambda r: r.date,  # type: ignore[arg-type]
    )
    if len(dated) < _BURST_MIN_COUNT:
        return False
    window = timedelta(hours=_BURST_WINDOW_HOURS)
    for i in range(len(dated) - _BURST_MIN_COUNT + 1):
        if dated[i + _BURST_MIN_COUNT - 1].date - dated[i].date <= window:  # type: ignore[operator]
            return True
    return False


async def _gemini_classify(reviews: list[ReviewData]) -> dict:
    """Gemini Flash ile her yorumu 0/1 (özgün/şüpheli) olarak sınıflandır."""
    review_dicts = [
        {"text": r.text, "rating": r.rating}
        for r in reviews[:_MAX_REVIEWS_FOR_GEMINI]
    ]
    try:
        return await generate_json(review_analysis_prompt(review_dicts))
    except Exception as exc:
        logger.warning("Gemini yorum sınıflandırması başarısız: %s", exc)
        return {"results": [], "suspicious_indices": [], "reasoning": ""}


def _calculate_score(suspicious_count: int, total: int, burst: bool) -> int:
    """Şüpheli yorum oranı + burst → 0-100 skor (100 = tamamen temiz)."""
    pct = suspicious_count / total if total > 0 else 0
    score = 100 - int(pct * 70)   # max 70 puan düşer
    if burst:
        score -= 15
    return max(0, min(100, score))


def _score_to_status(score: int) -> str:
    if score >= 70:
        return "OK"
    if score >= 40:
        return "WARN"
    return "RISK"


def _build_finding(suspicious: int, total: int, burst: bool) -> str:
    parts: list[str] = []
    if total > 0 and suspicious > 0:
        pct = int(suspicious / total * 100)
        parts.append(f"{total} yorumun %{pct}'i şüpheli görünüyor")
    if burst:
        parts.append("kısa sürede yorum patlaması tespit edildi")
    return "; ".join(parts) if parts else "Yorumlar normal görünüyor"
