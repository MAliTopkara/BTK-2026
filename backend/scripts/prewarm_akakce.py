"""
Akakçe pre-warm cache script — TrustLens AI

NEDEN:
  Railway IP'leri Akakçe tarafından bloklanıyor (403). Demo öncesinde lokal
  TR IP'den Akakçe sorguları yapılır, sonuçlar `backend/data/akakce_cache.json`
  dosyasına yazılır. Backend `fetch_akakce_summary` çağrıldığında önce bu
  cache'i kontrol eder — hit olursa scrape'e hiç girmez.

KULLANIM:
  cd backend
  uv run python scripts/prewarm_akakce.py

  # Sonuç: backend/data/akakce_cache.json güncellenir, git'e commit edilir,
  # Railway deploy sırasında repo ile birlikte gider.

QUERY LİSTESİ:
  Pre-warm edilmiş scan URL'lerinden çıkartılabilecek ürün başlıkları + birkaç
  popüler ek. CrossPlatform agent Gemini ile core query üretiyor, biz da
  benzer şekilde manuel olarak yazıyoruz. Cache normalize edilmiş query ile
  eşleştiği için ufak yazım farkları sorun değil.
"""

from __future__ import annotations

import asyncio
import sys

# Repo root'tan paketleri import edebilelim
sys.path.insert(0, str(__import__("pathlib").Path(__file__).resolve().parents[1]))

from app.services.akakce import (  # noqa: E402
    fetch_akakce_summary,
    save_to_cache,
)

# (query, reference_price) — reference_price aksesuar/farklı varyantları filtreler
QUERIES: list[tuple[str, float | None]] = [
    # ── Cached gerçek scan URL'leri ──
    ("Apple iPhone 15 256 GB Mavi", 54000),
    ("Apple iPhone 15 256 GB", 54000),
    ("JBL Tune 520BT", 800),
    ("JBL Tune 520BT Kablosuz Kulaklık", 800),
    ("Vestel 32 inç HD Smart TV", 7000),
    ("Vestel 32HT9150 Smart TV", 7000),
    ("SEG 40 inç Smart TV", 9000),
    ("SEG 40SRB900 Smart TV", 9000),
    # ── Demo mock senaryoları ──
    ("Apple AirPods Pro 2. Nesil", 5500),
    ("Apple AirPods Pro 2nd Generation USB-C", 5500),
    ("Casio G-Shock GA-2100", 3000),
    ("Casio G-Shock GA-2100-1AER", 3000),
    ("Xiaomi RedmiBook Pro 15", 30000),
    # ── Kullanıcının test ettiği gerçek URL ──
    ("TECHNOMEN Akıllı Saat", 900),
    ("Akıllı Saat Türkçe Menülü", 900),
    # ── Popüler ekstra (jüri rastgele URL deneyebilir) ──
    ("Apple iPhone 15", 50000),
    ("Apple iPhone 15 Pro", 75000),
    ("Samsung Galaxy S24", 40000),
    ("Apple AirPods Pro", 5500),
]


async def main() -> None:
    success = 0
    fail = 0

    for query, ref_price in QUERIES:
        diag: dict = {}
        print(f"\n>>> {query!r} (ref={ref_price})")
        try:
            result = await fetch_akakce_summary(
                query, reference_price=ref_price, diagnostics=diag
            )
        except Exception as exc:  # noqa: BLE001
            print(f"    [ERROR] {type(exc).__name__}: {exc}")
            fail += 1
            continue

        if result is None:
            print(f"    [MISS] fail_reason={diag.get('fail_reason', 'unknown')}")
            fail += 1
            continue

        save_to_cache(query, result)
        print(
            f"    [OK]   {result.seller_count} satıcı | min={result.min_price:.0f} | "
            f"max={result.max_price:.0f} | avg={result.avg_price:.0f}"
        )
        print(f"           {result.product_url}")
        success += 1

        # Akakçe'ye nazik ol — sorgular arasında rastgele bekleme
        await asyncio.sleep(2.5)

    print("\n========================================")
    print(f"Pre-warm tamamlandı: {success} başarılı, {fail} başarısız")
    print("Cache: backend/data/akakce_cache.json")


if __name__ == "__main__":
    asyncio.run(main())
