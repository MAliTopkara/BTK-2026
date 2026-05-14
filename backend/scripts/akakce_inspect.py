"""
Akakçe + Cimri DOM tanı — TASK-29
Arama URL → ilk sonuç → ürün sayfası → fiyat geçmişi.

Kullanım:
    uv run python scripts/akakce_inspect.py "Apple AirPods Pro 2"
"""

from __future__ import annotations

import asyncio
import logging
import sys
from pathlib import Path
from urllib.parse import quote_plus

logging.basicConfig(level=logging.INFO, format="%(message)s")


async def inspect_akakce(query: str) -> None:
    from playwright.async_api import async_playwright

    search_url = f"https://www.akakce.com/arama/?q={quote_plus(query)}"
    print(f"\n🌐 SEARCH URL: {search_url}\n")

    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=True,
            args=["--disable-blink-features=AutomationControlled", "--no-sandbox"],
        )
        try:
            context = await browser.new_context(
                user_agent="Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
                viewport={"width": 1440, "height": 900},
                locale="tr-TR",
            )
            page = await context.new_page()
            await page.add_init_script(
                "Object.defineProperty(navigator, 'webdriver', { get: () => undefined });"
            )

            # Search
            resp = await page.goto(search_url, timeout=30_000, wait_until="domcontentloaded")
            print(f"Search HTTP: {resp.status if resp else 'no-response'}")
            print(f"Title: {await page.title()}")

            # İlk ürün linki
            print("\n=== İlk 3 ürün ===")
            for sel in [
                "a.iC.pa_lk",
                "a[class*='product']",
                "ul#APL > li > a",
                "a.lc",
            ]:
                count = await page.locator(sel).count()
                if count > 0:
                    print(f"  {sel:30}  count={count}")
                    for i in range(min(3, count)):
                        href = await page.locator(sel).nth(i).get_attribute("href")
                        if href:
                            print(f"    [{i}] {href}")
                    break

            # OG meta
            og_url = await page.locator('meta[property="og:url"]').first.get_attribute("content")
            print(f"\nOG URL: {og_url}")

            # Search HTML dump
            search_html = await page.content()
            search_dump = Path(__file__).parent / "_akakce_search_dump.html"
            search_dump.write_text(search_html, encoding="utf-8")
            print(f"Search HTML → {search_dump} ({len(search_html):,} chars)")

            # Tüm internal linklerin örneği (ilk 15)
            print("\n=== Tüm <a href> içeren ilk 15 internal link ===")
            links = await page.evaluate(
                """
                () => Array.from(document.querySelectorAll('a[href]'))
                    .map(a => a.getAttribute('href'))
                    .filter(h => h && !h.startsWith('http') && !h.startsWith('#') && !h.startsWith('mailto'))
                    .slice(0, 15)
                """
            )
            for li in links:
                print(f"  {li}")

            # İlk gerçek ürün linkine git — Akakçe ürün URL şeması:
            # /<kategori>/en-ucuz-...-fiyati,<digit>.html
            first_link = None
            for sel in [
                'a[href*="-fiyati,"][href*=".html"]',
                'a[href*="/en-ucuz-"]',
                'h3 a',
                '.lp_t > a',
            ]:
                count = await page.locator(sel).count()
                if count > 0:
                    first_link = await page.locator(sel).first.get_attribute("href", timeout=5000)
                    if first_link:
                        print(f"\nİlk link selector hit: {sel} → {first_link}")
                        break
            if first_link:
                if first_link.startswith("/"):
                    first_link = "https://www.akakce.com" + first_link
                print(f"\n🌐 PRODUCT URL: {first_link}\n")
                await page.goto(first_link, timeout=30_000, wait_until="domcontentloaded")
                await page.wait_for_load_state("networkidle", timeout=10_000)

                print(f"Title: {await page.title()}")
                print("\n=== Fiyat / geçmiş kutuları ===")
                # Fiyat container'ları
                for sel in [
                    "#price_v",
                    "#price",
                    ".pr_v",
                    "[class*='price' i]",
                    "[class*='history' i]",
                    "[class*='gecmis' i]",
                    "#price_history",
                    "g[id*='priceChart']",
                    "svg",
                ]:
                    count = await page.locator(sel).count()
                    if count > 0:
                        try:
                            sample = (await page.locator(sel).first.inner_text(timeout=2000))[:120]
                        except Exception:
                            sample = "(no text)"
                        print(f"  {sel:30}  count={count}  sample={sample!r}")

                # JS state'i yakala — Akakçe genelde inline JS'te tutar
                print("\n=== window'da fiyat geçmişi tutan değişkenler ===")
                state = await page.evaluate(
                    """
                    () => {
                        const keys = Object.keys(window).filter(k =>
                            /price|history|chart|gecmis|fiyat/i.test(k) &&
                            !k.startsWith('webkit') && !k.startsWith('navigation')
                        );
                        return keys.slice(0, 20);
                    }
                    """
                )
                print(f"  window vars: {state}")

                # Inline JSON script tagları
                print("\n=== Script tagların içeriği (ilk 200 char) ===")
                scripts = await page.evaluate(
                    """
                    () => {
                        return Array.from(document.querySelectorAll('script'))
                            .map(s => (s.textContent || '').trim())
                            .filter(t => /price|history|chart|fiyat/i.test(t))
                            .slice(0, 5)
                            .map(t => t.slice(0, 250));
                    }
                    """
                )
                for i, sc in enumerate(scripts):
                    print(f"  [{i}] {sc}")

                # Dump
                html = await page.content()
                out = Path(__file__).parent / "_akakce_product_dump.html"
                out.write_text(html, encoding="utf-8")
                print(f"\nProduct HTML → {out} ({len(html):,} chars)")

        finally:
            await browser.close()


if __name__ == "__main__":
    query = sys.argv[1] if len(sys.argv) > 1 else "Apple AirPods Pro 2"
    asyncio.run(inspect_akakce(query))
