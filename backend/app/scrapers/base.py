"""
BaseScraper — TrustLens AI
TASK-28: Platform agnostik scraper iskeleti. Playwright async, UA rotation,
retry + mock fallback. Tek bir async with bloku yeterli.

Türev: TrendyolScraper, HepsiburadaScraper (TASK-28 plan B).
"""

from __future__ import annotations

import asyncio
import logging
import random
from abc import ABC, abstractmethod
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from playwright.async_api import Browser, BrowserContext, Page

from app.models.scan import ProductData

logger = logging.getLogger(__name__)

# Gerçek tarayıcı User-Agent'ları — Chromium varsayılanı bot olarak işaretlenir
_USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
]

_VIEWPORTS = [
    {"width": 1920, "height": 1080},
    {"width": 1440, "height": 900},
    {"width": 1536, "height": 864},
]

_NAV_TIMEOUT_MS = 30_000
_MAX_RETRIES = 2


class ScraperError(Exception):
    """Scraper özel hatası — anti-bot, timeout, parse hataları."""


class ScraperNotFound(ScraperError):
    """Sayfa yok (404/410). Retry yapılmaz, doğrudan fallback'a düşer."""


class BaseScraper(ABC):
    platform: str  # "trendyol", "hepsiburada", ...

    @abstractmethod
    async def _parse(self, page: Page, url: str) -> ProductData:
        """
        Playwright page'inden ProductData üret. Türev sınıfların doldurması zorunlu.
        Hata fırlatırsa retry tetiklenir.
        """

    async def scrape(self, url: str) -> ProductData | None:
        """
        URL'yi MAX_RETRIES kere dene, başarısızsa None döner.
        None dönerse caller mock_data fallback'i kullanır.
        """
        last_exc: Exception | None = None

        for attempt in range(_MAX_RETRIES):
            try:
                return await self._scrape_once(url)
            except ScraperNotFound as exc:
                # 404/410 — sayfa yok, retry anlamsız
                logger.info("[%s] sayfa bulunamadı, fallback denenecek: %s", self.platform, exc)
                return None
            except Exception as exc:  # noqa: BLE001 — Playwright çeşitli exception fırlatır
                last_exc = exc
                wait = 1.5 * (2**attempt) + random.uniform(0, 0.5)
                logger.warning(
                    "[%s] scrape başarısız (deneme %d/%d): %s — %.1fs bekleniyor",
                    self.platform,
                    attempt + 1,
                    _MAX_RETRIES,
                    exc,
                    wait,
                )
                if attempt < _MAX_RETRIES - 1:
                    await asyncio.sleep(wait)

        logger.error(
            "[%s] %d denemede başarısız, fallback'a düşülüyor. Son hata: %s",
            self.platform,
            _MAX_RETRIES,
            last_exc,
        )
        return None

    async def _scrape_once(self, url: str) -> ProductData:
        """Tek bir Playwright tarayıcı oturumuyla scrape eder."""
        # Import burada — Playwright opsiyonel runtime, modül seviyesinde import edersek
        # test ortamında olmayan kurulumlarda hata verir
        from playwright.async_api import async_playwright  # noqa: PLC0415

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
                context = await self._build_context(browser)
                page = await context.new_page()
                await self._stealth_init(page)

                logger.info("[%s] sayfa açılıyor: %s", self.platform, url)
                response = await page.goto(
                    url,
                    timeout=_NAV_TIMEOUT_MS,
                    wait_until="domcontentloaded",
                )

                if response is None:
                    raise ScraperError("Sayfa açılamadı: response yok")
                if response.status in (404, 410):
                    raise ScraperNotFound(f"Sayfa yok: HTTP {response.status}")
                if response.status >= 400:
                    raise ScraperError(f"Sayfa açılamadı: HTTP {response.status}")

                # Anti-bot challenge kontrolü
                if await self._is_challenge_page(page):
                    raise ScraperError("Anti-bot challenge tespit edildi")

                return await self._parse(page, url)
            finally:
                await browser.close()

    async def _build_context(self, browser: Browser) -> BrowserContext:
        """Rastgele UA + viewport ile context oluştur."""
        return await browser.new_context(
            user_agent=random.choice(_USER_AGENTS),
            viewport=random.choice(_VIEWPORTS),
            locale="tr-TR",
            timezone_id="Europe/Istanbul",
            extra_http_headers={
                "Accept-Language": "tr-TR,tr;q=0.9,en;q=0.8",
            },
        )

    async def _stealth_init(self, page: Page) -> None:
        """Headless detection bypass — navigator.webdriver, plugins, languages."""
        await page.add_init_script(
            """
            Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
            Object.defineProperty(navigator, 'languages', { get: () => ['tr-TR', 'tr', 'en'] });
            Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
            """
        )

    async def _is_challenge_page(self, page: Page) -> bool:
        """Cloudflare / Datadome benzeri challenge sayfası tespiti."""
        try:
            title = (await page.title()).lower()
            if any(
                marker in title
                for marker in ("just a moment", "checking your browser", "captcha", "access denied")
            ):
                return True
        except Exception:
            pass
        return False
