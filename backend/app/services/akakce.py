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

import json
import logging
import random
import re
import unicodedata
from dataclasses import asdict, dataclass
from datetime import date, timedelta
from pathlib import Path
from typing import TYPE_CHECKING
from urllib.parse import quote_plus

if TYPE_CHECKING:
    from playwright.async_api import Page

logger = logging.getLogger(__name__)

_AKAKCE_BASE = "https://www.akakce.com"
_NAV_TIMEOUT_MS = 25_000
_PRICE_LIMIT = 30  # ilk N fiyatı işle, daha fazlasını gözardı et

# ─── Pre-warm dosya cache (Mayıs 2026) ──────────────────────────────────────
# Railway IP'leri Akakçe tarafından bloklanıyor (403). Lokal TR IP'den
# `scripts/prewarm_akakce.py` çalıştırılıp sonuçlar bu JSON'a yazılıyor; backend
# scrape'den önce burayı kontrol eder. Cache hit → 0 sn, scrape gerek yok.
_CACHE_FILE = Path(__file__).resolve().parents[2] / "data" / "akakce_cache.json"

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


# ─── File cache yardımcıları ────────────────────────────────────────────────

def _normalize_query(query: str) -> str:
    """
    Cache key için query'i normalize et:
    lowercase + diakritik kaldır + non-alnum → space + tek boşluk.
    "Apple iPhone 15 256 GB Mavi" ve "apple iphone 15 256gb mavi" aynı key olur.
    """
    text = unicodedata.normalize("NFKD", query.lower())
    text = "".join(c for c in text if not unicodedata.combining(c))
    text = re.sub(r"[^a-z0-9]+", " ", text)
    return " ".join(text.split())


def _load_cache() -> dict[str, dict]:
    """Akakçe cache JSON'unu oku; yoksa boş dict döner."""
    try:
        if not _CACHE_FILE.exists():
            return {}
        return json.loads(_CACHE_FILE.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        logger.warning("[akakce] cache okunamadı: %s", exc)
        return {}


def _parse_cache_entry(raw: dict) -> AkakceResult | None:
    """Cache'teki dict'i AkakceResult'a çevir; bozuksa None."""
    try:
        return AkakceResult(
            product_url=str(raw["product_url"]),
            seller_count=int(raw["seller_count"]),
            min_price=float(raw["min_price"]),
            max_price=float(raw["max_price"]),
            avg_price=float(raw["avg_price"]),
        )
    except (KeyError, TypeError, ValueError) as exc:
        logger.debug("[akakce] cache entry bozuk: %s", exc)
        return None


def _cache_lookup(query: str) -> AkakceResult | None:
    """
    Normalize edilmiş query ile cache'te eşleşme ara.

    Eşleşme stratejisi (sırayla):
      1. Tam match: normalize(query)
      2. Prefix shrink: query'nin ilk N kelimesini sırayla küçülterek dene.
         "jbl tune 520bt multi connect wireless blue" → cache'te yok
         → "jbl tune 520bt multi connect wireless" → yok
         → ... → "jbl tune 520bt" → BULDU (min 2 kelime).
      3. Substring match (son çare): herhangi bir cache key,
         normalize edilmiş query'de geçiyor mu.

    Bu sayede agent'ın Gemini ile ürettiği farklı uzunluktaki "core query"
    pre-warm'da kullanılan basit query ile eşleşir.
    """
    cache = _load_cache()
    if not cache:
        return None

    key = _normalize_query(query)
    if not key:
        return None

    # 1. Tam match
    raw = cache.get(key)
    if isinstance(raw, dict):
        result = _parse_cache_entry(raw)
        if result is not None:
            return result

    # 2. Prefix shrink — agent uzun query üretmiş olabilir
    words = key.split()
    if len(words) > 2:
        for i in range(len(words) - 1, 1, -1):
            prefix_key = " ".join(words[:i])
            raw = cache.get(prefix_key)
            if isinstance(raw, dict):
                result = _parse_cache_entry(raw)
                if result is not None:
                    logger.info(
                        "[akakce] prefix match: %r → %r", key, prefix_key
                    )
                    return result

    # 3. Substring match — agent pre-warm key'ini içeren bir query üretmiş olabilir
    for cache_key, cache_val in cache.items():
        if cache_key and cache_key in key and isinstance(cache_val, dict):
            result = _parse_cache_entry(cache_val)
            if result is not None:
                logger.info(
                    "[akakce] substring match: %r contains %r", key, cache_key
                )
                return result

    return None


def save_to_cache(query: str, result: AkakceResult) -> None:
    """
    Pre-warm script tarafından çağrılır — query+sonucu cache file'ına yazar.
    Backend'de kullanım için tasarlanmamış (Railway disk read-only).
    """
    _CACHE_FILE.parent.mkdir(parents=True, exist_ok=True)
    cache = _load_cache()
    cache[_normalize_query(query)] = asdict(result)
    _CACHE_FILE.write_text(
        json.dumps(cache, indent=2, ensure_ascii=False), encoding="utf-8"
    )
    logger.info("[akakce] cache yazıldı: %s -> %d satıcı", query, result.seller_count)


# Akakçe ürün sayfaları bazen aksesuar/farklı varyantları da listeler.
# Scrape edilen current_price varsa, ondan çok uzak fiyatları "noise" sayarız.
_NOISE_FLOOR_RATIO = 0.4   # current'ın %40'ından düşük → muhtemelen aksesuar
_NOISE_CEIL_RATIO = 2.5    # current'ın %250'sinden yüksek → muhtemelen üst model/paket


async def fetch_akakce_summary(
    query: str,
    reference_price: float | None = None,
    *,
    diagnostics: dict | None = None,
) -> AkakceResult | None:
    """
    Verilen ürün adı için Akakçe arama → ilk ürün → satıcı fiyat istatistikleri.

    Args:
        query: Ürün başlığı (arama metni)
        reference_price: Scrape edilen current_price. Verilirse alakasız satıcı
            listings'leri (aksesuar, farklı varyant) bu noktaya göre filtrelenir.
        diagnostics: Verilirse başarısızlık nedeni "fail_reason" key'ine yazılır.

    Returns:
        AkakceResult ya da None (eşleşme yok, sayfa açılmadı, vb.)
    """
    # ─── 1. File cache lookup (lokal pre-warm sonuçları) ──────────────────
    cached = _cache_lookup(query)
    if cached is not None:
        logger.info(
            "[akakce] cache hit: %s -> %d satıcı, min=%.0f",
            query, cached.seller_count, cached.min_price,
        )
        return cached

    # ─── 2. Cache miss — gerçek scrape ────────────────────────────────────
    from playwright.async_api import async_playwright  # noqa: PLC0415

    def _fail(reason: str) -> None:
        if diagnostics is not None:
            diagnostics["fail_reason"] = reason
        logger.info("[akakce] başarısız (%s): %s", reason, query)

    search_url = f"{_AKAKCE_BASE}/arama/?q={quote_plus(query)}"
    logger.info("[akakce] arama: %s", search_url)

    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=True,
            args=[
                "--disable-blink-features=AutomationControlled",
                "--no-sandbox",
                "--disable-dev-shm-usage",
                "--disable-features=IsolateOrigins,site-per-process",
            ],
        )
        try:
            context = await browser.new_context(
                # Windows UA — Linux datacenter UA Akakçe tarafından bot olarak işaretleniyor
                user_agent=(
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                    "(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
                ),
                viewport={"width": 1280, "height": 800},
                locale="tr-TR",
                timezone_id="Europe/Istanbul",
                extra_http_headers={
                    "Accept": (
                        "text/html,application/xhtml+xml,application/xml;"
                        "q=0.9,image/avif,image/webp,image/apng,*/*;"
                        "q=0.8,application/signed-exchange;v=b3;q=0.7"
                    ),
                    "Accept-Language": "tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7",
                    "Accept-Encoding": "gzip, deflate, br",
                    "Upgrade-Insecure-Requests": "1",
                    "Sec-Ch-Ua": '"Not_A Brand";v="8", "Chromium";v="131", "Google Chrome";v="131"',
                    "Sec-Ch-Ua-Mobile": "?0",
                    "Sec-Ch-Ua-Platform": '"Windows"',
                    "Sec-Fetch-Dest": "document",
                    "Sec-Fetch-Mode": "navigate",
                    "Sec-Fetch-Site": "none",
                    "Sec-Fetch-User": "?1",
                    "Cache-Control": "max-age=0",
                },
            )
            page = await context.new_page()
            await page.add_init_script("""
                Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
                Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
                Object.defineProperty(navigator, 'languages', {
                    get: () => ['tr-TR', 'tr', 'en-US', 'en']
                });
            """)

            # Ana sayfayı önce ziyaret et — cookie + session kur, insan benzeri pattern
            try:
                home_resp = await page.goto(
                    _AKAKCE_BASE, timeout=_NAV_TIMEOUT_MS, wait_until="domcontentloaded"
                )
                if home_resp and home_resp.status < 400:
                    await page.wait_for_timeout(random.randint(800, 1800))
                    # Cookie consent varsa kapat
                    try:
                        consent = page.locator(
                            'button:text("Kabul Et"), button:text("Kabul"), '
                            'button:text("Accept All"), button[id*="accept"]'
                        ).first
                        if await consent.count() > 0:
                            await consent.click(timeout=2_000)
                            await page.wait_for_timeout(400)
                    except Exception:  # noqa: BLE001
                        pass
            except Exception:  # noqa: BLE001
                pass  # Ana sayfa opsiyonel — başarısız olursa devam et

            # 1) Arama sayfası
            await page.wait_for_timeout(random.randint(300, 800))
            try:
                resp = await page.goto(search_url, timeout=_NAV_TIMEOUT_MS, wait_until="domcontentloaded")
            except Exception as exc:  # noqa: BLE001
                _fail(f"search_nav_exception:{type(exc).__name__}")
                return None
            if resp is None:
                _fail("search_no_response")
                return None
            if resp.status >= 400:
                _fail(f"search_http_{resp.status}")
                return None

            # 2) İlk ürün linki
            product_path = await _first_product_url(page)
            if not product_path:
                # Page title kontrol et — challenge mı yoksa empty result mı
                try:
                    page_title = (await page.title()).lower()
                except Exception:  # noqa: BLE001
                    page_title = ""
                if any(m in page_title for m in ("challenge", "captcha", "denied", "blocked", "robot")):
                    _fail(f"search_challenge:{page_title[:60]}")
                else:
                    _fail("search_no_product_link")
                return None

            product_url = (
                product_path
                if product_path.startswith("http")
                else _AKAKCE_BASE + product_path
            )
            logger.info("[akakce] ürün sayfası: %s", product_url)

            # 3) Ürün sayfası
            try:
                resp = await page.goto(product_url, timeout=_NAV_TIMEOUT_MS, wait_until="domcontentloaded")
            except Exception as exc:  # noqa: BLE001
                _fail(f"product_nav_exception:{type(exc).__name__}")
                return None
            if resp is None:
                _fail("product_no_response")
                return None
            if resp.status >= 400:
                _fail(f"product_http_{resp.status}")
                return None

            # 4) Satıcı fiyatlarını topla
            prices = await _collect_seller_prices(page)
            if not prices:
                _fail("no_seller_prices")
                return None

            # 5) Reference price varsa aksesuar/varyant noise'unu temizle
            cleaned = _denoise_prices(prices, reference_price)
            if not cleaned:
                _fail(f"denoise_empty:raw_count={len(prices)}")
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
