"""
Visual Agent testleri — TrustLens AI
TASK-21: Normal, edge case ve error senaryoları.
"""

from __future__ import annotations

from datetime import datetime
from unittest.mock import AsyncMock, patch

import pytest

from app.agents.visual_agent import (
    VisualAgent,
    _aggregate_results,
    _build_finding,
    _score_to_status,
)
from app.models.scan import ProductData, SellerData

# ---------------------------------------------------------------------------
# Fixture: minimal ProductData
# ---------------------------------------------------------------------------

def _make_product(images: list[str]) -> ProductData:
    return ProductData(
        url="https://www.trendyol.com/test/p-1",
        platform="trendyol",
        title="Test Ürün",
        price_current=100.0,
        seller=SellerData(name="TestSatici", age_days=365, is_verified=True),
        images=images,
        scraped_at=datetime.now(),
    )


# ---------------------------------------------------------------------------
# Test 1 — Normal: temiz görseller yüksek skor döndürmeli
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_analyze_clean_images() -> None:
    clean_result = {
        "authenticity_score": 88,
        "is_stock_photo": False,
        "logo_consistency": "good",
        "ai_generated_likelihood": 0.05,
        "replica_risk": "low",
        "flags": [],
        "reasoning": "Özgün ürün fotoğrafı",
    }

    with patch("app.agents.visual_agent.analyze_image", new_callable=AsyncMock) as mock_ai:
        mock_ai.return_value = clean_result
        agent = VisualAgent()
        product = _make_product(["https://cdn.example.com/img1.jpg"])
        result = await agent.analyze(product)

    assert result.status == "OK"
    assert result.score is not None
    assert result.score >= 70
    assert result.layer_id == "visual"


# ---------------------------------------------------------------------------
# Test 2 — Edge case: görsel yok → INFO döner
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_analyze_no_images() -> None:
    agent = VisualAgent()
    product = _make_product([])
    result = await agent.analyze(product)

    assert result.status == "INFO"
    assert result.score is None
    assert "bulunamadı" in result.finding


# ---------------------------------------------------------------------------
# Test 3 — Error: tüm görsel çağrıları başarısız → INFO döner
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_analyze_all_images_fail() -> None:
    with patch("app.agents.visual_agent.analyze_image", new_callable=AsyncMock) as mock_ai:
        mock_ai.side_effect = Exception("Vision API hatası")
        agent = VisualAgent()
        product = _make_product(["https://cdn.example.com/img1.jpg"])
        result = await agent.analyze(product)

    assert result.status == "INFO"
    assert result.score is None


# ---------------------------------------------------------------------------
# Test 4 — Risk: replica ve AI üretimi yüksek → RISK döner
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_analyze_replica_risk() -> None:
    risky_result = {
        "authenticity_score": 25,
        "is_stock_photo": True,
        "logo_consistency": "inconsistent",
        "ai_generated_likelihood": 0.85,
        "replica_risk": "high",
        "flags": ["logo tutarsızlığı", "AI üretimi şüphesi", "stok fotoğraf"],
        "reasoning": "Sahte ürün izlenimi",
    }

    with patch("app.agents.visual_agent.analyze_image", new_callable=AsyncMock) as mock_ai:
        mock_ai.return_value = risky_result
        agent = VisualAgent()
        product = _make_product(["https://cdn.example.com/img1.jpg"])
        result = await agent.analyze(product)

    assert result.status == "RISK"
    assert result.score is not None
    assert result.score < 40


# ---------------------------------------------------------------------------
# Test 5 — _aggregate_results: AI likelihood yüksekse skoru düşürür
# ---------------------------------------------------------------------------

def test_aggregate_high_ai_likelihood() -> None:
    results = [
        {"authenticity_score": 80, "ai_generated_likelihood": 0.9, "replica_risk": "low",
         "is_stock_photo": False, "flags": ["AI üretimi"]},
    ]
    score, flags, details = _aggregate_results(results, 1)
    assert score <= 30


# ---------------------------------------------------------------------------
# Test 6 — _aggregate_results: birden fazla görsel, ortalama hesabı
# ---------------------------------------------------------------------------

def test_aggregate_multiple_images() -> None:
    results = [
        {"authenticity_score": 90, "ai_generated_likelihood": 0.1, "replica_risk": "low",
         "is_stock_photo": False, "flags": []},
        {"authenticity_score": 85, "ai_generated_likelihood": 0.05, "replica_risk": "low",
         "is_stock_photo": False, "flags": []},
    ]
    score, flags, details = _aggregate_results(results, 2)
    assert score >= 70
    assert details["analyzed_count"] == 2


# ---------------------------------------------------------------------------
# Test 7 — _score_to_status
# ---------------------------------------------------------------------------

def test_score_to_status() -> None:
    assert _score_to_status(90) == "OK"
    assert _score_to_status(55) == "WARN"
    assert _score_to_status(30) == "RISK"


# ---------------------------------------------------------------------------
# Test 8 — _build_finding: flag'ler dahil edilmeli
# ---------------------------------------------------------------------------

def test_build_finding_with_flags() -> None:
    finding = _build_finding(25, ["logo tutarsızlığı", "AI üretimi"], 2)
    assert "logo tutarsızlığı" in finding
    assert "2" in finding


def test_build_finding_clean() -> None:
    finding = _build_finding(85, [], 3)
    assert "yüksek" in finding
    assert "3" in finding


# ---------------------------------------------------------------------------
# Test 9 — safe_analyze: beklenmedik hata → INFO döner (BaseAgent davranışı)
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_safe_analyze_on_exception() -> None:
    with patch("app.agents.visual_agent.analyze_image", new_callable=AsyncMock) as mock_ai:
        mock_ai.side_effect = RuntimeError("Beklenmedik hata")
        agent = VisualAgent()
        product = _make_product(["https://cdn.example.com/img1.jpg"])
        result = await agent.safe_analyze(product)

    assert result.status == "INFO"
    assert result.confidence == 0.0
