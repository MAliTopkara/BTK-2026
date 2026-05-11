"""
Manuel scraper smoke test — TASK-28
Kullanım:
    uv run python scripts/scrape_smoke.py "https://www.trendyol.com/..."

Çıktı: ProductData özetlemesi (title, fiyatlar, görsel sayısı, satıcı).
Hata durumunda exception fırlatır.
"""

from __future__ import annotations

import asyncio
import logging
import sys

from app.scrapers import detect_platform, get_scraper

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)


async def main(url: str) -> int:
    platform = detect_platform(url)
    if not platform:
        print(f"❌ Tanınmayan platform: {url}")
        return 1

    scraper = get_scraper(platform)
    if scraper is None:
        print(f"❌ Scraper bulunamadı: {platform}")
        return 1

    print(f"🌐 Platform: {platform}")
    print(f"🌐 URL: {url}")
    print("⏳ Tarayıcı başlatılıyor...\n")

    product = await scraper.scrape(url)
    if product is None:
        print("❌ Scrape başarısız (retry sonrası None)")
        return 2

    print("✅ Scrape başarılı\n")
    print(f"  title         : {product.title[:80]}")
    print(f"  price_current : {product.price_current:.2f} TL")
    print(f"  price_original: {product.price_original}")
    print(f"  discount_pct  : {product.discount_pct}")
    print(f"  images        : {len(product.images)} URL")
    if product.images:
        for img in product.images[:3]:
            print(f"                  {img[:90]}")
    print(f"  seller.name   : {product.seller.name}")
    print(f"  description   : {product.description[:120]}{'...' if len(product.description) > 120 else ''}")
    return 0


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Kullanım: uv run python scripts/scrape_smoke.py <URL>")
        sys.exit(64)
    exit_code = asyncio.run(main(sys.argv[1]))
    sys.exit(exit_code)
