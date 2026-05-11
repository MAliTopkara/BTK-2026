"""
HepsiburadaScraper — TrustLens AI
TASK-28 Plan B: Trendyol anti-bot'a takılırsa fallback platform.

Aynı BaseScraper interface'i, sadece DOM seçicileri farklı.
"""

from __future__ import annotations

import logging
from datetime import UTC, datetime
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from playwright.async_api import Page

from app.models.scan import ProductData, SellerData
from app.scrapers.base import BaseScraper, ScraperError
from app.scrapers.trendyol import _extract_money, _first_text

logger = logging.getLogger(__name__)

# Hepsiburada DOM seçicileri (2026 itibariyle gözlemlenen)
_SEL_TITLE = "h1.product-name, h1[data-test-id='title'], span.product-name"
_SEL_PRICE_CURRENT = (
    "span[data-test-id='price-current-price'], "
    "span.product-price__price, "
    "div.price-section .product-price"
)
_SEL_PRICE_ORIGINAL = (
    "del[data-test-id='price-prev-price'], "
    "div.price-section del, "
    "span.product-price__old-price"
)
_SEL_IMAGES = "div.image-section img, picture.product-image source, img[data-test-id='product-image']"
_SEL_DESCRIPTION = "div.product-features, div.product-description, ul.product-feature-list"
_SEL_SELLER_NAME = "a.merchant-name, a[data-test-id='seller-name'], span.merchant-info-name"


class HepsiburadaScraper(BaseScraper):
    platform = "hepsiburada"

    async def _parse(self, page: Page, url: str) -> ProductData:
        await page.wait_for_load_state("networkidle", timeout=15_000)

        title = await _first_text(page, _SEL_TITLE)
        if not title:
            og = await page.locator('meta[property="og:title"]').first.get_attribute("content")
            title = (og or "").strip()
        if not title:
            raise ScraperError("Ürün başlığı bulunamadı")

        current_text = await _first_text(page, _SEL_PRICE_CURRENT)
        if not current_text:
            raise ScraperError("Fiyat bulunamadı")
        current_nums = _extract_money(current_text)
        if not current_nums:
            raise ScraperError(f"Fiyat parse edilemedi: {current_text!r}")
        price_current = current_nums[0]

        original_text = await _first_text(page, _SEL_PRICE_ORIGINAL)
        price_original: float | None = None
        if original_text:
            original_nums = _extract_money(original_text)
            if original_nums and original_nums[0] > price_current:
                price_original = original_nums[0]

        discount_pct = (
            round((1 - price_current / price_original) * 100, 1)
            if price_original
            else None
        )

        images = await _extract_images(page)
        description = (await _first_text(page, _SEL_DESCRIPTION))[:1500]
        seller_name = await _first_text(page, _SEL_SELLER_NAME) or "Bilinmeyen Satıcı"

        return ProductData(
            url=url,
            platform="hepsiburada",
            title=title,
            price_current=price_current,
            price_original=price_original,
            discount_pct=discount_pct,
            images=images[:10],
            description=description,
            seller=SellerData(name=seller_name),
            reviews=[],
            review_count_total=0,
            rating_avg=0.0,
            urgency_indicators=[],
            raw_html=None,
            scraped_at=datetime.now(UTC),
        )


async def _extract_images(page: Page) -> list[str]:
    urls: list[str] = []
    locator = page.locator(_SEL_IMAGES)
    count = await locator.count()
    for i in range(min(count, 20)):
        elem = locator.nth(i)
        src = await elem.get_attribute("src") or await elem.get_attribute("srcset")
        if not src:
            continue
        first = src.split(",")[0].strip().split(" ")[0]
        if first.startswith("//"):
            first = "https:" + first
        if first.startswith("http") and first not in urls:
            urls.append(first)
    if not urls:
        og = await page.locator('meta[property="og:image"]').first.get_attribute("content")
        if og:
            urls.append(og)
    return urls
