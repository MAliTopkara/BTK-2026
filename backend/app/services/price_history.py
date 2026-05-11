"""
Fiyat geçmişi servisi — TrustLens AI
TASK-11: Mock-based başlangıç.
TASK-29: Akakçe entegrasyonu + Redis cache (24h TTL) + mock fallback.

Akış:
  1. Cache check (Redis, 24h TTL, key=sha256(title) prefix'i)
  2. Akakçe: arama → ilk ürün → satıcı fiyatları → sentetik 3 noktalık history
  3. Mock fallback (mock_data/price_histories.json — demo URL'leri için)
  4. None döner (DiscountAgent INFO/WARN üretir)
"""

from __future__ import annotations

import hashlib
import json
import logging
from dataclasses import dataclass
from datetime import date, datetime, timedelta
from pathlib import Path

import redis.asyncio as aioredis

from app.config import settings
from app.services.akakce import fetch_akakce_summary, synthesize_history
from mock_data.loader import match_url_to_mock

logger = logging.getLogger(__name__)

_MOCK_FILE = Path(__file__).parent.parent.parent / "mock_data" / "price_histories.json"
_HISTORY_DAYS = 90
_CACHE_TTL_SEC = 86_400  # 24 saat


@dataclass
class PricePoint:
    date: date
    price: float


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

async def get_price_history(
    url: str,
    title: str | None = None,
    current_price: float | None = None,
) -> list[PricePoint] | None:
    """
    Ürün için 90 günlük fiyat geçmişi.

    Args:
        url: Ürün URL'i (cache key + mock match için)
        title: Akakçe araması için ürün başlığı (yoksa Akakçe atlanır)
        current_price: Bugünkü scrape fiyatı (sentetik history son nokta için)

    Returns:
        PricePoint listesi (eskiden yeniye) ya da None
    """
    # 1) Cache hit?
    cached = await _cache_get(url)
    if cached is not None:
        logger.info("[price_history] cache hit: %s", url)
        return cached

    # 2) Akakçe
    if title and current_price:
        akakce_points = await _from_akakce(title, current_price)
        if akakce_points:
            await _cache_set(url, akakce_points)
            return akakce_points

    # 3) Mock fallback (demo URL eşleşmesi)
    mock_points = _from_mock(url)
    if mock_points:
        # Mock'u da cache'liyoruz — Akakçe sonradan ayağa kalkarsa overwrite olur
        await _cache_set(url, mock_points)
        return mock_points

    logger.info("[price_history] hiçbir kaynak veri vermedi: %s", url)
    return None


# ---------------------------------------------------------------------------
# Kaynaklar
# ---------------------------------------------------------------------------

async def _from_akakce(title: str, current_price: float) -> list[PricePoint] | None:
    """Akakçe scraper → synthetic 3 noktalık history."""
    try:
        result = await fetch_akakce_summary(title, reference_price=current_price)
    except Exception as exc:  # noqa: BLE001 — Playwright çeşitli exception fırlatır
        logger.warning("[price_history] Akakçe scrape hatası: %s", exc)
        return None

    if result is None:
        return None

    logger.info(
        "[price_history] Akakçe: %d satıcı, min=%.2f max=%.2f avg=%.2f",
        result.seller_count, result.min_price, result.max_price, result.avg_price,
    )
    return [
        PricePoint(date=d, price=p)
        for d, p in synthesize_history(result, current_price, days=_HISTORY_DAYS)
    ]


def _from_mock(url: str) -> list[PricePoint] | None:
    """mock_data/price_histories.json'dan demo URL eşleşmesi."""
    mock_name = match_url_to_mock(url)
    if not mock_name:
        return None

    try:
        raw = json.loads(_MOCK_FILE.read_text(encoding="utf-8"))
        history_data = raw.get(mock_name, {}).get("history", [])
    except (FileNotFoundError, json.JSONDecodeError) as exc:
        logger.error("[price_history] Mock yüklenemedi: %s", exc)
        return None

    cutoff = datetime.now().date() - timedelta(days=_HISTORY_DAYS)
    points = [
        PricePoint(date=date.fromisoformat(e["date"]), price=float(e["price"]))
        for e in history_data
        if date.fromisoformat(e["date"]) >= cutoff
    ]
    return sorted(points, key=lambda p: p.date) if points else None


# ---------------------------------------------------------------------------
# Redis cache — graceful degradation
# ---------------------------------------------------------------------------

def _cache_key(url: str) -> str:
    normalized = url.lower().split("?")[0].rstrip("/")
    return f"pricehist:v1:{hashlib.sha256(normalized.encode()).hexdigest()[:16]}"


async def _cache_get(url: str) -> list[PricePoint] | None:
    try:
        client = aioredis.from_url(settings.redis_url, decode_responses=True)
        data = await client.get(_cache_key(url))
        await client.aclose()
        if not data:
            return None
        raw = json.loads(data)
        return [PricePoint(date=date.fromisoformat(p["date"]), price=float(p["price"])) for p in raw]
    except Exception as exc:  # noqa: BLE001
        logger.debug("[price_history] cache get hatası (graceful): %s", exc)
        return None


async def _cache_set(url: str, points: list[PricePoint]) -> None:
    try:
        payload = json.dumps(
            [{"date": p.date.isoformat(), "price": p.price} for p in points]
        )
        client = aioredis.from_url(settings.redis_url, decode_responses=True)
        await client.setex(_cache_key(url), _CACHE_TTL_SEC, payload)
        await client.aclose()
    except Exception as exc:  # noqa: BLE001
        logger.debug("[price_history] cache set hatası (graceful): %s", exc)
