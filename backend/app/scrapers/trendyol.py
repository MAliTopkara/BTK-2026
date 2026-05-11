"""
TrendyolScraper — TrustLens AI
TASK-28: Trendyol ürün sayfasından ProductData parse eder.

MVP kapsamı (bu görev):
  - title, price_current, price_original, discount_pct
  - images (en az 3 CDN URL)
  - description (varsa)
  - seller (en azından isim)

Geniş kapsam (sonraki devirler):
  - reviews ~50 (ayrı API çağrısı)
  - urgency_indicators
  - rating_avg + review_count_total
"""

from __future__ import annotations

import logging
import re
from datetime import UTC, datetime
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from playwright.async_api import Page

from app.models.scan import ProductData, SellerData
from app.scrapers.base import BaseScraper, ScraperError

logger = logging.getLogger(__name__)

# Trendyol DOM seçicileri — Mayıs 2026 itibariyle yapı.
# NOT: Trendyol CSS Modules hash'leri kullanıyor (_carouselImage_abb7111),
# bu yüzden stable attribute selectorlara öncelik veriyoruz (data-testid,
# class içerme [class*='...']).
_SEL_TITLE = (
    "h1.pr-new-br, h1.product-name, "
    "[data-testid='product-detail-title'], "
    "h1"  # generic fallback — Trendyol ürün sayfasında genelde tek h1 var
)
_SEL_PRICE_CURRENT = (
    "p.new-price, "
    "[class*='price-current-price'], "
    "span.prc-dsc, "
    "[data-testid='price-current-price']"
)
_SEL_PRICE_ORIGINAL = (
    "p.old-price, "
    "[class*='price-original'], "
    "span.prc-org, span.prc-slg, "
    "[data-testid='price-original-price']"
)
_SEL_PRICE_FALLBACK = "div.product-price-container, [class*='product-price']"
_SEL_IMAGES = (
    "img[data-testid='image'], "
    "img[class*='carouselImage' i], "
    "img.detail-section-img"
)
_SEL_DESCRIPTION = (
    "ul.detail-attr-container, "
    "[class*='product-description'], "
    "[class*='detail-desc']"
)
_SEL_SELLER_NAME = (
    "[class*='merchant-name'], "
    "a.pb-merchant-link, a.merchant-link, "
    "[data-testid='seller-name']"
)


class TrendyolScraper(BaseScraper):
    platform = "trendyol"

    async def _parse(self, page: Page, url: str) -> ProductData:
        # Cloudflare arkasında uzun yüklemeler olabilir
        await page.wait_for_load_state("networkidle", timeout=15_000)

        title = await self._extract_title(page)
        price_current, price_original = await self._extract_prices(page)
        discount_pct = self._compute_discount(price_current, price_original)
        images = await self._extract_images(page)
        description = await self._extract_description(page)
        seller = await self._extract_seller(page)

        return ProductData(
            url=url,
            platform="trendyol",
            title=title,
            price_current=price_current,
            price_original=price_original,
            discount_pct=discount_pct,
            images=images[:10],   # token tasarrufu
            description=description,
            seller=seller,
            reviews=[],            # MVP: yorumlar henüz çekilmiyor
            review_count_total=0,
            rating_avg=0.0,
            urgency_indicators=[],
            raw_html=None,
            scraped_at=datetime.now(UTC),
        )

    # -----------------------------------------------------------------------
    # Field extractors — her biri kendi fallback'iyle çalışır
    # -----------------------------------------------------------------------

    async def _extract_title(self, page: Page) -> str:
        title = await _first_text(page, _SEL_TITLE)
        if not title:
            # OG title fallback
            og = await page.locator('meta[property="og:title"]').first.get_attribute("content")
            title = (og or "").strip()
        if not title:
            raise ScraperError("Ürün başlığı bulunamadı")
        return title

    async def _extract_prices(self, page: Page) -> tuple[float, float | None]:
        current_text = await _first_text(page, _SEL_PRICE_CURRENT)
        original_text = await _first_text(page, _SEL_PRICE_ORIGINAL)

        # Fallback: tüm fiyat kutusundan iki sayı çek
        if not current_text:
            fallback = await _first_text(page, _SEL_PRICE_FALLBACK)
            if fallback:
                nums = _extract_money(fallback)
                if len(nums) == 1:
                    return nums[0], None
                if len(nums) >= 2:
                    nums.sort()
                    return nums[0], nums[-1]

        if not current_text:
            raise ScraperError("Fiyat bulunamadı")

        current_nums = _extract_money(current_text)
        if not current_nums:
            raise ScraperError(f"Fiyat parse edilemedi: {current_text!r}")
        current = current_nums[0]

        original: float | None = None
        if original_text:
            original_nums = _extract_money(original_text)
            if original_nums:
                original = original_nums[0]
                # Üstü çizili fiyat current'tan küçükse muhtemelen yanlış eşleşti
                if original <= current:
                    original = None

        return current, original

    async def _extract_images(self, page: Page) -> list[str]:
        urls: list[str] = []
        locator = page.locator(_SEL_IMAGES)
        count = await locator.count()
        for i in range(min(count, 20)):
            elem = locator.nth(i)
            src = await elem.get_attribute("src") or await elem.get_attribute("srcset")
            if not src:
                continue
            # srcset varsa ilk URL'yi al
            first = src.split(",")[0].strip().split(" ")[0]
            if first.startswith("//"):
                first = "https:" + first
            if first.startswith("http") and first not in urls:
                urls.append(first)
        # OG image fallback
        if not urls:
            og = await page.locator('meta[property="og:image"]').first.get_attribute("content")
            if og:
                urls.append(og)
        return urls

    async def _extract_description(self, page: Page) -> str:
        text = await _first_text(page, _SEL_DESCRIPTION)
        if text:
            # Çok uzunsa kırp
            return text[:1500]
        # Meta description fallback
        meta = await page.locator('meta[name="description"]').first.get_attribute("content")
        return (meta or "")[:1500]

    async def _extract_seller(self, page: Page) -> SellerData:
        name = await _first_text(page, _SEL_SELLER_NAME)
        if not name:
            name = "Bilinmeyen Satıcı"
        # Detaylı satıcı bilgileri (age_days, total_products, rating) ayrı sayfada
        # MVP: sadece isim. age/rating None bırakılır, seller_agent INFO döner.
        return SellerData(
            name=name,
            age_days=None,
            total_products=None,
            rating=None,
            rating_count=None,
            is_verified=False,
        )

    # -----------------------------------------------------------------------
    # Yardımcı
    # -----------------------------------------------------------------------

    def _compute_discount(self, current: float, original: float | None) -> float | None:
        if not original or original <= current:
            return None
        return round((1 - current / original) * 100, 1)


# ---------------------------------------------------------------------------
# Module-level helpers
# ---------------------------------------------------------------------------

async def _first_text(page: Page, selector: str) -> str:
    """İlk eşleşen elementin innerText'ini döner, yoksa boş string."""
    try:
        locator = page.locator(selector).first
        if await locator.count() == 0:
            return ""
        text = await locator.inner_text(timeout=3_000)
        return text.strip()
    except Exception:
        return ""


# Birinci alternatif: Türkçe formatlı binlik ayırıcılı sayılar (1.899,00 / 1 899)
# İkinci alternatif: Düz tam/ondalıklı sayılar (1899 / 1899,00)
# Birinci `+` ile en az 1 binlik grup zorunlu — yoksa 1899'u 189 + 9 olarak parçalamasın.
_MONEY_RE = re.compile(r"(\d{1,3}(?:[.\s]\d{3})+(?:,\d{1,2})?|\d+(?:,\d{1,2})?)")

# KDV (%18), rating (4.5), iskonto (%62) gibi küçük sayıları fiyat olarak alma.
_MIN_PRICE = 50.0


def _extract_money(text: str) -> list[float]:
    """
    Türkçe fiyat formatından sayıları çıkar.
    "1.899,00 TL" → 1899.0, "4.999 TL" → 4999.0, "1899 TL" → 1899.0
    """
    nums: list[float] = []
    for match in _MONEY_RE.findall(text):
        cleaned = match.replace(".", "").replace(" ", "").replace(",", ".")
        try:
            value = float(cleaned)
            if value >= _MIN_PRICE:
                nums.append(value)
        except ValueError:
            continue
    return nums
