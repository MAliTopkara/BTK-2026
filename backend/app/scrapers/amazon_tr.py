"""
AmazonTRScraper — TrustLens AI

Amazon.com.tr için scraper. Amazon agresif anti-bot kullanır
(CAPTCHA, IP rate limit, JS challenge). Stratejimiz:
  1. httpx + desktop Chrome UA → bazen geçer
     - JSON-LD genelde yok, DOM regex ile parse (#productTitle, .a-price)
  2. Başarısızsa Playwright fallback
     - Cookie warming (amazon.com.tr/?language=tr)
     - DOM selectors ile parse
"""

from __future__ import annotations

import asyncio
import html as html_lib
import logging
import re
from datetime import UTC, datetime
from typing import TYPE_CHECKING

import httpx

if TYPE_CHECKING:
    from playwright.async_api import Page

from app.models.scan import ProductData, SellerData
from app.scrapers.base import BaseScraper, ScraperError
from app.scrapers.trendyol import _first_text, _looks_like_challenge

logger = logging.getLogger(__name__)

_HTML_TIMEOUT_SEC = 20.0

_DESKTOP_HEADERS = {
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "tr-TR,tr;q=0.9,en;q=0.8",
    "Cache-Control": "no-cache",
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
    ),
}

# URL pattern: /dp/ASIN/... veya /gp/product/ASIN
_ASIN_RE = re.compile(r"/(?:dp|gp/product)/([A-Z0-9]{10})")

# HTML regex'leri (httpx path için)
_TITLE_RE = re.compile(
    r'<span\s+id=["\']productTitle["\'][^>]*>\s*([^<]+?)\s*</span>',
    re.IGNORECASE,
)
_PRICE_WHOLE_RE = re.compile(
    r'<span\s+class="a-price-whole">([\d.,]+)</span>',
)
_PRICE_FRACTION_RE = re.compile(
    r'<span\s+class="a-price-fraction">(\d+)</span>',
)
_BYLINE_RE = re.compile(
    r'<a\s+id=["\']bylineInfo["\'][^>]*>([^<]+)</a>',
)
_IMAGE_HIRES_RE = re.compile(r'"hiRes":"(https://[^"]+)"')
_IMAGE_LARGE_RE = re.compile(r'"large":"(https://[^"]+)"')
_RATING_RE = re.compile(
    r'<span[^>]*data-hook="rating-out-of-text"[^>]*>([\d,.]+) ',
)
_REVIEW_COUNT_RE = re.compile(
    r'id="acrCustomerReviewText"[^>]*>([\d.,]+)\s*\w+',
)

# Playwright DOM selectors
_SEL_TITLE = "#productTitle"
_SEL_PRICE_OFFSCREEN = ".a-price .a-offscreen"
_SEL_PRICE_WHOLE = ".a-price-whole"
_SEL_PRICE_ORIGINAL = ".basisPrice .a-text-strike, .a-price.a-text-price .a-offscreen"
_SEL_BYLINE = "#bylineInfo"
_SEL_IMAGE_BLOCK = "#landingImage, #imgBlkFront"
_SEL_RATING = "#acrPopover [aria-label*='out of'], [data-hook='rating-out-of-text']"
_SEL_REVIEW_COUNT = "#acrCustomerReviewText"

_CAPTCHA_MARKERS = (
    "type the characters you see",
    "robot check",
    "enter the characters you see below",
    "/errors/validatecaptcha",
)


class AmazonTRScraper(BaseScraper):
    platform = "amazon_tr"

    async def scrape(self, url: str) -> ProductData | None:
        try:
            html_result = await self._scrape_via_html(url)
            if html_result is not None:
                logger.info(
                    "[amazon_tr] HTML başarılı: %s → %s",
                    url,
                    html_result.title[:40],
                )
                return html_result
        except Exception as exc:  # noqa: BLE001
            logger.info(
                "[amazon_tr] HTML başarısız (%s), Playwright deneniyor", exc
            )

        return await super().scrape(url)

    async def _scrape_via_html(self, url: str) -> ProductData | None:
        async with httpx.AsyncClient(
            timeout=_HTML_TIMEOUT_SEC, follow_redirects=True
        ) as client:
            resp = await client.get(url, headers=_DESKTOP_HEADERS)
            if resp.status_code != 200:
                logger.debug("[amazon_tr] HTML status %d: %s", resp.status_code, url)
                return None
            html = resp.text

        if _looks_like_challenge(html) or _looks_like_amazon_captcha(html):
            logger.debug("[amazon_tr] CAPTCHA/challenge sayfası tespit edildi")
            return None

        title_m = _TITLE_RE.search(html)
        if not title_m:
            return None
        title = html_lib.unescape(title_m.group(1)).strip()

        # Fiyat
        price_current = _extract_amazon_price(html)
        if price_current is None:
            return None

        # Görseller — JS state'inden
        images: list[str] = []
        for m in _IMAGE_HIRES_RE.finditer(html):
            url_val = m.group(1).replace("\\/", "/")
            if url_val not in images:
                images.append(url_val)
        if not images:
            for m in _IMAGE_LARGE_RE.finditer(html):
                url_val = m.group(1).replace("\\/", "/")
                if url_val not in images:
                    images.append(url_val)
        images = images[:10]

        # Satıcı (byline)
        seller_name = "Amazon TR"
        byline_m = _BYLINE_RE.search(html)
        if byline_m:
            seller_name = html_lib.unescape(byline_m.group(1))
            seller_name = re.sub(r"\s+", " ", seller_name).strip()
            seller_name = _normalize_amazon_byline(seller_name)

        # Puan
        rating_avg = 0.0
        rating_m = _RATING_RE.search(html)
        if rating_m:
            try:
                rating_avg = float(rating_m.group(1).replace(",", "."))
            except ValueError:
                pass

        review_count = 0
        rc_m = _REVIEW_COUNT_RE.search(html)
        if rc_m:
            try:
                review_count = int(rc_m.group(1).replace(".", "").replace(",", ""))
            except ValueError:
                pass

        return ProductData(
            url=url,
            platform="amazon_tr",
            title=title,
            price_current=price_current,
            price_original=None,
            discount_pct=None,
            images=images,
            description="",
            seller=SellerData(name=seller_name, is_verified=False),
            reviews=[],
            review_count_total=review_count,
            rating_avg=rating_avg,
            urgency_indicators=[],
            raw_html=None,
            scraped_at=datetime.now(UTC),
        )

    async def _parse(self, page: Page, url: str) -> ProductData:
        # Cookie warming: ana sayfaya git
        await page.goto(
            "https://www.amazon.com.tr/?language=tr_TR",
            timeout=20_000,
            wait_until="domcontentloaded",
        )
        await asyncio.sleep(1.5)

        await page.goto(url, timeout=25_000, wait_until="domcontentloaded")
        try:
            await page.wait_for_selector(_SEL_TITLE, timeout=12_000)
        except Exception:
            pass

        # CAPTCHA tespiti
        body_text = (await page.content()).lower()
        if any(m in body_text for m in _CAPTCHA_MARKERS):
            raise ScraperError("Amazon CAPTCHA gösterdi")

        title = await _first_text(page, _SEL_TITLE)
        if not title:
            og = await page.locator('meta[property="og:title"]').first.get_attribute("content")
            title = (og or "").strip()
        if not title:
            raise ScraperError("Ürün başlığı bulunamadı")

        # Fiyat: önce .a-offscreen (tam fiyat metin)
        price_text = await _first_text(page, _SEL_PRICE_OFFSCREEN)
        price_current = _parse_amazon_price_text(price_text)
        if price_current is None:
            whole = await _first_text(page, _SEL_PRICE_WHOLE)
            price_current = _parse_amazon_price_text(whole)
        if price_current is None:
            raise ScraperError("Fiyat parse edilemedi")

        # Görseller
        images: list[str] = []
        try:
            landing = await page.locator(_SEL_IMAGE_BLOCK).first.get_attribute("src")
            if landing and landing.startswith("http"):
                images.append(landing)
        except Exception:
            pass
        if not images:
            try:
                og = await page.locator('meta[property="og:image"]').first.get_attribute("content")
                if og:
                    images.append(og)
            except Exception:
                pass

        # Satıcı (byline)
        byline = await _first_text(page, _SEL_BYLINE)
        seller_name = _normalize_amazon_byline(byline) if byline else "Amazon TR"

        # Puan
        rating_avg = 0.0
        try:
            rating_text = await _first_text(page, _SEL_RATING)
            m = re.search(r"([\d,.]+)", rating_text)
            if m:
                rating_avg = float(m.group(1).replace(",", "."))
        except Exception:
            pass

        review_count = 0
        try:
            rc_text = await _first_text(page, _SEL_REVIEW_COUNT)
            m = re.search(r"([\d.]+)", rc_text)
            if m:
                review_count = int(m.group(1).replace(".", ""))
        except Exception:
            pass

        return ProductData(
            url=url,
            platform="amazon_tr",
            title=title,
            price_current=price_current,
            price_original=None,
            discount_pct=None,
            images=images[:10],
            description="",
            seller=SellerData(name=seller_name, is_verified=False),
            reviews=[],
            review_count_total=review_count,
            rating_avg=rating_avg,
            urgency_indicators=[],
            raw_html=None,
            scraped_at=datetime.now(UTC),
        )


def _looks_like_amazon_captcha(html: str) -> bool:
    head = html[:5000].lower()
    return any(m in head for m in _CAPTCHA_MARKERS)


def _extract_amazon_price(html: str) -> float | None:
    """Amazon HTML'inden fiyat çıkarır. a-price-whole + a-price-fraction veya a-offscreen."""
    whole_m = _PRICE_WHOLE_RE.search(html)
    if whole_m:
        whole = whole_m.group(1).replace(".", "").replace(",", "")
        frac_m = _PRICE_FRACTION_RE.search(html)
        frac = frac_m.group(1) if frac_m else "00"
        try:
            return float(f"{whole}.{frac}")
        except ValueError:
            pass

    # a-offscreen fallback: "65.999,00 TL"
    off_m = re.search(
        r'<span\s+class="a-offscreen">([\d.,]+)\s*(?:TL|₺)?\s*</span>', html
    )
    if off_m:
        return _parse_amazon_price_text(off_m.group(1))
    return None


def _parse_amazon_price_text(text: str | None) -> float | None:
    """'65.999,00 TL' veya '65999' formatından float üret."""
    if not text:
        return None
    cleaned = re.sub(r"[^\d,.]", "", text).strip()
    if not cleaned:
        return None
    # Türkçe format: nokta binlik, virgül ondalık
    cleaned = cleaned.replace(".", "").replace(",", ".")
    try:
        v = float(cleaned)
        return v if v >= 1 else None
    except ValueError:
        return None


def _normalize_amazon_byline(text: str) -> str:
    """
    Amazon byline metnini normalize eder:
    "Ziyaret edin: Apple Mağazası" → "Apple Mağazası"
    "Apple Store'u ziyaret edin" → "Apple Store"
    """
    text = text.strip()
    lower = text.lower()
    if lower.startswith("ziyaret"):
        return text.split(":", 1)[-1].strip()
    # "X mağazasını ziyaret edin" / "X'u ziyaret edin"
    m = re.match(
        r"(.+?)\s*(?:mağaza\w*\s+)?ziyaret\s+ed[iı]n\b",
        text,
        re.IGNORECASE,
    )
    candidate = m.group(1).strip() if m else text
    # Sondaki Türkçe ek: " 'u", " 'ı", " 'a" vb. (apostrof + 1-2 ek harfi)
    candidate = re.sub(r"['‘’ʼ]\w{1,3}$", "", candidate).strip()
    return candidate


def extract_asin(url: str) -> str | None:
    """URL'den ASIN çıkarır (cache/diagnostik için)."""
    m = _ASIN_RE.search(url)
    return m.group(1) if m else None
