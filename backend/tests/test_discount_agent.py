"""
DiscountAgent + price_history servisi testleri — TASK-11
Normal, edge case ve error senaryoları.
"""

from __future__ import annotations

from datetime import UTC, date, datetime
from unittest.mock import patch

import pytest

from app.agents.discount_agent import (
    DiscountAgent,
    _analyze_history,
    _build_finding,
    _score_to_status,
)
from app.models.scan import ProductData, SellerData
from app.services.price_history import PricePoint, get_price_history
from mock_data.loader import match_url_to_mock

# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

def _make_product(price_current: float, price_original: float | None = None) -> ProductData:
    discount = None
    if price_original:
        discount = round((1 - price_current / price_original) * 100, 1)
    return ProductData(
        url="https://www.trendyol.com/apple-airpods-pro",
        platform="trendyol",
        title="AirPods Pro",
        price_current=price_current,
        price_original=price_original,
        discount_pct=discount,
        seller=SellerData(name="Satıcı"),
        scraped_at=datetime.now(UTC),
    )


def _history(prices: list[float]) -> list[PricePoint]:
    base = date(2026, 2, 10)
    from datetime import timedelta
    return [PricePoint(date=base + timedelta(weeks=i), price=p) for i, p in enumerate(prices)]


# ---------------------------------------------------------------------------
# Test 1 — Normal: sahte indirim RISK döndürür (airpods senaryosu)
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_fake_discount_returns_risk() -> None:
    product = _make_product(price_current=1899, price_original=4999)
    # Fiyat 3299'dan 4999'a pompalandı sonra 1899'a düştü
    fake_history = _history([3299, 3599, 3899, 4199, 4499, 4799, 4999, 4999, 1899])

    with patch("app.agents.discount_agent.get_price_history", return_value=fake_history):
        result = await DiscountAgent().analyze(product)

    assert result.status == "RISK"
    assert result.score is not None and result.score < 40
    assert len(result.details["flags"]) > 0


# ---------------------------------------------------------------------------
# Test 2 — Normal: gerçek indirim OK döndürür (watch senaryosu)
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_genuine_discount_returns_ok() -> None:
    product = _make_product(price_current=3250, price_original=3650)
    genuine_history = _history([3650, 3650, 3650, 3500, 3400, 3300, 3250])

    with patch("app.agents.discount_agent.get_price_history", return_value=genuine_history):
        result = await DiscountAgent().analyze(product)

    assert result.status == "OK"
    assert result.score is not None and result.score >= 70


# ---------------------------------------------------------------------------
# Test 3 — Edge: indirim iddiası yok → INFO
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_no_discount_claimed_returns_info() -> None:
    product = _make_product(price_current=500)
    result = await DiscountAgent().analyze(product)

    assert result.status == "INFO"
    assert result.score is None


# ---------------------------------------------------------------------------
# Test 4 — Edge: fiyat geçmişi yok → WARN
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_no_history_returns_warn() -> None:
    product = _make_product(price_current=200, price_original=400)

    with patch("app.agents.discount_agent.get_price_history", return_value=None):
        result = await DiscountAgent().analyze(product)

    assert result.status == "WARN"
    assert result.score == 50


# ---------------------------------------------------------------------------
# Unit — _analyze_history
# ---------------------------------------------------------------------------

def test_analyze_history_pumped_price_penalized() -> None:
    # Baz 3299, sonra 4999'a pompalandı
    history = _history([3299, 3599, 3899, 4199, 4499, 4799, 4999, 4999])
    score, flags, _ = _analyze_history(4999, 1899, history)
    assert score < 40
    assert len(flags) >= 1


def test_analyze_history_genuine_no_flags() -> None:
    history = _history([3650, 3650, 3600, 3500, 3400, 3300, 3250])
    score, flags, _ = _analyze_history(3650, 3250, history)
    assert score >= 70
    assert len(flags) == 0


def test_analyze_history_score_clamped() -> None:
    history = _history([100, 500, 500, 500, 500])
    score, _, _ = _analyze_history(500, 50, history)
    assert 0 <= score <= 100


# ---------------------------------------------------------------------------
# Unit — price_history servisi
# ---------------------------------------------------------------------------

def test_match_mock_airpods() -> None:
    assert match_url_to_mock("trendyol.com/apple-airpods-pro") == "airpods_fake"


def test_match_mock_watch() -> None:
    assert match_url_to_mock("trendyol.com/casio-g-shock") == "watch_genuine"


def test_match_mock_unknown_returns_none() -> None:
    assert match_url_to_mock("trendyol.com/bilinmeyen-urun") is None


async def test_get_price_history_returns_sorted() -> None:
    # TASK-29: artık async + cache/Akakçe/mock zinciri.
    # Demo URL → mock fallback'a düşer (Akakçe arama Chromium gerektirir).
    history = await get_price_history("trendyol.com/apple-airpods")
    assert history is not None
    assert len(history) > 0
    # Eskiden yeniye sıralı
    dates = [p.date for p in history]
    assert dates == sorted(dates)


def test_score_to_status() -> None:
    assert _score_to_status(80) == "OK"
    assert _score_to_status(55) == "WARN"
    assert _score_to_status(20) == "RISK"


def test_build_finding_fake() -> None:
    finding = _build_finding(4999, 1899, ["pompa tespit edildi"], {"true_discount_pct": -42.4})
    assert "Sahte indirim" in finding


def test_build_finding_genuine() -> None:
    finding = _build_finding(3650, 3250, [], {"true_discount_pct": 11.0})
    assert "gerçek" in finding.lower()
