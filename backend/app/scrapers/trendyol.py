"""
TrendyolScraper — TrustLens AI

İki katmanlı strateji:
  1. Public API (öncelikli): https://public-mdc.trendyol.com/.../product-detail/{id}
     - Anti-bot yok (Cloudflare/Datadome arkasında değil)
     - Railway IP'lerinden erişilebiliyor
     - JSON yapılı, hızlı (<1 saniye)
  2. Playwright + JSON-LD (fallback): public API başarısızsa
     - schema.org Product JSON-LD (SEO için stable)
     - DOM fallback sadece seller adı için
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

# Public API endpoint — anti-bot yok, JSON döner
_API_URL_TEMPLATE = (
    "https://public-mdc.trendyol.com/discovery-web-productgw-service"
    "/api/product-detail/{product_id}"
)
_API_TIMEOUT_SEC = 10.0
# URL pattern: ".../urun-adi-p-123456789" → product_id = "123456789"
_PRODUCT_ID_RE = re.compile(r"-p-(\d+)")

logger = logging.getLogger(__name__)

# Seller adı için DOM fallback — JSON-LD'de yok
_SEL_SELLER_NAME = (
    "[class*='merchant-name'], "
    "a.pb-merchant-link, a.merchant-link, "
    "[data-testid='seller-name'], "
    "a[href*='/magaza/'], a[href*='/sr?mid=']"
)


class TrendyolScraper(BaseScraper):
    platform = "trendyol"

    async def scrape(self, url: str) -> ProductData | None:
        """
        Önce public API'yi dene (hızlı, anti-bot yok). Başarısız olursa
        BaseScraper.scrape() (Playwright + JSON-LD) fallback'ine düşer.
        """
        product_id = _extract_product_id(url)
        if product_id:
            try:
                api_result = await self._scrape_via_api(url, product_id)
                if api_result is not None:
                    logger.info(
                        "[trendyol] public API başarılı: id=%s url=%s",
                        product_id,
                        url,
                    )
                    return api_result
            except Exception as exc:  # noqa: BLE001 — geniş yakala, fallback'e düş
                logger.info(
                    "[trendyol] public API başarısız (%s), Playwright deneniyor",
                    exc,
                )
        else:
            logger.debug("[trendyol] product_id URL'de bulunamadı, Playwright deneniyor: %s", url)

        return await super().scrape(url)

    async def _scrape_via_api(self, url: str, product_id: str) -> ProductData | None:
        """Trendyol public product-detail API'sinden ProductData üret."""
        api_url = _API_URL_TEMPLATE.format(product_id=product_id)
        headers = {
            "Accept": "application/json",
            "Accept-Language": "tr-TR,tr;q=0.9,en;q=0.8",
            "User-Agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                "(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
            ),
        }

        async with httpx.AsyncClient(
            timeout=_API_TIMEOUT_SEC, follow_redirects=True
        ) as client:
            resp = await client.get(api_url, headers=headers)
            resp.raise_for_status()
            data = resp.json()

        return _product_from_api(data, url)

    async def _parse(self, page: Page, url: str) -> ProductData:
        # H1 görünür olmasını bekle — JSON-LD bundan önce zaten DOM'da olur
        try:
            await page.wait_for_selector("h1", timeout=10_000)
        except Exception:  # noqa: BLE001
            # h1 yoksa muhtemelen challenge / yanlış sayfa
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
            price_original=None,  # JSON-LD'de "üstü çizili" fiyat yok
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
    # JSON-LD extraction
    # -----------------------------------------------------------------------

    async def _extract_product_jsonld(self, page: Page) -> dict[str, Any] | None:
        """Sayfadaki ilk Product tipindeki JSON-LD bloğunu döner."""
        try:
            blocks = await page.locator('script[type="application/ld+json"]').all_inner_texts()
        except Exception as exc:  # noqa: BLE001
            logger.debug("JSON-LD locator hatası: %s", exc)
            return None

        for raw in blocks:
            try:
                data = json.loads(raw)
            except json.JSONDecodeError:
                continue
            # Schema.org tek obje veya graph dizisi olabilir
            candidates = data if isinstance(data, list) else [data]
            if "@graph" in data:
                candidates = data["@graph"]
            for item in candidates:
                if isinstance(item, dict) and item.get("@type") == "Product":
                    return item
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
        if not isinstance(offers, dict):
            return None
        raw = offers.get("price")
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
        # reviewCount yazılı yorum sayısı, ratingCount toplam puan veren sayısı — ikincisini tercih
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
    # Seller — JSON-LD'de yok, DOM'dan
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
# Module-level helpers — Hepsiburada scraper bunları kullanıyor (DOM fallback yolu).
# Trendyol artık JSON-LD merkezli olduğu için kendi içinde çağırmıyor ama
# diğer scraper'lar shared parser olarak kullanıyor.
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
# `+` ile en az 1 binlik grup zorunlu — yoksa 1899'u 189 + 9 olarak parçalamasın.
_MONEY_RE = re.compile(r"(\d{1,3}(?:[.\s]\d{3})+(?:,\d{1,2})?|\d+(?:,\d{1,2})?)")
_MIN_PRICE = 50.0  # KDV (%18), rating (4.5) gibi küçük sayıları fiyat olarak alma


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
# Public API helpers (TASK-S9)
# ---------------------------------------------------------------------------

def _extract_product_id(url: str) -> str | None:
    """URL'deki '-p-{id}' pattern'inden product_id çıkar."""
    match = _PRODUCT_ID_RE.search(url)
    return match.group(1) if match else None


def _safe_float(v: Any) -> float | None:
    if v is None:
        return None
    try:
        return float(v)
    except (TypeError, ValueError):
        return None


def _safe_int(v: Any) -> int | None:
    if v is None:
        return None
    try:
        return int(v)
    except (TypeError, ValueError):
        return None


def _product_from_api(data: dict[str, Any], url: str) -> ProductData | None:
    """
    Trendyol public API JSON yanıtından ProductData üret.
    Beklenen yapı eksikse None döner — caller Playwright fallback'e düşer.
    """
    result = data.get("result")
    if not isinstance(result, dict):
        return None

    product = result.get("product")
    if not isinstance(product, dict):
        return None

    name = product.get("name")
    if not isinstance(name, str) or not name.strip():
        return None

    price_info = product.get("priceInfo")
    if not isinstance(price_info, dict):
        price_info = {}

    price_current = _safe_float(price_info.get("price"))
    if price_current is None or price_current < 1:
        return None

    price_original = _safe_float(price_info.get("originalPrice"))
    discount_pct: float | None = None
    if price_original is not None and price_original > price_current:
        discount_pct = round((1 - price_current / price_original) * 100, 1)

    # Görseller
    images: list[str] = []
    images_raw = product.get("images") or []
    if isinstance(images_raw, list):
        for img in images_raw[:10]:
            url_str: str | None = None
            if isinstance(img, dict):
                candidate = img.get("url") or img.get("imageUrl") or img.get("contentUrl")
                if isinstance(candidate, str):
                    url_str = candidate
            elif isinstance(img, str):
                url_str = img
            if url_str and url_str.startswith("http") and url_str not in images:
                images.append(url_str)

    # Rating
    rating_score = product.get("ratingScore")
    if not isinstance(rating_score, dict):
        rating_score = {}
    rating_avg = _safe_float(rating_score.get("averageRating")) or 0.0
    review_count = (
        _safe_int(rating_score.get("totalRatingCount"))
        or _safe_int(rating_score.get("totalCount"))
        or 0
    )

    # Satıcı: önce merchant, fallback brand
    seller_name = ""
    merchant = product.get("merchant")
    if isinstance(merchant, dict):
        candidate = merchant.get("name")
        if isinstance(candidate, str):
            seller_name = candidate.strip()
    if not seller_name:
        brand = product.get("brand")
        if isinstance(brand, dict):
            candidate = brand.get("name")
            if isinstance(candidate, str):
                seller_name = candidate.strip()
    if not seller_name:
        seller_name = "Trendyol satıcısı"

    description_raw = product.get("description")
    description = description_raw[:1500] if isinstance(description_raw, str) else ""

    return ProductData(
        url=url,
        platform="trendyol",
        title=name.strip(),
        price_current=price_current,
        price_original=price_original,
        discount_pct=discount_pct,
        images=images,
        description=description,
        seller=SellerData(name=seller_name, is_verified=False),
        reviews=[],  # Public API yorum listesi sağlamıyor — review_agent <20 yorum için INFO döner
        review_count_total=review_count,
        rating_avg=rating_avg,
        urgency_indicators=[],
        raw_html=None,
        scraped_at=datetime.now(UTC),
    )
