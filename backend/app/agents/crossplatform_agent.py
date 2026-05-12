"""
Katman 6 — Çapraz Platform Karşılaştırma
Akakçe üzerinden GERÇEK çoklu satıcı fiyat verisi çekilir; aynı ürün için
daha ucuz satıcı varsa Alternative üretilir.

Bu katman risk değil fırsat üretir — negatif skor yok, sadece INFO/OK.

Önceki MVP fake çarpan kullanıyordu ("trendyol → hepsiburada × 0.92") ve
search URL'i döndürüyordu — kullanıcı yanlış fiyat + yanlış ürün ile
karşılaşıyordu. Akakçe gerçek karşılaştırma kaynağı.
"""

from __future__ import annotations

import logging

from app.agents.base import BaseAgent
from app.models.scan import Alternative, LayerResult, ProductData
from app.services.akakce import AkakceResult, fetch_akakce_summary
from app.services.gemini import generate_json
from app.utils.prompts import crossplatform_keyword_prompt

logger = logging.getLogger(__name__)

# Minimum anlamlı tasarruf eşiği — bunun altı "anlamlı avantaj" değil
# %3: 1000 TL ürün için 30 TL alt sınır. Spam kaçınımı ve gerçek tasarruf arasındaki denge.
_PRICE_DIFF_THRESHOLD = 0.03  # %3
# Akakçe min, current'tan en fazla %50 ucuz olabilir; daha fazlası
# büyük olasılıkla yanlış ürün eşleşmesi (varyant/aksesuar)
_TRUST_FLOOR_RATIO = 0.50


class CrossPlatformAgent(BaseAgent):
    layer_id = "crossplatform"
    name = "Çapraz Platform"

    async def analyze(self, product: ProductData) -> LayerResult:
        search_query = await _extract_search_query(product.title)

        diagnostics: dict = {}
        akakce = await _safe_fetch_akakce(search_query, product.price_current, diagnostics)

        if akakce is None:
            fail_reason = diagnostics.get("fail_reason", "unknown")
            return LayerResult(
                layer_id=self.layer_id,
                name=self.name,
                status="OK",
                score=100,
                finding="Akakçe'de eşleşen ürün bulunamadı — fiyat karşılaştırması yapılamadı.",
                details={
                    "search_query": search_query,
                    "akakce_available": False,
                    "akakce_fail_reason": fail_reason,
                },
                confidence=0.40,
            )

        # Tasarruf hesabı
        savings = product.price_current - akakce.min_price
        savings_pct = (savings / product.price_current) * 100 if product.price_current > 0 else 0

        # Anlamlı avantaj yok → OK
        if savings_pct < _PRICE_DIFF_THRESHOLD * 100:
            return LayerResult(
                layer_id=self.layer_id,
                name=self.name,
                status="OK",
                score=100,
                finding=(
                    f"Akakçe'deki {akakce.seller_count} satıcının en düşük fiyatı "
                    f"({akakce.min_price:.0f}₺) bu ürünle benzer — "
                    "anlamlı fiyat avantajı yok."
                ),
                details={
                    "search_query": search_query,
                    "akakce_url": akakce.product_url,
                    "akakce_min": akakce.min_price,
                    "akakce_max": akakce.max_price,
                    "akakce_avg": round(akakce.avg_price, 2),
                    "seller_count": akakce.seller_count,
                },
                confidence=0.75,
            )

        # Min fiyat çok düşükse muhtemelen yanlış eşleşme — INFO ama Alternative önermeyiz
        if akakce.min_price < product.price_current * _TRUST_FLOOR_RATIO:
            return LayerResult(
                layer_id=self.layer_id,
                name=self.name,
                status="OK",
                score=100,
                finding=(
                    f"Akakçe'de daha ucuz listings var ({akakce.min_price:.0f}₺) ama "
                    "fark çok yüksek — büyük olasılıkla farklı varyant/aksesuar. "
                    "Manuel kontrol önerilir."
                ),
                details={
                    "search_query": search_query,
                    "akakce_url": akakce.product_url,
                    "akakce_min": akakce.min_price,
                    "trust_floor_triggered": True,
                },
                confidence=0.55,
            )

        # Gerçek avantaj — Alternative üret
        alternative = Alternative(
            platform="Akakçe",
            seller_name=f"{akakce.seller_count} satıcı karşılaştırması",
            price=round(akakce.min_price, 2),
            savings=round(savings, 2),
            rating=0.0,  # Akakçe genel skor sağlamıyor
            url=akakce.product_url,
        )

        finding = (
            f"Akakçe'de %{savings_pct:.1f} daha ucuz seçenek var "
            f"({product.price_current:.0f}₺ → {akakce.min_price:.0f}₺) — "
            f"{akakce.seller_count} satıcı listeleniyor."
        )

        return LayerResult(
            layer_id=self.layer_id,
            name=self.name,
            status="INFO",
            score=100,
            finding=finding,
            details={
                "search_query": search_query,
                "akakce_url": akakce.product_url,
                "akakce_min": akakce.min_price,
                "akakce_max": akakce.max_price,
                "akakce_avg": round(akakce.avg_price, 2),
                "seller_count": akakce.seller_count,
                "savings_pct": round(savings_pct, 1),
                "alternative": alternative.model_dump(),
            },
            confidence=0.80,
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


async def _safe_fetch_akakce(
    query: str,
    reference_price: float,
    diagnostics: dict,
) -> AkakceResult | None:
    """Akakçe çağrısını exception'lardan korur. Fail reason'ı diagnostics'e yazar."""
    try:
        return await fetch_akakce_summary(
            query, reference_price=reference_price, diagnostics=diagnostics
        )
    except Exception as exc:
        logger.warning("Akakçe çağrısı başarısız (graceful): %s", exc)
        diagnostics["fail_reason"] = f"top_level_exception:{type(exc).__name__}"
        return None
