"""
CrossPlatform Agent testleri — TrustLens AI
Akakçe gerçek karşılaştırma kaynağına refactor sonrası.
"""

from __future__ import annotations

from datetime import datetime
from unittest.mock import AsyncMock, patch

import pytest

from app.agents.crossplatform_agent import CrossPlatformAgent, _extract_search_query
from app.models.scan import ProductData, SellerData
from app.services.akakce import AkakceResult

# ---------------------------------------------------------------------------
# Fixture
# ---------------------------------------------------------------------------

def _make_product(platform: str = "trendyol", price: float = 1000.0) -> ProductData:
    return ProductData(
        url=f"https://www.{platform}.com/test/p-1",
        platform=platform,
        title="Apple AirPods Pro 2. Nesil USB-C Tip-C Şarj Kutulu Orijinal",
        price_current=price,
        seller=SellerData(name="AppleTR", age_days=500, is_verified=True),
        scraped_at=datetime.now(),
    )


def _akakce(min_price: float, max_price: float | None = None) -> AkakceResult:
    mx = max_price if max_price is not None else min_price * 1.2
    return AkakceResult(
        product_url="https://www.akakce.com/kulaklik/en-ucuz-airpods-pro-2-fiyati,123.html",
        seller_count=12,
        min_price=min_price,
        max_price=mx,
        avg_price=(min_price + mx) / 2,
    )


# ---------------------------------------------------------------------------
# Test 1 — Anlamlı tasarruf: Alternative üretilir, INFO
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_analyze_finds_cheaper_on_akakce() -> None:
    with patch("app.agents.crossplatform_agent.generate_json", new_callable=AsyncMock) as mock_gen, \
         patch("app.agents.crossplatform_agent.fetch_akakce_summary", new_callable=AsyncMock) as mock_ak:
        mock_gen.return_value = {"search_query": "Apple AirPods Pro 2"}
        mock_ak.return_value = _akakce(min_price=850.0)  # %15 daha ucuz
        product = _make_product("trendyol", 1000.0)
        result = await CrossPlatformAgent().analyze(product)

    assert result.status == "INFO"
    assert result.score == 100
    assert "daha ucuz" in result.finding
    assert "alternative" in result.details
    alt = result.details["alternative"]
    assert alt["platform"] == "Akakçe"
    assert alt["price"] == 850.0
    assert alt["savings"] == 150.0
    assert alt["url"].startswith("https://www.akakce.com/")


# ---------------------------------------------------------------------------
# Test 2 — Anlamsız fark (%5 altı): OK, alternative yok
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_analyze_no_significant_diff() -> None:
    with patch("app.agents.crossplatform_agent.generate_json", new_callable=AsyncMock) as mock_gen, \
         patch("app.agents.crossplatform_agent.fetch_akakce_summary", new_callable=AsyncMock) as mock_ak:
        mock_gen.return_value = {"search_query": "Apple AirPods Pro 2"}
        mock_ak.return_value = _akakce(min_price=970.0)  # %3 daha ucuz → eşik altı
        product = _make_product("trendyol", 1000.0)
        result = await CrossPlatformAgent().analyze(product)

    assert result.status == "OK"
    assert "alternative" not in result.details


# ---------------------------------------------------------------------------
# Test 3 — Akakçe sonuç yok: OK, akakce_available=False
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_analyze_akakce_no_match() -> None:
    with patch("app.agents.crossplatform_agent.generate_json", new_callable=AsyncMock) as mock_gen, \
         patch("app.agents.crossplatform_agent.fetch_akakce_summary", new_callable=AsyncMock) as mock_ak:
        mock_gen.return_value = {"search_query": "ürün"}
        mock_ak.return_value = None
        result = await CrossPlatformAgent().analyze(_make_product("trendyol", 1000.0))

    assert result.status == "OK"
    assert result.details["akakce_available"] is False


# ---------------------------------------------------------------------------
# Test 4 — Trust floor: çok düşük min fiyat (yanlış varyant şüphesi) → OK
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_analyze_trust_floor_blocks_alternative() -> None:
    with patch("app.agents.crossplatform_agent.generate_json", new_callable=AsyncMock) as mock_gen, \
         patch("app.agents.crossplatform_agent.fetch_akakce_summary", new_callable=AsyncMock) as mock_ak:
        mock_gen.return_value = {"search_query": "ürün"}
        # current'ın %30'u — büyük olasılıkla farklı ürün
        mock_ak.return_value = _akakce(min_price=300.0)
        result = await CrossPlatformAgent().analyze(_make_product("trendyol", 1000.0))

    assert result.status == "OK"
    assert result.details.get("trust_floor_triggered") is True
    assert "alternative" not in result.details


# ---------------------------------------------------------------------------
# Test 5 — Akakçe çağrısı exception fırlatırsa graceful
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_analyze_akakce_exception_graceful() -> None:
    with patch("app.agents.crossplatform_agent.generate_json", new_callable=AsyncMock) as mock_gen, \
         patch("app.agents.crossplatform_agent.fetch_akakce_summary", new_callable=AsyncMock) as mock_ak:
        mock_gen.return_value = {"search_query": "ürün"}
        mock_ak.side_effect = RuntimeError("Playwright timeout")
        result = await CrossPlatformAgent().analyze(_make_product("trendyol", 1000.0))

    assert result.layer_id == "crossplatform"
    assert result.status == "OK"
    assert result.details["akakce_available"] is False


# ---------------------------------------------------------------------------
# Test 6 — Gemini başarısız → title'dan fallback sorgu
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_extract_search_query_fallback() -> None:
    with patch("app.agents.crossplatform_agent.generate_json", new_callable=AsyncMock) as mock_gen:
        mock_gen.side_effect = Exception("API hatası")
        query = await _extract_search_query("Apple AirPods Pro 2 Nesil USB-C Orijinal Kulaklık")

    assert "Apple" in query
    assert len(query.split()) <= 5


@pytest.mark.asyncio
async def test_extract_search_query_success() -> None:
    with patch("app.agents.crossplatform_agent.generate_json", new_callable=AsyncMock) as mock_gen:
        mock_gen.return_value = {"search_query": "Apple AirPods Pro 2"}
        query = await _extract_search_query("Apple AirPods Pro 2 Nesil USB-C Orijinal")

    assert query == "Apple AirPods Pro 2"


# ---------------------------------------------------------------------------
# Test 7 — safe_analyze: agent içinde tutarlı sonuç
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_safe_analyze_normal_flow() -> None:
    with patch("app.agents.crossplatform_agent.generate_json", new_callable=AsyncMock) as mock_gen, \
         patch("app.agents.crossplatform_agent.fetch_akakce_summary", new_callable=AsyncMock) as mock_ak:
        mock_gen.return_value = {"search_query": "ürün"}
        mock_ak.return_value = None
        result = await CrossPlatformAgent().safe_analyze(_make_product("trendyol"))

    assert result.layer_id == "crossplatform"
    assert result.status in ("OK", "INFO")
    assert result.score == 100
