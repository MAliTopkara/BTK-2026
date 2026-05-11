"""
ReviewAgent testleri — TASK-09
Normal, edge case ve error senaryoları. Gemini mock'lu çalışır.
"""

from __future__ import annotations

from datetime import UTC, datetime
from unittest.mock import AsyncMock, patch

import pytest

from app.agents.review_agent import (
    ReviewAgent,
    _build_finding,
    _calculate_score,
    _detect_burst,
    _score_to_status,
    _tfidf_suspicious_indices,
)
from app.models.scan import ProductData, ReviewData, SellerData

# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

def _make_product(reviews: list[ReviewData]) -> ProductData:
    return ProductData(
        url="https://www.trendyol.com/test",
        platform="trendyol",
        title="Test",
        price_current=100.0,
        seller=SellerData(name="Satıcı"),
        reviews=reviews,
        scraped_at=datetime.now(UTC),
    )


def _review(text: str, rating: int = 5, dt: datetime | None = None) -> ReviewData:
    return ReviewData(text=text, rating=rating, date=dt)


# ---------------------------------------------------------------------------
# Test 1 — Normal: yüksek benzerlikli yorumlar RISK döndürür
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_analyze_fake_reviews_returns_risk() -> None:
    clone_text = "çok güzel ürün kesinlikle tavsiye ederim harika"
    reviews = [_review(clone_text) for _ in range(10)]
    product = _make_product(reviews)

    gemini_mock = {"results": [1] * 10, "suspicious_indices": list(range(10)), "reasoning": "hepsi aynı"}

    with patch("app.agents.review_agent._gemini_classify", new_callable=AsyncMock, return_value=gemini_mock):
        result = await ReviewAgent().analyze(product)

    assert result.layer_id == "review"
    assert result.status in ("RISK", "WARN")
    assert result.score is not None and result.score < 70


# ---------------------------------------------------------------------------
# Test 2 — Edge: yorum yoksa INFO döner
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_analyze_no_reviews_returns_info() -> None:
    product = _make_product([])
    result = await ReviewAgent().analyze(product)

    assert result.status == "INFO"
    assert result.score is None


# ---------------------------------------------------------------------------
# Test 3 — Error: Gemini başarısız olsa da TF-IDF sonucu gelir
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_analyze_gemini_failure_fallback() -> None:
    reviews = [
        _review("bu ürün gerçekten çok işe yaradı, pili uzun sürüyor"),
        _review("çok güzel tavsiye ederim"),
        _review("kaliteli ürün aldım memnunum"),
    ]
    product = _make_product(reviews)

    with patch("app.agents.review_agent._gemini_classify", new_callable=AsyncMock, return_value={"suspicious_indices": [], "reasoning": ""}):
        result = await ReviewAgent().analyze(product)

    assert result.status in ("OK", "WARN", "RISK")
    assert result.score is not None


# ---------------------------------------------------------------------------
# Unit testler — yardımcı fonksiyonlar
# ---------------------------------------------------------------------------

def test_tfidf_identical_texts_flagged() -> None:
    reviews = [_review("çok güzel ürün tavsiye ederim") for _ in range(5)]
    suspicious = _tfidf_suspicious_indices(reviews)
    assert len(suspicious) > 0


def test_tfidf_single_review_empty() -> None:
    assert _tfidf_suspicious_indices([_review("tek yorum")]) == set()


def test_detect_burst_true() -> None:
    base = datetime(2026, 5, 10, 10, 0, tzinfo=UTC)
    from datetime import timedelta
    reviews = [
        _review("yorum", dt=base + timedelta(hours=i))
        for i in range(5)
    ]
    assert _detect_burst(reviews) is True


def test_detect_burst_false_spread() -> None:
    base = datetime(2026, 5, 1, 10, 0, tzinfo=UTC)
    from datetime import timedelta
    reviews = [
        _review("yorum", dt=base + timedelta(days=i * 7))
        for i in range(5)
    ]
    assert _detect_burst(reviews) is False


def test_calculate_score_clean() -> None:
    assert _calculate_score(0, 20, False) == 100


def test_calculate_score_all_suspicious_with_burst() -> None:
    score = _calculate_score(20, 20, True)
    assert score <= 15  # 100 - 70 - 15


def test_score_to_status() -> None:
    assert _score_to_status(80) == "OK"
    assert _score_to_status(55) == "WARN"
    assert _score_to_status(30) == "RISK"


def test_build_finding_burst_mentioned() -> None:
    finding = _build_finding(5, 10, True)
    assert "patlama" in finding


def test_build_finding_no_suspicious() -> None:
    finding = _build_finding(0, 10, False)
    assert "normal" in finding
