"""
Dilekçe PDF endpoint testleri — TASK-32
POST /api/petition/{scan_id} integration testleri.
"""

from __future__ import annotations

from datetime import UTC, datetime
from unittest.mock import AsyncMock, patch
from uuid import uuid4

from fastapi.testclient import TestClient

from app.main import app
from app.models.scan import LayerResult, ProductData, ScanResult, SellerData

client = TestClient(app)


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

def _make_scan(verdict: str = "AVOID", score: int = 25) -> ScanResult:
    product = ProductData(
        url="https://www.trendyol.com/test-urun-p-123",
        platform="trendyol",
        title="Test Ürünü",
        price_current=999.0,
        price_original=1999.0,
        discount_pct=50.0,
        seller=SellerData(name="Sahte Satıcı"),
        scraped_at=datetime.now(UTC),
    )
    return ScanResult(
        scan_id=uuid4(),
        url="https://www.trendyol.com/test-urun-p-123",
        product=product,
        overall_score=score,
        verdict=verdict,
        layer_results={
            "discount": LayerResult(
                layer_id="discount",
                name="İndirim Analizi",
                status="RISK",
                score=15,
                finding="Son 90 günde orijinal fiyat hiç görülmemiş",
            ),
        },
        final_explanation="Bu ürün güvenilir değil.",
        duration_ms=1200,
        created_at=datetime.now(UTC),
    )


def _petition_body() -> dict:
    return {
        "url": "https://www.trendyol.com/test-urun-p-123",
        "user_full_name": "Ahmet Yılmaz",
        "tc_no": "12345678901",
        "address": "Atatürk Caddesi No:1 Çankaya Ankara",
        "phone": "05321234567",
    }


# ---------------------------------------------------------------------------
# Test 1: Geçerli scan için PDF bytes döner
# ---------------------------------------------------------------------------

def test_petition_returns_pdf_bytes():
    """Geçerli scan ve kullanıcı bilgisiyle PDF bytes (application/pdf) döner."""
    scan = _make_scan()

    with (
        patch("app.api.routes.petition.get_scan", new_callable=AsyncMock, return_value=scan),
        patch(
            "app.services.pdf_generator.generate_json",
            new_callable=AsyncMock,
            return_value={
                "petition_title": "T.C. ANKARA TÜKETİCİ HAKEM HEYETİ BAŞKANLIĞINA",
                "complainant_block": "Ahmet Yılmaz",
                "defendant_block": "Sahte Satıcı / Trendyol",
                "subject": "Yanıltıcı indirim uygulaması",
                "incident_paragraphs": ["Ürün incelendi.", "Bulgular paylaşıldı."],
                "evidence_list": ["Ek-1: TrustLens raporu"],
                "demand": "Bedel iadesi talep edilmektedir.",
                "closing": "Saygılarımla arz ederim.",
                "annexes": ["Ek-1: Ekran görüntüsü"],
            },
        ),
    ):
        response = client.post(
            f"/api/petition/{scan.scan_id}",
            json=_petition_body(),
        )

    assert response.status_code == 200
    assert response.headers["content-type"] == "application/pdf"
    assert len(response.content) > 100  # PDF boş olmamalı
    assert response.content[:4] == b"%PDF"  # PDF magic bytes


# ---------------------------------------------------------------------------
# Test 2: Bilinmeyen scan için 404 döner
# ---------------------------------------------------------------------------

def test_petition_404_for_unknown_scan():
    """Cache'de bulunmayan scan için 404 HTTP hatası döner."""
    with patch("app.api.routes.petition.get_scan", new_callable=AsyncMock, return_value=None):
        response = client.post(
            "/api/petition/unknown-scan-id-99999",
            json=_petition_body(),
        )

    assert response.status_code == 404
    assert "bulunamadı" in response.json()["detail"].lower()


# ---------------------------------------------------------------------------
# Test 3: Geçersiz TC No validation hatası döner
# ---------------------------------------------------------------------------

def test_petition_422_invalid_tc_no():
    """11 haneden kısa TC Kimlik No ile 422 validation hatası döner."""
    body = _petition_body()
    body["tc_no"] = "1234"  # geçersiz — 11 hane değil

    response = client.post(
        "/api/petition/any-scan-id",
        json=body,
    )

    assert response.status_code == 422


# ---------------------------------------------------------------------------
# Test 4: Gemini başarısız olunca fallback ile PDF üretilir
# ---------------------------------------------------------------------------

def test_petition_fallback_on_gemini_failure():
    """Gemini çağrısı başarısız olunca fallback şablon ile PDF üretilir."""
    scan = _make_scan(verdict="CAUTION", score=45)

    with (
        patch("app.api.routes.petition.get_scan", new_callable=AsyncMock, return_value=scan),
        patch(
            "app.services.pdf_generator.generate_json",
            new_callable=AsyncMock,
            side_effect=Exception("Gemini API hatası"),
        ),
    ):
        response = client.post(
            f"/api/petition/{scan.scan_id}",
            json=_petition_body(),
        )

    assert response.status_code == 200
    assert response.headers["content-type"] == "application/pdf"
    assert response.content[:4] == b"%PDF"


# ---------------------------------------------------------------------------
# Test 5: Content-Disposition header doğru scan_id kısaltmasını içeriyor
# ---------------------------------------------------------------------------

def test_petition_content_disposition_filename():
    """Content-Disposition header doğru scan_id kısaltmasını içermelidir."""
    scan = _make_scan()

    with (
        patch("app.api.routes.petition.get_scan", new_callable=AsyncMock, return_value=scan),
        patch(
            "app.services.pdf_generator.generate_json",
            new_callable=AsyncMock,
            side_effect=Exception("force fallback"),
        ),
    ):
        response = client.post(
            f"/api/petition/{scan.scan_id}",
            json=_petition_body(),
        )

    assert response.status_code == 200
    content_disp = response.headers.get("content-disposition", "")
    short_id = str(scan.scan_id)[:8]
    assert short_id in content_disp
    assert "attachment" in content_disp
