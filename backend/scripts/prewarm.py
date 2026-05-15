"""
TrustLens AI — Pre-warm Cache Script

Demo öncesi Türkiye IP'li bir makineden Railway prod API'sine bir liste URL
POST ederek her tarama sonucu Redis cache'e yazılır. Demo sırasında jüri o
URL'leri girince anlık (cached) sonuç alır.

Kullanım (backend klasöründen):
    uv run python scripts/prewarm.py

    # Lokal backend'e karşı test:
    uv run python scripts/prewarm.py --api http://localhost:8000

    # Cache'i taze tutmak yerine sadece var/yok doğrulamak için:
    uv run python scripts/prewarm.py --no-refresh

Çıktı: terminal özeti + scripts/prewarm_results.json
"""

from __future__ import annotations

import argparse
import asyncio
import json
import sys
from datetime import UTC, datetime
from pathlib import Path

import httpx

DEFAULT_API = "https://btk-2026-production.up.railway.app"
DEFAULT_INPUT = Path(__file__).parent / "prewarm_urls.txt"
DEFAULT_OUTPUT = Path(__file__).parent / "prewarm_results.json"
DEFAULT_CONCURRENCY = 2
DEFAULT_TIMEOUT = 150.0  # Tarama 30-90 sn sürer; Playwright fallback yavaş


async def warm_one(
    client: httpx.AsyncClient,
    url: str,
    api_base: str,
    force_refresh: bool,
) -> dict:
    """Tek URL'i prod API'ye gönderir, özet sonuç döndürür."""
    payload = {"url": url, "force_refresh": force_refresh}
    started = datetime.now(UTC)
    try:
        resp = await client.post(f"{api_base}/api/scan", json=payload)
    except httpx.RequestError as exc:
        return {
            "url": url,
            "ok": False,
            "stage": "request",
            "error": f"{type(exc).__name__}: {exc!s}",
        }

    elapsed = (datetime.now(UTC) - started).total_seconds()
    if resp.status_code != 200:
        try:
            detail = resp.json().get("detail", resp.text[:300])
        except Exception:  # noqa: BLE001
            detail = resp.text[:300]
        return {
            "url": url,
            "ok": False,
            "stage": "http",
            "status": resp.status_code,
            "error": detail,
            "elapsed_s": round(elapsed, 1),
        }

    data = resp.json()
    product = data.get("product") or {}
    return {
        "url": url,
        "ok": True,
        "scan_id": data.get("scan_id"),
        "title": (product.get("title") or "")[:80],
        "platform": product.get("platform"),
        "price": product.get("price_current"),
        "score": data.get("overall_score"),
        "verdict": data.get("verdict"),
        "cached_at": data.get("cached_at"),
        "elapsed_s": round(elapsed, 1),
    }


async def run(
    urls: list[str],
    api_base: str,
    concurrency: int,
    timeout: float,
    force_refresh: bool,
) -> list[dict]:
    """Tüm URL'leri concurrency limiti ile paralel ısıtır."""
    sem = asyncio.Semaphore(concurrency)

    async with httpx.AsyncClient(timeout=timeout) as client:

        async def _bounded(url: str, idx: int) -> dict:
            async with sem:
                print(f"[{idx:>2}/{len(urls)}] >> {url[:80]}", flush=True)
                r = await warm_one(client, url, api_base, force_refresh)
                tag = "OK " if r.get("ok") else "FAIL"
                if r.get("ok"):
                    summary = f"{r['verdict']} {r['score']}/100 — {r['title'][:50]}"
                else:
                    summary = (r.get("error") or "")[:120]
                print(
                    f"[{idx:>2}/{len(urls)}] {tag} {r.get('elapsed_s', '?')}s — {summary}",
                    flush=True,
                )
                return r

        return await asyncio.gather(
            *(_bounded(u, i + 1) for i, u in enumerate(urls)),
        )


def load_urls(path: Path) -> list[str]:
    """Her satırı bir URL olarak okur. # ile başlayan satırlar yorum."""
    if not path.exists():
        print(f"HATA: URL listesi bulunamadı: {path}", file=sys.stderr)
        sys.exit(2)
    urls = [
        ln.strip()
        for ln in path.read_text(encoding="utf-8").splitlines()
        if ln.strip() and not ln.strip().startswith("#")
    ]
    if not urls:
        print(f"HATA: {path} dosyası boş.", file=sys.stderr)
        sys.exit(2)
    return urls


def print_summary(results: list[dict]) -> int:
    """Özet tablo basar, başarısız sayısını döndürür."""
    ok = [r for r in results if r.get("ok")]
    bad = [r for r in results if not r.get("ok")]

    print()
    print("=" * 72)
    print(f"OZET: {len(ok)} basarili, {len(bad)} basarisiz (toplam {len(results)})")
    print("=" * 72)

    if ok:
        print()
        print("CACHE'LENDI:")
        print(f"   {'verdict':<8} {'skor':>7}  {'platform':<12} baslik")
        print(f"   {'-' * 7:<8} {'-' * 6:>7}  {'-' * 11:<12} {'-' * 50}")
        for r in ok:
            print(
                f"   {r['verdict']:<8} {r['score']:>3}/100  "
                f"{(r.get('platform') or '?'):<12} {r['title']}"
            )

    if bad:
        print()
        print("BASARISIZ (cache'e yazilmadi):")
        for r in bad:
            stage = r.get("stage", "?")
            status = r.get("status", "")
            err = (r.get("error") or "")[:100]
            print(f"   [{stage} {status}] {r['url'][:60]}")
            print(f"      -> {err}")

    return len(bad)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--api", default=DEFAULT_API, help="API base URL")
    parser.add_argument("--input", type=Path, default=DEFAULT_INPUT)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument(
        "--concurrency",
        type=int,
        default=DEFAULT_CONCURRENCY,
        help="Aynı anda paralel istek (Railway'i boğmamak için <=3)",
    )
    parser.add_argument("--timeout", type=float, default=DEFAULT_TIMEOUT)
    parser.add_argument(
        "--no-refresh",
        action="store_true",
        help="force_refresh kapali: cache varsa kullan, yoksa taze tara",
    )
    args = parser.parse_args()

    urls = load_urls(args.input)
    refresh_mode = (
        "force_refresh KAPALI (cache hit kontrolu)"
        if args.no_refresh
        else "force_refresh ACIK (taze tarama)"
    )
    print(f"Pre-warm: {len(urls)} URL -> {args.api}")
    print(f"   {refresh_mode} | paralel={args.concurrency} | timeout={args.timeout}s")
    print()

    results = asyncio.run(
        run(
            urls=urls,
            api_base=args.api.rstrip("/"),
            concurrency=args.concurrency,
            timeout=args.timeout,
            force_refresh=not args.no_refresh,
        )
    )

    fail_count = print_summary(results)

    args.output.write_text(
        json.dumps(
            {
                "ran_at": datetime.now(UTC).isoformat(),
                "api": args.api,
                "force_refresh": not args.no_refresh,
                "results": results,
            },
            indent=2,
            ensure_ascii=False,
        ),
        encoding="utf-8",
    )
    print()
    print(f"Sonuc dosyasi: {args.output}")

    return 1 if fail_count else 0


if __name__ == "__main__":
    sys.exit(main())
