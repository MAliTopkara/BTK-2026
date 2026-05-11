"""
SellerAgent testleri — TASK-10
Normal, edge case ve error senaryoları.
"""

from __future__ import annotations

from datetime import datetime, timezone

import pytest

from app.agents.seller_agent import (
    SellerAgent,
    _build_finding,
    _score_seller,
    _score_to_status,
)
from app.models.scan import ProductData, SellerData


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

def _make_product(seller: SellerData) -> ProductData:
    return ProductData(
        url="https://www.trendyol.com/test",
        platform="trendyol",
        title="Test",
        price_current=100.0,
        seller=seller,
        scraped_at=datetime.now(timezone.utc),
    )


def _trusted_seller() -> SellerData:
    return SellerData(
        name="Güvenilir Mağaza",
        age_days=730,
        total_products=150,
        rating=4.8,
        rating_count=200,
        is_verified=True,
    )


def _risky_seller() -> SellerData:
    return SellerData(
        name="Yeni Satıcı",
        age_days=10,
        total_products=2,
        rating=3.0,
        rating_count=3,
        is_verified=False,
    )


# ---------------------------------------------------------------------------
# Test 1 — Normal: güvenilir satıcı OK döndürür
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_analyze_trusted_seller_ok() -> None:
    product = _make_product(_trusted_seller())
    result = await SellerAgent().analyze(product)

    assert result.layer_id == "seller"
    assert result.status == "OK"
    assert result.score is not None and result.score >= 70


# ---------------------------------------------------------------------------
# Test 2 — Normal: riskli satıcı RISK döndürür
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_analyze_risky_seller_risk() -> None:
    product = _make_product(_risky_seller())
    result = await SellerAgent().analyze(product)

    assert result.status == "RISK"
    assert result.score is not None and result.score < 40
    assert len(result.details["flags"]) > 0


# ---------------------------------------------------------------------------
# Test 3 — Edge: tüm alanlar None olan satıcı
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_analyze_unknown_seller_warn_or_risk() -> None:
    seller = SellerData(name="Bilinmeyen")
    product = _make_product(seller)
    result = await SellerAgent().analyze(product)

    assert result.status in ("WARN", "RISK")
    assert result.score is not None


# ---------------------------------------------------------------------------
# Unit testler — _score_seller
# ---------------------------------------------------------------------------

def test_score_seller_trusted_high() -> None:
    score, flags = _score_seller(_trusted_seller())
    assert score >= 70
    assert len(flags) == 0


def test_score_seller_risky_low() -> None:
    score, flags = _score_seller(_risky_seller())
    assert score < 40
    assert len(flags) >= 3


def test_score_seller_very_new_heavily_penalized() -> None:
    seller = SellerData(name="X", age_days=5, is_verified=False)
    score, flags = _score_seller(seller)
    assert any("çok yeni" in f for f in flags)


def test_score_seller_low_rating_penalized() -> None:
    seller = SellerData(name="X", age_days=500, total_products=100, rating=2.9, rating_count=100, is_verified=True)
    score, flags = _score_seller(seller)
    assert any("düşük" in f for f in flags)


def test_score_never_below_zero() -> None:
    seller = SellerData(name="X", age_days=1, total_products=1, rating=1.0, rating_count=1, is_verified=False)
    score, _ = _score_seller(seller)
    assert score >= 0


def test_score_to_status() -> None:
    assert _score_to_status(80) == "OK"
    assert _score_to_status(55) == "WARN"
    assert _score_to_status(20) == "RISK"


def test_build_finding_no_flags() -> None:
    seller = _trusted_seller()
    finding = _build_finding(seller, 90, [])
    assert "güvenilir" in finding.lower()


def test_build_finding_with_flags() -> None:
    seller = _risky_seller()
    finding = _build_finding(seller, 20, ["çok yeni satıcı (10 gün)"])
    assert "sorun" in finding
