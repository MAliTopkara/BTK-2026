"""
Katman 6 — Çapraz Platform Karşılaştırma
TASK-22: Aynı ürünü diğer platformlarda fiyat/güven açısından kıyaslar.
Gerçek Playwright taraması TASK-28'e bırakıldı; şimdilik mock veri döner.
Bu katman risk değil fırsat üretir — negatif skor yok, sadece INFO/OK.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass

from app.agents.base import BaseAgent
from app.models.scan import Alternative, LayerResult, ProductData
from app.services.gemini import generate_json
from app.utils.prompts import crossplatform_keyword_prompt

logger = logging.getLogger(__name__)

# Fiyat avantajı için minimum eşik
_PRICE_DIFF_THRESHOLD = 0.05   # %5

# Mock veri: diğer platformlardaki temsili fiyat faktörleri
# TASK-28'de Playwright ile gerçek fiyatlarla değiştirilecek
_PLATFORM_MOCK_FACTORS: dict[str, dict] = {
    "trendyol": {
        "hepsiburada": 0.92,    # genellikle %8 daha ucuz
        "n11": 0.96,
        "amazon_tr": 1.03,
    },
    "hepsiburada": {
        "trendyol": 1.08,
        "n11": 1.04,
        "amazon_tr": 1.11,
    },
    "n11": {
        "trendyol": 1.04,
        "hepsiburada": 0.96,
        "amazon_tr": 1.07,
    },
    "amazon_tr": {
        "trendyol": 0.97,
        "hepsiburada": 0.90,
        "n11": 0.93,
    },
    "unknown": {
        "trendyol": 0.95,
        "hepsiburada": 0.92,
        "n11": 0.97,
    },
}

_PLATFORM_DISPLAY: dict[str, str] = {
    "trendyol": "Trendyol",
    "hepsiburada": "Hepsiburada",
    "n11": "N11",
    "amazon_tr": "Amazon Türkiye",
}


@dataclass
class _PlatformResult:
    platform: str
    price: float
    seller_name: str
    rating: float
    url: str


class CrossPlatformAgent(BaseAgent):
    layer_id = "crossplatform"
    name = "Çapraz Platform"

    async def analyze(self, product: ProductData) -> LayerResult:
        search_query = await _extract_search_query(product.title)

        platform_results = _mock_other_platforms(product, search_query)

        best_alt = _find_best_alternative(product, platform_results)

        if best_alt is None:
            return LayerResult(
                layer_id=self.layer_id,
                name=self.name,
                status="OK",
                score=100,
                finding="Diğer platformlarda anlamlı fiyat avantajı bulunamadı",
                details={
                    "search_query": search_query,
                    "platforms_checked": [r.platform for r in platform_results],
                    "alternatives": [_result_to_dict(r) for r in platform_results],
                },
                confidence=0.60,
            )

        savings_pct = round((product.price_current - best_alt.price) / product.price_current * 100, 1)
        finding = (
            f"{_PLATFORM_DISPLAY.get(best_alt.platform, best_alt.platform)}'da "
            f"%{savings_pct} daha ucuz alternatif var "
            f"({product.price_current:.0f}₺ → {best_alt.price:.0f}₺)"
        )

        alternative = Alternative(
            platform=_PLATFORM_DISPLAY.get(best_alt.platform, best_alt.platform),
            seller_name=best_alt.seller_name,
            price=best_alt.price,
            savings=round(product.price_current - best_alt.price, 2),
            rating=best_alt.rating,
            url=best_alt.url,
        )

        return LayerResult(
            layer_id=self.layer_id,
            name=self.name,
            status="INFO",
            score=100,
            finding=finding,
            details={
                "search_query": search_query,
                "platforms_checked": [r.platform for r in platform_results],
                "alternatives": [_result_to_dict(r) for r in platform_results],
                "best_alternative": _result_to_dict(best_alt),
                "savings_pct": savings_pct,
                "alternative": alternative.model_dump(),
            },
            confidence=0.60,
        )


# ---------------------------------------------------------------------------
# Yardımcı fonksiyonlar
# ---------------------------------------------------------------------------

async def _extract_search_query(title: str) -> str:
    """Gemini Flash ile ürün başlığını öz arama sorgusuna dönüştür."""
    try:
        result = await generate_json(crossplatform_keyword_prompt(title))
        query = result.get("search_query", "")
        if query and isinstance(query, str):
            return query.strip()
    except Exception as exc:
        logger.warning("Arama sorgusu çıkarma hatası: %s", exc)
    # Fallback: ilk 5 kelime
    words = title.split()
    return " ".join(words[:5])


def _mock_other_platforms(
    product: ProductData,
    search_query: str,
) -> list[_PlatformResult]:
    """
    Diğer platformlar için mock fiyat verileri üretir.
    TASK-28: Playwright ile gerçek fiyatlarla değiştirilecek.
    """
    current_platform = product.platform
    factors = _PLATFORM_MOCK_FACTORS.get(current_platform, {})
    results: list[_PlatformResult] = []

    for platform, factor in factors.items():
        mock_price = round(product.price_current * factor, 2)
        mock_url = _build_mock_url(platform, search_query)

        results.append(
            _PlatformResult(
                platform=platform,
                price=mock_price,
                seller_name="Resmi Mağaza",
                rating=4.3,
                url=mock_url,
            )
        )

    return results


def _find_best_alternative(
    product: ProductData,
    platform_results: list[_PlatformResult],
) -> _PlatformResult | None:
    """
    Mevcut fiyattan anlamlı oranda daha ucuz en iyi platformu döndür.
    Eşik: %5 daha ucuz.
    """
    best: _PlatformResult | None = None
    best_savings = 0.0

    for r in platform_results:
        if r.platform == product.platform:
            continue
        diff = product.price_current - r.price
        diff_pct = diff / product.price_current
        if diff_pct >= _PRICE_DIFF_THRESHOLD and diff > best_savings:
            best_savings = diff
            best = r

    return best


def _build_mock_url(platform: str, query: str) -> str:
    """Arama sorgusu için platform URL'i oluşturur."""
    slug = query.lower().replace(" ", "-")
    urls = {
        "trendyol": f"https://www.trendyol.com/sr?q={query.replace(' ', '+')}",
        "hepsiburada": f"https://www.hepsiburada.com/ara?q={query.replace(' ', '+')}",
        "n11": f"https://www.n11.com/arama?q={query.replace(' ', '+')}",
        "amazon_tr": f"https://www.amazon.com.tr/s?k={query.replace(' ', '+')}",
    }
    return urls.get(platform, f"https://{platform}.com/search?q={slug}")


def _result_to_dict(r: _PlatformResult) -> dict:
    return {
        "platform": r.platform,
        "price": r.price,
        "seller_name": r.seller_name,
        "rating": r.rating,
        "url": r.url,
    }
