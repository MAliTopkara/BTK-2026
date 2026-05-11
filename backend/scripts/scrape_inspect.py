"""
Debug script — Trendyol sayfasının fiyat alanlarını bul.
Selectorları doğrulamak için.
"""

from __future__ import annotations

import asyncio
import logging
import sys
from pathlib import Path

logging.basicConfig(level=logging.INFO, format="%(message)s")


async def inspect(url: str) -> None:
    from playwright.async_api import async_playwright

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
            await page.goto(url, timeout=30_000, wait_until="domcontentloaded")
            await page.wait_for_load_state("networkidle", timeout=15_000)

            print("\n=== TITLE ===")
            print(await page.title())

            print("\n=== H1s ===")
            for i in range(await page.locator("h1").count()):
                t = await page.locator("h1").nth(i).inner_text(timeout=2000)
                print(f"  [{i}] {t[:120]}")

            print("\n=== Fiyat içeren elementler ===")
            # 'TL' içeren visible text'leri ara
            results = await page.evaluate(
                """
                () => {
                    const out = [];
                    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
                    let node;
                    while ((node = walker.nextNode())) {
                        const txt = node.textContent.trim();
                        if (!txt || txt.length > 60) continue;
                        if (/TL\\b|₺/.test(txt)) {
                            const el = node.parentElement;
                            if (!el) continue;
                            out.push({
                                text: txt,
                                tag: el.tagName.toLowerCase(),
                                cls: el.className?.toString().slice(0, 80) || '',
                                id: el.id || '',
                            });
                        }
                    }
                    return out.slice(0, 25);
                }
                """
            )
            for r in results:
                print(f"  <{r['tag']} class='{r['cls']}' id='{r['id']}'>  {r['text']}")

            print("\n=== Olası fiyat container'ları ===")
            for sel in [
                "[class*='price' i]",
                "[class*='Price']",
                "[data-testid*='price' i]",
                "div.product-price-container",
                "span.prc-dsc",
                "span.prc-org",
                "span.prc-slg",
                ".pr-bx-pr",
            ]:
                count = await page.locator(sel).count()
                if count > 0:
                    sample = await page.locator(sel).first.inner_text(timeout=2000)
                    print(f"  {sel:50}  count={count}  sample={sample[:60]!r}")

            # HTML sample - ürün başlığını içeren bölümü kaydet
            html = await page.content()
            out_file = Path(__file__).parent / "_trendyol_dump.html"
            out_file.write_text(html, encoding="utf-8")
            print(f"\nFull HTML saved → {out_file} ({len(html):,} chars)")

        finally:
            await browser.close()


if __name__ == "__main__":
    url = sys.argv[1] if len(sys.argv) > 1 else "https://www.trendyol.com/"
    asyncio.run(inspect(url))
