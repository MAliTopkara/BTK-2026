"""
CrossPlatform Agent testleri — TrustLens AI
TASK-22: Normal, edge case ve Gemini fallback senaryoları.
"""

from __future__ import annotations

from datetime import datetime
from unittest.mock import AsyncMock, patch

import pytest

from app.agents.crossplatform_agent import (
    CrossPlatformAgent,
    _extract_search_query,
    _find_best_alternative,
    _mock_other_platforms,
    _PlatformResult,
)
from app.models.scan import ProductData, SellerData

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


# ---------------------------------------------------------------------------
# Test 1 — Normal: alternatif bulunuyor → INFO
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_analyze_finds_alternative() -> None:
    with patch("app.agents.crossplatform_agent.generate_json", new_callable=AsyncMock) as mock_gen:
        mock_gen.return_value = {"search_query": "Apple AirPods Pro 2"}
        agent = CrossPlatformAgent()
        # trendyol üründe hepsiburada 0.92x yani %8 daha ucuz → alternatif bulunmalı
        product = _make_product("trendyol", 1000.0)
        result = await agent.analyze(product)

    assert result.status == "INFO"
    assert result.score == 100
    assert result.layer_id == "crossplatform"
    assert "₺" in result.finding or "daha ucuz" in result.finding
    assert "best_alternative" in result.details


# ---------------------------------------------------------------------------
# Test 2 — Edge: tüm platformlar daha pahalı → OK
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_analyze_no_better_alternative() -> None:
    with patch("app.agents.crossplatform_agent.generate_json", new_callable=AsyncMock) as mock_gen:
        mock_gen.return_value = {"search_query": "Apple AirPods Pro 2"}
        agent = CrossPlatformAgent()
        # amazon_tr üründe trendyol 0.97x → %3 ucuz (<5% eşik) → alternatif yok
        # n11'de hepsiburada 0.96x → %4 < 5% eşik
        # Sadece trendyol'da hepsiburada %8 ucuz → burada amazon_tr orijinal
        # amazon_tr faktörleri: trendyol:0.97, hepsiburada:0.90, n11:0.93
        # hepsiburada: %10 daha ucuz → alternatif bulunacak... revize: n11 kullanılacak
        # n11 faktörleri: trendyol:1.04, hepsiburada:0.96, amazon_tr:1.07
        # Hiç <%5 ucuz yok n11 için... 0.96 = %4 < %5 → alternatif bulunmaz
        product = _make_product("n11", 1000.0)
        result = await agent.analyze(product)

    # n11 için hepsiburada %4 ucuz → eşik altı → OK beklenir
    assert result.status == "OK"
    assert result.score == 100


# ---------------------------------------------------------------------------
# Test 3 — Error: Gemini başarısız → title'dan fallback sorgu oluşturulur
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_analyze_gemini_error_fallback() -> None:
    with patch("app.agents.crossplatform_agent.generate_json", new_callable=AsyncMock) as mock_gen:
        mock_gen.side_effect = Exception("API hatası")
        agent = CrossPlatformAgent()
        product = _make_product("trendyol", 1000.0)
        result = await agent.analyze(product)

    # Hata olsa bile agent çalışmaya devam etmeli
    assert result.layer_id == "crossplatform"
    assert result.status in ("OK", "INFO")
    assert "search_query" in result.details


# ---------------------------------------------------------------------------
# Test 4 — safe_analyze: beklenmedik hata → INFO
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_safe_analyze_on_exception() -> None:
    """
    generate_json hatası _extract_search_query içinde yakalanır (fallback'e geçer).
    analyze() exception fırlatmadığı için safe_analyze normal sonuç döner.
    """
    with patch("app.agents.crossplatform_agent.generate_json", new_callable=AsyncMock) as mock_gen:
        mock_gen.side_effect = RuntimeError("Kritik hata")
        agent = CrossPlatformAgent()
        product = _make_product("trendyol")
        result = await agent.safe_analyze(product)

    # Hata içeride yakalandı — agent yine de çalışır
    assert result.layer_id == "crossplatform"
    assert result.status in ("OK", "INFO")
    assert result.score == 100


# ---------------------------------------------------------------------------
# Test 5 — _extract_search_query: Gemini yanıtı doğru parse edilir
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_extract_search_query_success() -> None:
    with patch("app.agents.crossplatform_agent.generate_json", new_callable=AsyncMock) as mock_gen:
        mock_gen.return_value = {"search_query": "Apple AirPods Pro 2"}
        query = await _extract_search_query("Apple AirPods Pro 2. Nesil USB-C Orijinal")

    assert query == "Apple AirPods Pro 2"


@pytest.mark.asyncio
async def test_extract_search_query_fallback() -> None:
    with patch("app.agents.crossplatform_agent.generate_json", new_callable=AsyncMock) as mock_gen:
        mock_gen.side_effect = Exception("API hatası")
        query = await _extract_search_query("Apple AirPods Pro 2. Nesil USB-C Orijinal Kulaklık")

    # Fallback: ilk 5 kelime
    assert "Apple" in query
    assert len(query.split()) <= 5


# ---------------------------------------------------------------------------
# Test 6 — _find_best_alternative: tasarruf hesabı doğru
# ---------------------------------------------------------------------------

def test_find_best_alternative_correct_savings() -> None:
    product = _make_product("trendyol", 1000.0)
    platforms = [
        _PlatformResult("hepsiburada", 900.0, "Mağaza", 4.5, "https://..."),
        _PlatformResult("n11", 960.0, "Mağaza", 4.2, "https://..."),
    ]
    best = _find_best_alternative(product, platforms)
    assert best is not None
    assert best.platform == "hepsiburada"
    assert best.price == 900.0


def test_find_best_alternative_threshold_not_met() -> None:
    product = _make_product("trendyol", 1000.0)
    platforms = [
        _PlatformResult("hepsiburada", 960.0, "Mağaza", 4.5, "https://..."),  # %4 < %5
    ]
    best = _find_best_alternative(product, platforms)
    assert best is None


# ---------------------------------------------------------------------------
# Test 7 — _mock_other_platforms: kendi platformu dahil edilmemeli
# ---------------------------------------------------------------------------

def test_mock_other_platforms_excludes_self() -> None:
    product = _make_product("trendyol", 1000.0)
    results = _mock_other_platforms(product, "Apple AirPods")
    platforms = [r.platform for r in results]
    assert "trendyol" not in platforms
    assert len(platforms) >= 2
