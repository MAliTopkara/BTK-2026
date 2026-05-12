"""
Redis Cache Service — TrustLens AI
TASK-26: Scan sonuçlarını TTL-based Redis cache'de saklar.

Key format : scan:v1:{sha256(normalized_url)[:16]}
Graceful degradation : Redis bağlantı hatası → None döner, uygulama çalışmaya devam eder.
"""

from __future__ import annotations

import hashlib
import logging
from typing import TYPE_CHECKING

import redis.asyncio as aioredis

from app.config import settings

if TYPE_CHECKING:
    from app.models.scan import ScanResult

logger = logging.getLogger(__name__)

_TTL_DEFAULT: int = 86400  # 24 saat


# ---------------------------------------------------------------------------
# Yardımcılar
# ---------------------------------------------------------------------------

def _cache_key(url: str) -> str:
    """URL'i normalize edip deterministik cache anahtarı üretir.

    - Lowercase
    - Query string sökülür
    - Trailing slash kaldırılır

    NOT: v2 prefix'i — v1 cache'inde sahte mock-fallback verisi vardı (kullanıcı
    404 URL'i için bile uydurma ürün görüyordu). Prefix yükseltilerek hepsi
    erişilemez yapıldı; 24 saatte TTL ile temizlenir.
    """
    normalized = url.lower().split("?")[0].rstrip("/")
    url_hash = hashlib.sha256(normalized.encode()).hexdigest()[:16]
    return f"scan:v2:{url_hash}"


def _get_client() -> aioredis.Redis:
    return aioredis.from_url(settings.redis_url, decode_responses=True)


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

async def get_scan(url: str) -> ScanResult | None:
    """Cache'den ScanResult yükler.

    Returns:
        ScanResult ya da None (miss veya hata durumunda).
    """
    from app.models.scan import ScanResult  # noqa: PLC0415

    key = _cache_key(url)
    try:
        client = _get_client()
        data: str | None = await client.get(key)
        await client.aclose()
        if data is None:
            return None
        return ScanResult.model_validate_json(data)
    except Exception as exc:
        logger.warning("Cache get hatası (graceful degradation): %s", exc)
        return None


async def set_scan(url: str, scan: ScanResult, ttl_sec: int = _TTL_DEFAULT) -> None:
    """ScanResult'i cache'e yazar. Hata olursa sessizce geçer."""
    key = _cache_key(url)
    try:
        client = _get_client()
        await client.setex(key, ttl_sec, scan.model_dump_json())
        await client.aclose()
        logger.info("Cache yazıldı: %s (TTL=%ds)", key, ttl_sec)
    except Exception as exc:
        logger.warning("Cache set hatası (graceful degradation): %s", exc)


async def invalidate_scan(url: str) -> None:
    """Cache'den URL sonucunu siler. Hata olursa sessizce geçer."""
    key = _cache_key(url)
    try:
        client = _get_client()
        await client.delete(key)
        await client.aclose()
        logger.info("Cache geçersizleştirildi: %s", key)
    except Exception as exc:
        logger.warning("Cache invalidate hatası (graceful degradation): %s", exc)
