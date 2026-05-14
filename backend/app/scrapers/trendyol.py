"""
TrendyolScraper — TrustLens AI

İki katmanlı strateji (Mayıs 2026 itibarıyla revize):
  1. HTML JSON-LD (birincil): httpx ile www.trendyol.com sayfasını çek,
     <script type="application/ld+json"> içindeki Product schema'yı parse et.
     - Anti-bot yok (Trendyol HTML sayfası herkese açık)
     - JSON-LD: name, price, image, aggregateRating, review (en az 20)
     - Ham HTML regex: merchant adı, originalPrice (indirim öncesi)
     - <1 saniye, Chromium gerektirmez
  2. Playwright + DOM (fallback): HTML 200 dönmezse veya JSON-LD bulunmazsa
     - schema.org Product JSON-LD (SEO için stable)
     - DOM fallback sadece seller adı için

Not: Önceki `public-mdc.trendyol.com` API endpoint'i artık DNS'te yok (kapatılmış).
"""

from __future__ import annotations

import json
import logging
import re
from datetime import UTC, datetime
from typing import TYPE_CHECKING, Any

import httpx

if TYPE_CHECKING:
    from playwright.async_api import Page

from app.models.scan import ProductData, ReviewData, SellerData
from app.scrapers.base import BaseScraper, ScraperError

logger = logging.getLogger(__name__)

# HTML ürün sayfasını çekmek için
_HTML_TIMEOUT_SEC = 15.0
# URL pattern: ".../urun-adi-p-123456789" → product_id = "123456789"
_PRODUCT_ID_RE = re.compile(r"-p-(\d+)")
_JSONLD_RE = re.compile(
    r'<script[^>]*type=["\']application/ld\+json["\'][^>]*>(.+?)</script>',
    re.DOTALL,
)
# Ham HTML regex: merchant.name (JSON-LD'de yok, sayfa içi state'ten gelir)
_MERCHANT_NAME_RE = re.compile(
    r'"merchant":\s*\{[^}]*?"name"\s*:\s*"([^"]+)"',
)
# Ham HTML regex: indirim öncesi fiyat (originalPrice.value)
_ORIGINAL_PRICE_RE = re.compile(
    r'"originalPrice":\s*\{[^}]*?"value"\s*:\s*([\d.]+)',
)

# Seller adı için DOM fallback (Playwright path) — JSON-LD'de yok
_SEL_SELLER_NAME = (
    "[class*='merchant-name'], "
    "a.pb-merchant-link, a.merchant-link, "
    "[data-testid='seller-name'], "
    "a[href*='/magaza/'], a[href*='/sr?mid=']"
)

_DEFAULT_HEADERS = {
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "tr-TR,tr;q=0.9,en;q=0.8",
    "Cache-Control": "no-cache",
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
    ),
}


class TrendyolScraper(BaseScraper):
    platform = "trendyol"

    async def scrape(self, url: str) -> ProductData | None:
        """
        Önce HTML+JSON-LD (httpx ile hızlı). Başarısız olursa Playwright fallback.
        """
        try:
            html_result = await self._scrape_via_html(url)
            if html_result is not None:
                logger.info(
                    "[trendyol] HTML başarılı: %s → %s",
                    url,
                    html_result.title[:40],
                )
                return html_result
        except Exception as exc:  # noqa: BLE001 — geniş yakala, fallback'e düş
            logger.info(
                "[trendyol] HTML başarısız (%s), Playwright deneniyor", exc
            )

        return await super().scrape(url)

    async def _scrape_via_html(self, url: str) -> ProductData | None:
        """www.trendyol.com sayfasını çek, JSON-LD'den ProductData üret."""
        async with httpx.AsyncClient(
            timeout=_HTML_TIMEOUT_SEC, follow_redirects=True
        ) as client:
            resp = await client.get(url, headers=_DEFAULT_HEADERS)
            if resp.status_code != 200:
                logger.debug("[trendyol] HTML status %d: %s", resp.status_code, url)
                return None
            html = resp.text

        # Anti-bot challenge tespiti
        if _looks_like_challenge(html):
            logger.debug("[trendyol] challenge sayfası tespit edildi")
            return None

        product_jsonld = _find_product_jsonld(html)
        if product_jsonld is None:
            logger.debug("[trendyol] HTML'de Product JSON-LD bulunamadı")
            return None

        title = self._get_str(product_jsonld, "name")
        if not title:
            return None

        price_current = self._extract_price(product_jsonld)
        if price_current is None:
            return None

        # İndirim öncesi fiyat — ham HTML regex
        price_original: float | None = None
        m = _ORIGINAL_PRICE_RE.search(html)
        if m:
            try:
                candidate = float(m.group(1))
                # originalPrice ya da sellingPrice == price_current ise indirim yok
                if candidate > price_current:
                    price_original = candidate
            except ValueError:
                pass

        discount_pct: float | None = None
        if price_original is not None and price_original > price_current:
            discount_pct = round((1 - price_current / price_original) * 100, 1)

        images = self._extract_images(product_jsonld)
        description = self._get_str(product_jsonld, "description")[:1500]
        rating_avg, review_count = self._extract_rating(product_jsonld)
        reviews = self._extract_reviews(product_jsonld)

        # Merchant adı — ham HTML regex
        seller_name = ""
        seller_match = _MERCHANT_NAME_RE.search(html)
        if seller_match:
            seller_name = seller_match.group(1).strip()
        if not seller_name:
            # Fallback: brand
            brand = product_jsonld.get("brand")
            if isinstance(brand, dict):
                seller_name = self._get_str(brand, "name")
        if not seller_name:
            seller_name = "Trendyol satıcısı"

        return ProductData(
            url=url,
            platform="trendyol",
            title=title,
            price_current=price_current,
            price_original=price_original,
            discount_pct=discount_pct,
            images=images[:10],
            description=description,
            seller=SellerData(name=seller_name, is_verified=False),
            reviews=reviews,
            review_count_total=review_count,
            rating_avg=rating_avg,
            urgency_indicators=[],
            raw_html=None,
            scraped_at=datetime.now(UTC),
        )

    async def _parse(self, page: Page, url: str) -> ProductData:
        # Playwright fallback yolu — HTML başarısız olursa devreye girer
        try:
            await page.wait_for_selector("h1", timeout=10_000)
        except Exception:  # noqa: BLE001
            pass

        product_json = await self._extract_product_jsonld(page)
        if product_json is None:
            raise ScraperError("Ürün JSON-LD bulunamadı (sayfa beklenmeyen yapıda)")

        title = self._get_str(product_json, "name")
        if not title:
            raise ScraperError("JSON-LD'de ürün başlığı yok")

        price_current = self._extract_price(product_json)
        if price_current is None:
            raise ScraperError("JSON-LD'de geçerli fiyat yok")

        images = self._extract_images(product_json)
        description = self._get_str(product_json, "description")[:1500]
        rating_avg, review_count = self._extract_rating(product_json)
        reviews = self._extract_reviews(product_json)
        seller = await self._extract_seller(page)

        return ProductData(
            url=url,
            platform="trendyol",
            title=title,
            price_current=price_current,
            price_original=None,
            discount_pct=None,
            images=images[:10],
            description=description,
            seller=seller,
            reviews=reviews,
            review_count_total=review_count,
            rating_avg=rating_avg,
            urgency_indicators=[],
            raw_html=None,
            scraped_at=datetime.now(UTC),
        )

    # -----------------------------------------------------------------------
    # JSON-LD extraction (Playwright DOM)
    # -----------------------------------------------------------------------

    async def _extract_product_jsonld(self, page: Page) -> dict[str, Any] | None:
        """Sayfadaki ilk Product tipindeki JSON-LD bloğunu döner."""
        try:
            blocks = await page.locator('script[type="application/ld+json"]').all_inner_texts()
        except Exception as exc:  # noqa: BLE001
            logger.debug("JSON-LD locator hatası: %s", exc)
            return None

        for raw in blocks:
            parsed = _safe_loads(raw)
            if parsed is None:
                continue
            found = _walk_for_product(parsed)
            if found is not None:
                return found
        return None

    @staticmethod
    def _get_str(d: dict[str, Any], key: str) -> str:
        v = d.get(key)
        if isinstance(v, str):
            return v.strip()
        return ""

    @staticmethod
    def _extract_price(d: dict[str, Any]) -> float | None:
        offers = d.get("offers")
        if isinstance(offers, list):
            offers = offers[0] if offers else None
        if not isinstance(offers, dict):
            return None
        raw = offers.get("price") or offers.get("lowPrice")
        if raw is None:
            return None
        try:
            value = float(raw)
        except (TypeError, ValueError):
            return None
        if value < 1:
            return None
        return value

    @staticmethod
    def _extract_images(d: dict[str, Any]) -> list[str]:
        image = d.get("image")
        urls: list[str] = []

        def add(u: Any) -> None:
            if isinstance(u, str) and u.startswith("http"):
                if u not in urls:
                    urls.append(u)

        if isinstance(image, str):
            add(image)
        elif isinstance(image, dict):
            content = image.get("contentUrl")
            if isinstance(content, list):
                for u in content:
                    add(u)
            else:
                add(content)
            add(image.get("url"))
        elif isinstance(image, list):
            for entry in image:
                if isinstance(entry, str):
                    add(entry)
                elif isinstance(entry, dict):
                    add(entry.get("url") or entry.get("contentUrl"))
        return urls

    @staticmethod
    def _extract_rating(d: dict[str, Any]) -> tuple[float, int]:
        ar = d.get("aggregateRating")
        if not isinstance(ar, dict):
            return 0.0, 0
        try:
            rating = float(ar.get("ratingValue", 0) or 0)
        except (TypeError, ValueError):
            rating = 0.0
        count = ar.get("ratingCount") or ar.get("reviewCount") or 0
        try:
            count_int = int(count)
        except (TypeError, ValueError):
            count_int = 0
        return rating, count_int

    @staticmethod
    def _extract_reviews(d: dict[str, Any]) -> list[ReviewData]:
        raw = d.get("review")
        if not isinstance(raw, list):
            return []
        out: list[ReviewData] = []
        for entry in raw[:50]:
            if not isinstance(entry, dict):
                continue
            body = entry.get("reviewBody") or entry.get("description") or ""
            if not isinstance(body, str) or not body.strip():
                continue
            author = entry.get("author")
            author_name: str | None = None
            if isinstance(author, dict):
                author_name = author.get("name")
            elif isinstance(author, str):
                author_name = author
            rating_val = 5
            rr = entry.get("reviewRating")
            if isinstance(rr, dict):
                try:
                    rating_val = int(float(rr.get("ratingValue", 5)))
                except (TypeError, ValueError):
                    rating_val = 5
            date_str = entry.get("datePublished")
            date_val: datetime | None = None
            if isinstance(date_str, str):
                try:
                    date_val = datetime.fromisoformat(date_str.replace("Z", "+00:00"))
                except ValueError:
                    date_val = None
            out.append(
                ReviewData(
                    text=body.strip()[:500],
                    rating=max(1, min(5, rating_val)),
                    author_name=author_name,
                    date=date_val,
                    has_image=False,
                    verified_purchase=False,
                )
            )
        return out

    # -----------------------------------------------------------------------
    # Seller — JSON-LD'de yok, DOM'dan (Playwright path)
    # -----------------------------------------------------------------------

    async def _extract_seller(self, page: Page) -> SellerData:
        name = ""
        try:
            locator = page.locator(_SEL_SELLER_NAME).first
            if await locator.count() > 0:
                name = (await locator.inner_text(timeout=3_000)).strip()
        except Exception:  # noqa: BLE001
            pass
        if not name:
            name = "Trendyol satıcısı (DOM'dan okunamadı)"
        return SellerData(
            name=name,
            age_days=None,
            total_products=None,
            rating=None,
            rating_count=None,
            is_verified=False,
        )


# ---------------------------------------------------------------------------
# Module-level helpers — Hepsiburada/N11 scraper'ları DOM fallback'te paylaşır.
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


# Türkçe formatlı binlik ayırıcılı sayılar (1.899,00) ya da düz sayılar.
_MONEY_RE = re.compile(r"(\d{1,3}(?:[.\s]\d{3})+(?:,\d{1,2})?|\d+(?:,\d{1,2})?)")
_MIN_PRICE = 50.0  # KDV, rating gibi küçük sayıları fiyat olarak alma


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


# ---------------------------------------------------------------------------
# HTML JSON-LD helpers (TASK-S15: public-mdc kaldırıldı, HTML birincil oldu)
# ---------------------------------------------------------------------------

def _extract_product_id(url: str) -> str | None:
    """URL'deki '-p-{id}' pattern'inden product_id çıkar. (Hâlâ public diagnostik için kullanılıyor)"""
    match = _PRODUCT_ID_RE.search(url)
    return match.group(1) if match else None


_CHALLENGE_MARKERS = (
    "just a moment",
    "checking your browser",
    "captcha",
    "access denied",
    "hepsiburada | güvenlik",
)


def _looks_like_challenge(html: str) -> bool:
    """Cloudflare / Datadome / Akamai challenge sayfası tespiti (case-insensitive)."""
    head = html[:3000].lower()
    return any(marker in head for marker in _CHALLENGE_MARKERS)


def _safe_loads(raw: str) -> Any:
    try:
        return json.loads(raw.strip())
    except json.JSONDecodeError:
        return None


def _walk_for_product(obj: Any) -> dict[str, Any] | None:
    """Bir JSON-LD bloğu içinde @type='Product' olan dict'i bul."""
    if isinstance(obj, dict):
        if obj.get("@type") == "Product":
            return obj
        graph = obj.get("@graph")
        if isinstance(graph, list):
            for item in graph:
                found = _walk_for_product(item)
                if found is not None:
                    return found
    elif isinstance(obj, list):
        for item in obj:
            found = _walk_for_product(item)
            if found is not None:
                return found
    return None


def _find_product_jsonld(html: str) -> dict[str, Any] | None:
    """HTML içindeki tüm <script type=ld+json> bloklarından ilk Product'ı döner."""
    for match in _JSONLD_RE.finditer(html):
        parsed = _safe_loads(match.group(1))
        if parsed is None:
            continue
        found = _walk_for_product(parsed)
        if found is not None:
            return found
    return None
