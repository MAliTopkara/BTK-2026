"""
POST /api/scan endpoint testleri — TASK-13
Mock runner ve FastAPI endpoint integration testleri.
"""

from __future__ import annotations

from datetime import UTC, datetime
from unittest.mock import AsyncMock, patch
from uuid import uuid4

from fastapi.testclient import TestClient

from app.main import app
from app.models.scan import LayerResult, ProductData, ScanResult, SellerData
from app.orchestrator.mock_runner import (
    _build_explanation,
    _compute_overall_score,
    _score_to_verdict,
)
from mock_data.loader import match_url_to_mock

client = TestClient(app)


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

def _dummy_layer(layer_id: str, score: int, status: str = "OK") -> LayerResult:
    return LayerResult(layer_id=layer_id, name=layer_id, status=status, score=score, finding="test")


def _dummy_scan_result() -> ScanResult:
    product = ProductData(
        url="https://www.trendyol.com/test",
        platform="trendyol",
        title="Test",
        price_current=100.0,
        seller=SellerData(name="Satıcı"),
        scraped_at=datetime.now(UTC),
    )
    return ScanResult(
        scan_id=uuid4(),
        url="https://www.trendyol.com/test",
        product=product,
        overall_score=30,
        verdict="AVOID",
        layer_results={"review": _dummy_layer("review", 30, "RISK")},
        final_explanation="Test açıklaması",
        duration_ms=500,
        created_at=datetime.now(UTC),
    )


# ---------------------------------------------------------------------------
# Test 1 — Normal: geçerli airpods URL → 200 + ScanResult
# ---------------------------------------------------------------------------

def test_scan_endpoint_valid_url() -> None:
    mock_result = _dummy_scan_result()
    with patch("app.api.routes.scan.run_mock_scan", new_callable=AsyncMock, return_value=mock_result):
        resp = client.post("/api/scan", json={"url": "https://www.trendyol.com/apple-airpods"})

    assert resp.status_code == 200
    data = resp.json()
    assert data["overall_score"] == 30
    assert data["verdict"] == "AVOID"


# ---------------------------------------------------------------------------
# Test 2 — Error: geçersiz URL → 422
# ---------------------------------------------------------------------------

def test_scan_endpoint_invalid_url() -> None:
    resp = client.post("/api/scan", json={"url": "trendyol.com/urun"})
    assert resp.status_code == 422


# ---------------------------------------------------------------------------
# Test 3 — Error: eşleşmeyen URL → 404
# ---------------------------------------------------------------------------

def test_scan_endpoint_unmatched_url() -> None:
    with patch("app.api.routes.scan.run_mock_scan", side_effect=ValueError("eşleşme yok")):
        resp = client.post("/api/scan", json={"url": "https://www.trendyol.com/bilinmeyen-urun"})
    assert resp.status_code == 404


# ---------------------------------------------------------------------------
# Unit — mock_runner yardımcı fonksiyonlar
# ---------------------------------------------------------------------------

def test_match_mock_airpods() -> None:
    assert match_url_to_mock("trendyol.com/apple-airpods") == "airpods_fake"


def test_match_mock_watch() -> None:
    assert match_url_to_mock("trendyol.com/casio-saat") == "watch_genuine"


def test_match_mock_no_match() -> None:
    assert match_url_to_mock("trendyol.com/random-urun") is None


def test_compute_overall_score_weighted() -> None:
    layers = {
        "review": _dummy_layer("review", 40),
        "discount": _dummy_layer("discount", 80),
        "seller": _dummy_layer("seller", 60),
    }
    score = _compute_overall_score(layers)
    assert 0 <= score <= 100


def test_compute_overall_score_all_none() -> None:
    layers = {
        "review": LayerResult(layer_id="review", name="r", status="INFO", score=None, finding=""),
    }
    assert _compute_overall_score(layers) == 50


def test_score_to_verdict() -> None:
    assert _score_to_verdict(75) == "BUY"
    assert _score_to_verdict(55) == "CAUTION"
    assert _score_to_verdict(30) == "AVOID"


def test_build_explanation_with_risks() -> None:
    layers = {
        "review": _dummy_layer("review", 20, "RISK"),
        "seller": _dummy_layer("seller", 55, "WARN"),
    }
    explanation = _build_explanation(30, "AVOID", layers)
    assert "ALMA" in explanation
    assert "review" in explanation.lower() or "Yüksek risk" in explanation
