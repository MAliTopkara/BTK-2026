"""
Edge Case + Hata Mesajları Testleri — TASK-33
POST /api/scan endpoint için 5 edge case.
"""

from __future__ import annotations

from unittest.mock import AsyncMock, patch

import pytest
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


# ---------------------------------------------------------------------------
# Case 1: URL geçersiz (http/https yok)
# ---------------------------------------------------------------------------

def test_scan_invalid_url_no_protocol():
    """http:// veya https:// olmayan URL → 422 + açıklayıcı mesaj."""
    response = client.post("/api/scan", json={"url": "www.trendyol.com/urun-p-123"})
    assert response.status_code == 422
    detail = response.json()["detail"]
    assert isinstance(detail, str)
    # Mesaj kullanıcıya http/https protokol gerekli olduğunu söylemeli
    assert "http" in detail.lower() and ("geçersiz" in detail.lower() or "başla" in detail.lower())


def test_scan_invalid_url_empty():
    """Boş string URL → 422 + protokol mesajı."""
    response = client.post("/api/scan", json={"url": ""})
    assert response.status_code == 422
    detail = response.json()["detail"]
    assert isinstance(detail, str) and "http" in detail.lower()


# ---------------------------------------------------------------------------
# Case 2: Desteklenmeyen platform
# ---------------------------------------------------------------------------

def test_scan_unsupported_platform_amazon():
    """Amazon gibi desteklenmeyen site → 422 + 'desteklenmiyor' mesajı."""
    response = client.post(
        "/api/scan",
        json={"url": "https://www.amazon.com/dp/B09XS7JWHH"},
    )
    assert response.status_code == 422
    detail = response.json()["detail"].lower()
    assert "desteklenmiyor" in detail


def test_scan_unsupported_platform_generic():
    """Bilinmeyen site → 422."""
    response = client.post(
        "/api/scan",
        json={"url": "https://www.random-shop.com/product/123"},
    )
    assert response.status_code == 422


# ---------------------------------------------------------------------------
# Case 3: Scraping başarısız (mock_runner ValueError fırlatır)
# ---------------------------------------------------------------------------

def test_scan_scraping_failed_returns_404():
    """Scraping başarısız → 404 + kullanıcı dostu mesaj."""
    with patch(
        "app.api.routes.scan.run_mock_scan",
        new_callable=AsyncMock,
        side_effect=ValueError("Bu ürün şu an analiz edilemiyor: https://www.trendyol.com/x"),
    ):
        response = client.post(
            "/api/scan",
            json={"url": "https://www.trendyol.com/bilinmeyen-urun-p-999"},
        )

    assert response.status_code == 404
    detail = response.json()["detail"].lower()
    assert "analiz edilemiyor" in detail or "eşleşmiyor" in detail or "desteklenmiyor" in detail


# ---------------------------------------------------------------------------
# Case 4: Gemini timeout → 503
# ---------------------------------------------------------------------------

def test_scan_gemini_timeout_returns_503():
    """Gemini API timeout → 503 + retry önerir."""
    with patch(
        "app.api.routes.scan.run_mock_scan",
        new_callable=AsyncMock,
        side_effect=RuntimeError("Gemini API 3 denemede başarısız: TimeoutError()"),
    ):
        response = client.post(
            "/api/scan",
            json={"url": "https://www.trendyol.com/apple-airpods-pro-p-123"},
        )

    assert response.status_code == 503
    detail = response.json()["detail"].lower()
    assert "yavaş" in detail or "tekrar" in detail


# ---------------------------------------------------------------------------
# Case 5: Uygulama crash etmez, her case JSON döner
# ---------------------------------------------------------------------------

@pytest.mark.parametrize("url,expected_status", [
    ("not-a-url-at-all", 422),
    ("ftp://invalid-protocol.com/product", 422),
    ("https://www.n11.com/urun/123", 422),
])
def test_scan_always_returns_json_not_crash(url: str, expected_status: int):
    """Her hatalı input JSON hata döndürür, uygulama crash etmez."""
    response = client.post("/api/scan", json={"url": url})
    # 4xx veya 5xx, ama mutlaka JSON
    assert response.status_code in (expected_status, 422, 404, 503, 500)
    assert response.headers["content-type"].startswith("application/json")
    body = response.json()
    assert "detail" in body
