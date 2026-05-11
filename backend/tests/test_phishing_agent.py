"""
Phishing Agent testleri — TrustLens AI
TASK-23: OCR, URL çıkarma, kara liste ve Gemini analiz senaryoları.
"""

from __future__ import annotations

from datetime import datetime
from unittest.mock import AsyncMock, patch

import pytest

from app.agents.phishing_agent import (
    PhishingAgent,
    _build_finding,
    _check_blacklist,
    _extract_domain,
    _extract_urls,
    _score_to_status,
)
from app.models.scan import ProductData, SellerData

# ---------------------------------------------------------------------------
# Fixture
# ---------------------------------------------------------------------------

def _make_product() -> ProductData:
    return ProductData(
        url="https://www.trendyol.com/test/p-1",
        platform="trendyol",
        title="Test Ürün",
        price_current=100.0,
        seller=SellerData(name="TestSatici", age_days=365, is_verified=True),
        scraped_at=datetime.now(),
    )


_FAKE_IMAGE = b"\xff\xd8\xff\xe0" + b"\x00" * 100  # Minimal JPEG header


# ---------------------------------------------------------------------------
# Test 1 — analyze(product) → INFO (standart taramada pasif)
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_analyze_product_returns_info() -> None:
    agent = PhishingAgent()
    result = await agent.analyze(_make_product())
    assert result.status == "INFO"
    assert result.score is None
    assert result.layer_id == "phishing"


# ---------------------------------------------------------------------------
# Test 2 — Normal: temiz SMS → OK
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_analyze_phishing_image_clean() -> None:
    ocr_result = {"extracted_text": "Siparişiniz kargoya verildi. Takip kodu: 12345"}
    gemini_result = {
        "phishing_score": 90,
        "verdict": "CLEAN",
        "flags": [],
        "extracted_urls": [],
        "explanation": "Meşru kargo bildirimi",
    }

    with (
        patch("app.agents.phishing_agent.analyze_image", new_callable=AsyncMock) as mock_ocr,
        patch("app.agents.phishing_agent.generate_json", new_callable=AsyncMock) as mock_gen,
    ):
        mock_ocr.return_value = ocr_result
        mock_gen.return_value = gemini_result

        agent = PhishingAgent()
        result = await agent.analyze_phishing_image(_FAKE_IMAGE, "image/jpeg")

    assert result.status == "OK"
    assert result.score == 90
    assert result.layer_id == "phishing"


# ---------------------------------------------------------------------------
# Test 3 — Risk: kara listede domain var → RISK + PHISHING_CONFIRMED
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_analyze_phishing_blacklisted_domain() -> None:
    ocr_result = {
        "extracted_text": "Kargonuz hazır! Tıklayın: pttkargo-takip-sorgula.com/odeme"
    }
    gemini_result = {
        "phishing_score": 15,
        "verdict": "PHISHING_SUSPECTED",
        "flags": ["sahte kargo bildirimi"],
        "extracted_urls": ["pttkargo-takip-sorgula.com/odeme"],
        "explanation": "Sahte PTT kargo phishing içeriği",
    }

    with (
        patch("app.agents.phishing_agent.analyze_image", new_callable=AsyncMock) as mock_ocr,
        patch("app.agents.phishing_agent.generate_json", new_callable=AsyncMock) as mock_gen,
    ):
        mock_ocr.return_value = ocr_result
        mock_gen.return_value = gemini_result

        agent = PhishingAgent()
        result = await agent.analyze_phishing_image(_FAKE_IMAGE, "image/jpeg")

    assert result.status == "RISK"
    assert result.score is not None
    assert result.score <= 10
    assert "pttkargo-takip-sorgula.com" in result.details.get("blacklisted_domains", [])
    assert result.details["verdict"] == "PHISHING_CONFIRMED"


# ---------------------------------------------------------------------------
# Test 4 — Edge: OCR başarısız → INFO
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_analyze_phishing_ocr_fails() -> None:
    with patch("app.agents.phishing_agent.analyze_image", new_callable=AsyncMock) as mock_ocr:
        mock_ocr.side_effect = Exception("Vision API hatası")
        agent = PhishingAgent()
        result = await agent.analyze_phishing_image(_FAKE_IMAGE, "image/jpeg")

    assert result.status == "INFO"
    assert result.score is None
    assert "çıkarılamadı" in result.finding


# ---------------------------------------------------------------------------
# Test 5 — _extract_urls: HTTP ve domain URL'leri bulunmalı
# ---------------------------------------------------------------------------

def test_extract_urls_http() -> None:
    text = "Hemen tıklayın: https://kargotakip-hr.com/odeme?id=123 teşekkürler"
    urls = _extract_urls(text)
    assert any("kargotakip-hr.com" in u for u in urls)


def test_extract_urls_deduplication() -> None:
    text = "https://ornek.com/a https://ornek.com/a tekrar"
    urls = _extract_urls(text)
    assert len(urls) == 1


# ---------------------------------------------------------------------------
# Test 6 — _extract_domain
# ---------------------------------------------------------------------------

def test_extract_domain_with_scheme() -> None:
    assert _extract_domain("https://www.pttkargo-takip.com/odeme") == "pttkargo-takip.com"


def test_extract_domain_without_scheme() -> None:
    assert _extract_domain("pttkargo-takip.com/odeme") == "pttkargo-takip.com"


# ---------------------------------------------------------------------------
# Test 7 — _check_blacklist: gerçek kara liste domainleri
# ---------------------------------------------------------------------------

def test_check_blacklist_known_phishing() -> None:
    urls = ["https://pttkargo-takip-sorgula.com/link"]
    blacklisted = _check_blacklist(urls)
    assert "pttkargo-takip-sorgula.com" in blacklisted


def test_check_blacklist_clean_domain() -> None:
    urls = ["https://www.ptt.gov.tr/takip"]
    blacklisted = _check_blacklist(urls)
    assert len(blacklisted) == 0


# ---------------------------------------------------------------------------
# Test 8 — _score_to_status
# ---------------------------------------------------------------------------

def test_score_to_status() -> None:
    assert _score_to_status(15) == "RISK"
    assert _score_to_status(55) == "WARN"
    assert _score_to_status(85) == "OK"


# ---------------------------------------------------------------------------
# Test 9 — _build_finding
# ---------------------------------------------------------------------------

def test_build_finding_confirmed() -> None:
    finding = _build_finding("PHISHING_CONFIRMED", 5, {"kötü-domain.com"}, "")
    assert "Phishing" in finding
    assert "kötü-domain.com" in finding


def test_build_finding_clean() -> None:
    finding = _build_finding("CLEAN", 95, set(), "")
    assert "temiz" in finding.lower()
