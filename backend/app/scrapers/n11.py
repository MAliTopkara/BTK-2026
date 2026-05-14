"""
N11Scraper — TrustLens AI

N11 anti-bot (Datadome/Akamai-benzeri) kullanıyor.
Strateji:
  1. httpx + mobil UA → bazen geçer (örn. UA bot listesinde değilse)
     - JSON-LD veya regex ile parse
  2. Başarısızsa Playwright fallback (BaseScraper.scrape)
     - h1 başlık, .newPrice, .sellerNickName DOM selectors
     - JSON-LD varsa onu tercih et
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

_MOBILE_HEADERS = {
    "Accept": "text/html,application/xhtml+xml,*/*;q=0.8",
    "Accept-Language": "tr-TR,tr;q=0.9,en;q=0.8",
    "User-Agent": (
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) "
        "AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
    ),
}

# N11 DOM seçicileri
_SEL_TITLE = "h1.proName, h1.proDetailNew__title, h1[itemprop='name']"
_SEL_PRICE_CURRENT = (
    "ins.newPrice, .newPrice ins, "
    ".priceContainer .newPrice, "
    "div.priceDetail span[itemprop='price'], "
    ".unf-p-detail-price-current"
)
_SEL_PRICE_ORIGINAL = (
    "del.oldPrice, .oldPrice del, "
    ".priceContainer .oldPrice, "
    ".unf-p-detail-price-original"
)
_SEL_IMAGES = (
    "img.lazy[data-original], #productImages img, "
    ".unf-p-img img, [data-img-url]"
)
_SEL_SELLER_NAME = (
    "a.sellerNickName, .sellerInfo .nickName, "
    ".unf-p-detail-seller a, a[href*='/magaza/']"
)
_SEL_DESCRIPTION = "#unf-p-detail-content, .unf-p-detail-content, .description"


class N11Scraper(BaseScraper):
    platform = "n11"

    async def scrape(self, url: str) -> ProductData | None:
        try:
            html_result = await self._scrape_via_html(url)
            if html_result is not None:
                logger.info(
                    "[n11] HTML başarılı: %s → %s", url, html_result.title[:40]
                )
                return html_result
        except Exception as exc:  # noqa: BLE001
            logger.info("[n11] HTML başarısız (%s), Playwright deneniyor", exc)

        return await super().scrape(url)

    async def _scrape_via_html(self, url: str) -> ProductData | None:
        async with httpx.AsyncClient(
            timeout=_HTML_TIMEOUT_SEC, follow_redirects=True
        ) as client:
            resp = await client.get(url, headers=_MOBILE_HEADERS)
            if resp.status_code != 200:
                logger.debug("[n11] HTML status %d: %s", resp.status_code, url)
                return None
            html = resp.text

        if _looks_like_challenge(html):
            return None

        product_jsonld = _find_product_jsonld(html)
        if product_jsonld is None:
            return None

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

        seller_name = ""
        offer_seller = offers.get("seller")
        if isinstance(offer_seller, dict):
            cand = offer_seller.get("name")
            if isinstance(cand, str):
                seller_name = cand.strip()
        if not seller_name:
            seller_name = "n11 satıcısı"

        description_raw = product_jsonld.get("description")
        description = description_raw[:1500] if isinstance(description_raw, str) else ""

        return ProductData(
            url=url,
            platform="n11",
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

    async def _parse(self, page: Page, url: str) -> ProductData:
        # Cookie warming: ana sayfayı önce ziyaret et (anti-bot için)
        try:
            await page.goto("https://www.n11.com/", timeout=15_000, wait_until="domcontentloaded")
            await asyncio.sleep(1.5)
            await page.goto(url, timeout=20_000, wait_until="domcontentloaded")
        except Exception:
            pass

        # N11 networkidle'ya hiçbir zaman varmıyor (sürekli tracker request) — domcontentloaded yeter
        try:
            await page.wait_for_load_state("domcontentloaded", timeout=15_000)
            # h1 görünmesini bekle (sayfa hazır mı?)
            await page.wait_for_selector("h1", timeout=10_000)
        except Exception:
            pass

        # Önce JSON-LD'i dene
        try:
            blocks = await page.locator(
                'script[type="application/ld+json"]'
            ).all_inner_texts()
        except Exception:
            blocks = []
        product_jsonld = None
        for raw in blocks:
            data = _find_product_jsonld(f'<script type="application/ld+json">{raw}</script>')
            if data is not None:
                product_jsonld = data
                break

        if product_jsonld:
            title = (product_jsonld.get("name") or "").strip()
            offers = product_jsonld.get("offers")
            if isinstance(offers, list):
                offers = offers[0] if offers else {}
            price_current = 0.0
            if isinstance(offers, dict):
                try:
                    price_current = float(offers.get("price") or 0)
                except (TypeError, ValueError):
                    pass
            if title and price_current >= 1:
                images: list[str] = []
                image_raw = product_jsonld.get("image")
                if isinstance(image_raw, str):
                    images.append(image_raw)
                elif isinstance(image_raw, list):
                    for img in image_raw:
                        if isinstance(img, str) and img.startswith("http"):
                            images.append(img)
                seller_name = await _first_text(page, _SEL_SELLER_NAME) or "n11 satıcısı"
                return ProductData(
                    url=url,
                    platform="n11",
                    title=title,
                    price_current=price_current,
                    price_original=None,
                    discount_pct=None,
                    images=images[:10],
                    description="",
                    seller=SellerData(name=seller_name),
                    reviews=[],
                    review_count_total=0,
                    rating_avg=0.0,
                    urgency_indicators=[],
                    raw_html=None,
                    scraped_at=datetime.now(UTC),
                )

        # DOM fallback
        title = await _first_text(page, _SEL_TITLE)
        if not title:
            try:
                og = await page.locator('meta[property="og:title"]').first.get_attribute(
                    "content", timeout=3_000
                )
                title = (og or "").strip()
            except Exception:
                title = ""
        if not title:
            raise ScraperError("Ürün başlığı bulunamadı")

        current_text = await _first_text(page, _SEL_PRICE_CURRENT)
        if not current_text:
            # itemprop=price attribute fallback
            try:
                price_attr = await page.locator("[itemprop='price']").first.get_attribute("content")
                if price_attr:
                    current_text = price_attr
            except Exception:
                pass
        if not current_text:
            raise ScraperError("Fiyat bulunamadı")
        nums = _extract_money(current_text)
        if not nums:
            try:
                price_current = float(re.sub(r"[^0-9.]", "", current_text.replace(",", ".")))
            except ValueError:
                raise ScraperError(f"Fiyat parse edilemedi: {current_text!r}") from None
        else:
            price_current = nums[0]

        original_text = await _first_text(page, _SEL_PRICE_ORIGINAL)
        price_original: float | None = None
        if original_text:
            on = _extract_money(original_text)
            if on and on[0] > price_current:
                price_original = on[0]
        discount_pct = (
            round((1 - price_current / price_original) * 100, 1)
            if price_original
            else None
        )

        images = await _extract_n11_images(page)
        description = (await _first_text(page, _SEL_DESCRIPTION))[:1500]
        seller_name = await _first_text(page, _SEL_SELLER_NAME) or "n11 satıcısı"

        return ProductData(
            url=url,
            platform="n11",
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


async def _extract_n11_images(page: Page) -> list[str]:
    urls: list[str] = []
    locator = page.locator(_SEL_IMAGES)
    count = await locator.count()
    for i in range(min(count, 20)):
        elem = locator.nth(i)
        src = (
            await elem.get_attribute("data-original")
            or await elem.get_attribute("data-img-url")
            or await elem.get_attribute("src")
        )
        if not src:
            continue
        if src.startswith("//"):
            src = "https:" + src
        if src.startswith("http") and src not in urls:
            urls.append(src)
    if not urls:
        og = await page.locator('meta[property="og:image"]').first.get_attribute("content")
        if og:
            urls.append(og)
    return urls
