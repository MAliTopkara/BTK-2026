"""
HepsiburadaScraper — TrustLens AI

Hepsiburada, Akamai Bot Manager kullanıyor — basit Chromium headless engellenir.
Strateji (Mayıs 2026 revize):
  1. İlk olarak mobil iOS Safari UA ile httpx HTML çek (anti-bot daha gevşek)
     - JSON-LD veya regex ile temel veriyi al
  2. Başarısızsa Playwright fallback:
     - Önce hepsiburada.com ana sayfasına git (cookie warming)
     - Stealth init script + randomized UA + viewport
     - 3 saniye bekle, sonra ürün sayfasına git
     - JSON-LD ve DOM'dan parse et
  3. Hepsi başarısızsa None döner — caller error mesajı verir
"""

from __future__ import annotations

import asyncio
import logging
import re
from datetime import UTC, datetime
from typing import TYPE_CHECKING

import httpx

if TYPE_CHECKING:
    from playwright.async_api import Page

from app.models.scan import ProductData, SellerData
from app.scrapers.base import BaseScraper, ScraperError
from app.scrapers.trendyol import (
    _extract_money,
    _find_product_jsonld,
    _first_text,
    _looks_like_challenge,
)

logger = logging.getLogger(__name__)

_HTML_TIMEOUT_SEC = 15.0

# Mobil Safari UA — Akamai bot manager bunu çoğunlukla geçirir
_MOBILE_HEADERS = {
    "Accept": "text/html,application/xhtml+xml,*/*;q=0.8",
    "Accept-Language": "tr-TR,tr;q=0.9,en;q=0.8",
    "Cache-Control": "no-cache",
    "User-Agent": (
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) "
        "AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
    ),
}

# Hepsiburada DOM seçicileri (Playwright fallback için)
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
_SEL_IMAGES = (
    "div.image-section img, picture.product-image source, "
    "img[data-test-id='product-image']"
)
_SEL_DESCRIPTION = "div.product-features, div.product-description, ul.product-feature-list"
_SEL_SELLER_NAME = "a.merchant-name, a[data-test-id='seller-name'], span.merchant-info-name"


# Ham HTML'de merchant adı için regex (Hepsiburada GraphQL state'i)
_MERCHANT_NAME_RE = re.compile(r'"merchantName"\s*:\s*"([^"]+)"')
_PRICE_VALUE_RE = re.compile(r'"price"\s*:\s*\{\s*"value"\s*:\s*([\d.]+)')


class HepsiburadaScraper(BaseScraper):
    platform = "hepsiburada"

    async def scrape(self, url: str) -> ProductData | None:
        """Önce httpx + mobile UA (hızlı). Başarısızsa Playwright fallback."""
        try:
            html_result = await self._scrape_via_html(url)
            if html_result is not None:
                logger.info(
                    "[hepsiburada] HTML başarılı: %s → %s",
                    url,
                    html_result.title[:40],
                )
                return html_result
        except Exception as exc:  # noqa: BLE001
            logger.info(
                "[hepsiburada] HTML başarısız (%s), Playwright deneniyor", exc
            )

        return await super().scrape(url)

    async def _scrape_via_html(self, url: str) -> ProductData | None:
        """Mobil UA ile httpx çağrısı + JSON-LD parse."""
        async with httpx.AsyncClient(
            timeout=_HTML_TIMEOUT_SEC, follow_redirects=True
        ) as client:
            resp = await client.get(url, headers=_MOBILE_HEADERS)
            if resp.status_code != 200:
                logger.debug(
                    "[hepsiburada] HTML status %d: %s", resp.status_code, url
                )
                return None
            html = resp.text

        if _looks_like_challenge(html):
            logger.debug("[hepsiburada] challenge sayfası tespit edildi")
            return None

        product_jsonld = _find_product_jsonld(html)
        if product_jsonld is None:
            # Mobile sayfada Product JSON-LD bazen yok — meta tag fallback
            return self._extract_from_meta_tags(html, url)

        title_val = product_jsonld.get("name")
        if not isinstance(title_val, str) or not title_val.strip():
            return None
        title = title_val.strip()

        offers = product_jsonld.get("offers")
        if isinstance(offers, list):
            offers = offers[0] if offers else {}
        if not isinstance(offers, dict):
            offers = {}
        try:
            price_current = float(offers.get("price") or 0)
        except (TypeError, ValueError):
            return None
        if price_current < 1:
            return None

        # Görseller
        images: list[str] = []
        image_raw = product_jsonld.get("image")
        if isinstance(image_raw, str):
            images.append(image_raw)
        elif isinstance(image_raw, list):
            for img in image_raw:
                if isinstance(img, str) and img.startswith("http"):
                    images.append(img)

        # Rating
        rating_avg = 0.0
        review_count = 0
        ar = product_jsonld.get("aggregateRating")
        if isinstance(ar, dict):
            try:
                rating_avg = float(ar.get("ratingValue") or 0)
            except (TypeError, ValueError):
                pass
            try:
                review_count = int(ar.get("ratingCount") or ar.get("reviewCount") or 0)
            except (TypeError, ValueError):
                pass

        # Satıcı
        seller_name = ""
        offer_seller = offers.get("seller")
        if isinstance(offer_seller, dict):
            cand = offer_seller.get("name")
            if isinstance(cand, str):
                seller_name = cand.strip()
        if not seller_name:
            merchant_m = _MERCHANT_NAME_RE.search(html)
            if merchant_m:
                seller_name = merchant_m.group(1).strip()
        if not seller_name:
            brand = product_jsonld.get("brand")
            if isinstance(brand, dict):
                cand = brand.get("name")
                if isinstance(cand, str):
                    seller_name = cand.strip()
        if not seller_name:
            seller_name = "Hepsiburada satıcısı"

        description_raw = product_jsonld.get("description")
        description = description_raw[:1500] if isinstance(description_raw, str) else ""

        return ProductData(
            url=url,
            platform="hepsiburada",
            title=title,
            price_current=price_current,
            price_original=None,
            discount_pct=None,
            images=images[:10],
            description=description,
            seller=SellerData(name=seller_name, is_verified=False),
            reviews=[],
            review_count_total=review_count,
            rating_avg=rating_avg,
            urgency_indicators=[],
            raw_html=None,
            scraped_at=datetime.now(UTC),
        )

    def _extract_from_meta_tags(self, html: str, url: str) -> ProductData | None:
        """JSON-LD yoksa OG meta + regex'ten asgari veri çıkar."""
        og_title_m = re.search(
            r'<meta\s+property="og:title"\s+content="([^"]+)"', html
        )
        if not og_title_m:
            return None
        title = og_title_m.group(1).strip()

        og_price_m = re.search(
            r'<meta\s+property="product:price:amount"\s+content="([^"]+)"', html
        )
        if not og_price_m:
            return None
        try:
            price_current = float(og_price_m.group(1))
        except ValueError:
            return None

        og_image_m = re.search(
            r'<meta\s+property="og:image"\s+content="([^"]+)"', html
        )
        images = [og_image_m.group(1)] if og_image_m else []

        seller_name = "Hepsiburada satıcısı"
        merchant_m = _MERCHANT_NAME_RE.search(html)
        if merchant_m:
            seller_name = merchant_m.group(1).strip()

        return ProductData(
            url=url,
            platform="hepsiburada",
            title=title,
            price_current=price_current,
            price_original=None,
            discount_pct=None,
            images=images,
            description="",
            seller=SellerData(name=seller_name, is_verified=False),
            reviews=[],
            review_count_total=0,
            rating_avg=0.0,
            urgency_indicators=[],
            raw_html=None,
            scraped_at=datetime.now(UTC),
        )

    async def _parse(self, page: Page, url: str) -> ProductData:
        # Cookie warming: önce ana sayfaya git
        await page.goto("https://www.hepsiburada.com/", timeout=20_000, wait_until="domcontentloaded")
        await asyncio.sleep(2.0)
        # Sonra ürün sayfasına git
        await page.goto(url, timeout=25_000, wait_until="domcontentloaded")
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
        seller_name = await _first_text(page, _SEL_SELLER_NAME) or "Hepsiburada satıcısı"

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
