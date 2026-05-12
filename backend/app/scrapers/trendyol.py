"""
TrendyolScraper — TrustLens AI

JSON-LD merkezli strateji:
  Trendyol her ürün sayfasında schema.org Product JSON-LD koyuyor (SEO için).
  Bu structured data DOM selector'lardan kat kat güvenilir çünkü:
    - Selectorlar (CSS Modules hash'leriyle) sık değişir
    - JSON-LD SEO için stable kalır
    - Aggregate rating + review listesi de orada hazır

Primary: <script type="application/ld+json"> Product objesi
Fallback: DOM selectorlar (seller adı için, JSON-LD'de yok)
"""

from __future__ import annotations

import json
import logging
import re
from datetime import UTC, datetime
from typing import TYPE_CHECKING, Any

if TYPE_CHECKING:
    from playwright.async_api import Page

from app.models.scan import ProductData, ReviewData, SellerData
from app.scrapers.base import BaseScraper, ScraperError

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
