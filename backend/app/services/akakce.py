"""
Akakçe servisi — TrustLens AI (TASK-29)

Akış: ürün başlığı → arama → ilk ürün sayfası → tüm satıcı fiyatları → min/max.

Akakçe fiyat geçmişi PNG olarak servis ediliyor (OCR yapmıyoruz). Bunun yerine
ürün sayfasındaki çok-satıcı fiyat listesini kullanıyoruz: bu liste de gerçek
bir "marketplace baseline"dır — aynı ürünün en ucuz/en pahalı listelenen fiyatı.

DiscountAgent için yeterli sinyal: synthetic 2 noktalık history
(eski=min, yeni=current) ile gerçek "true_discount_pct" hesaplanır.
"""

from __future__ import annotations

import logging
import re
from dataclasses import dataclass
from datetime import date, timedelta
from typing import TYPE_CHECKING
from urllib.parse import quote_plus

if TYPE_CHECKING:
    from playwright.async_api import Page

logger = logging.getLogger(__name__)

_AKAKCE_BASE = "https://www.akakce.com"
_NAV_TIMEOUT_MS = 25_000
_PRICE_LIMIT = 30  # ilk N fiyatı işle, daha fazlasını gözardı et

# Stable selector — Akakçe arama sonuçları ürün URL şeması: /<kat>/en-ucuz-...-fiyati,<id>.html
_SEL_PRODUCT_LINK = 'a[href*="-fiyati,"][href*=".html"]'
# Ürün sayfasındaki tüm satıcı fiyatları — pt_v8 her satırda görünür
_SEL_PRICES = "span.pt_v8"

# Akakçe sayı formatı: "13.162" → 13162.0  (binlik nokta, kuruş gizli)
# Bazen "<i>,99</i>" da olur, onu da yakalamamız iyi.
# `+` (en az 1 binlik grup) ile "12097" gibi prefix'siz sayılar yanlış parse
# olmasın (12.097 vs 12097 — Akakçe'de hep nokta var ama defansif kalalım).
_PRICE_RE = re.compile(r"(\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?|\d+(?:,\d{1,2})?)")


@dataclass
class AkakceResult:
    product_url: str
    seller_count: int
    min_price: float
    max_price: float
    avg_price: float


# Akakçe ürün sayfaları bazen aksesuar/farklı varyantları da listeler.
# Scrape edilen current_price varsa, ondan çok uzak fiyatları "noise" sayarız.
_NOISE_FLOOR_RATIO = 0.4   # current'ın %40'ından düşük → muhtemelen aksesuar
_NOISE_CEIL_RATIO = 2.5    # current'ın %250'sinden yüksek → muhtemelen üst model/paket


async def fetch_akakce_summary(
    query: str,
    reference_price: float | None = None,
) -> AkakceResult | None:
    """
    Verilen ürün adı için Akakçe arama → ilk ürün → satıcı fiyat istatistikleri.

    Args:
        query: Ürün başlığı (arama metni)
        reference_price: Scrape edilen current_price. Verilirse alakasız satıcı
            listings'leri (aksesuar, farklı varyant) bu noktaya göre filtrelenir.

    Returns:
        AkakceResult ya da None (eşleşme yok, sayfa açılmadı, vb.)
    """
    from playwright.async_api import async_playwright  # noqa: PLC0415

    search_url = f"{_AKAKCE_BASE}/arama/?q={quote_plus(query)}"
    logger.info("[akakce] arama: %s", search_url)

    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=True,
            args=[
                "--disable-blink-features=AutomationControlled",
                "--no-sandbox",
                "--disable-dev-shm-usage",
            ],
        )
        try:
            context = await browser.new_context(
                user_agent=(
                    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
                    "(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
                ),
                viewport={"width": 1440, "height": 900},
                locale="tr-TR",
            )
            page = await context.new_page()
            await page.add_init_script(
                "Object.defineProperty(navigator, 'webdriver', { get: () => undefined });"
            )

            # 1) Arama sayfası
            resp = await page.goto(search_url, timeout=_NAV_TIMEOUT_MS, wait_until="domcontentloaded")
            if resp is None or resp.status >= 400:
                logger.warning("[akakce] arama HTTP başarısız: %s", resp.status if resp else "no-resp")
                return None

            # 2) İlk ürün linki
            product_path = await _first_product_url(page)
            if not product_path:
                logger.info("[akakce] arama sonucu boş: %s", query)
                return None

            product_url = (
                product_path
                if product_path.startswith("http")
                else _AKAKCE_BASE + product_path
            )
            logger.info("[akakce] ürün sayfası: %s", product_url)

            # 3) Ürün sayfası
            resp = await page.goto(product_url, timeout=_NAV_TIMEOUT_MS, wait_until="domcontentloaded")
            if resp is None or resp.status >= 400:
                logger.warning("[akakce] ürün sayfası HTTP başarısız")
                return None

            # 4) Satıcı fiyatlarını topla
            prices = await _collect_seller_prices(page)
            if not prices:
                logger.info("[akakce] satıcı fiyatı bulunamadı: %s", product_url)
                return None

            # 5) Reference price varsa aksesuar/varyant noise'unu temizle
            cleaned = _denoise_prices(prices, reference_price)
            if not cleaned:
                logger.info(
                    "[akakce] denoise sonrası fiyat kalmadı (ref=%s, raw=%s)",
                    reference_price, prices[:5],
                )
                return None

            return AkakceResult(
                product_url=product_url,
                seller_count=len(cleaned),
                min_price=min(cleaned),
                max_price=max(cleaned),
                avg_price=sum(cleaned) / len(cleaned),
            )
        finally:
            await browser.close()


async def _first_product_url(page: Page) -> str | None:
    """Arama sonuç sayfasındaki ilk ürün linkini döner."""
    try:
        locator = page.locator(_SEL_PRODUCT_LINK).first
        if await locator.count() == 0:
            return None
        return await locator.get_attribute("href", timeout=5_000)
    except Exception as exc:
        logger.debug("[akakce] ilk link alınamadı: %s", exc)
        return None


async def _collect_seller_prices(page: Page) -> list[float]:
    """Ürün sayfasındaki tüm pt_v8 fiyat etiketlerinden sayıları çıkarır."""
    try:
        await page.wait_for_selector(_SEL_PRICES, timeout=8_000)
    except Exception:
        return []

    texts = await page.locator(_SEL_PRICES).all_inner_texts()
    prices: list[float] = []
    for text in texts[:_PRICE_LIMIT]:
        value = _parse_price(text)
        if value is not None and value >= 10:   # 10 TL altı şüpheli
            prices.append(value)
    return prices


def _denoise_prices(prices: list[float], reference: float | None) -> list[float]:
    """
    Reference varsa aksesuar/varyant fiyatlarını filtrele.
    Reference yoksa olduğu gibi döner.
    """
    if reference is None or reference <= 0:
        return prices
    floor = reference * _NOISE_FLOOR_RATIO
    ceil = reference * _NOISE_CEIL_RATIO
    filtered = [p for p in prices if floor <= p <= ceil]
    # Filtre çok agresifse (>%70 fiyatı atarsa) muhtemelen reference yanlış,
    # ham listeye geri dön.
    if len(filtered) < max(2, len(prices) // 3):
        return prices
    return filtered


def _parse_price(text: str) -> float | None:
    """
    Akakçe pt_v8 metnini float'a çevirir.
    "13.162"      → 13162.0
    "13.162,99"   → 13162.99
    "5.399,00 TL" → 5399.0
    """
    cleaned = text.replace("\n", " ").strip()
    match = _PRICE_RE.search(cleaned)
    if not match:
        return None
    raw = match.group(1)
    # Türkçe format: nokta = binlik, virgül = ondalık
    if "," in raw:
        normalized = raw.replace(".", "").replace(",", ".")
    else:
        # Sadece binlik nokta → tam sayı
        normalized = raw.replace(".", "")
    try:
        return float(normalized)
    except ValueError:
        return None


# ---------------------------------------------------------------------------
# Synthetic price history yardımcısı
# ---------------------------------------------------------------------------

def synthesize_history(
    akakce: AkakceResult,
    current_price: float,
    days: int = 90,
) -> list[tuple[date, float]]:
    """
    Akakçe min'inden sentetik 2 noktalık history:
      - 90 gün öncesi: akakce.min_price (gerçek en ucuz baseline)
      - bugün: current_price (Trendyol/Hepsiburada scrape fiyatı)

    Bu 2 noktalı yapı DiscountAgent için yeterli:
      - baseline = min (pump-free referans)
      - mid=1, old_avg = baseline, recent_peak = current
      - current > baseline * 1.15 → "diğer satıcıda %15+ daha ucuz" sinyali

    Sentetik avg noktası eklemiyoruz; zaman ekseni gerçek değil, false-positive
    pump tespitine yol açıyor.
    """
    today = date.today()
    return [
        (today - timedelta(days=days), akakce.min_price),
        (today, current_price),
    ]
