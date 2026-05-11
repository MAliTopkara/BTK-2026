"""
Cache Service testleri — TASK-26
Redis cache get/set/invalidate senaryoları.
Mock ile test edilir — gerçek Redis bağlantısı yok.
"""

from __future__ import annotations

from datetime import UTC, datetime
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

import pytest

from app.models.scan import LayerResult, ProductData, ScanResult, SellerData
from app.services import cache

# ---------------------------------------------------------------------------
# Fixture: dummy ScanResult
# ---------------------------------------------------------------------------

def _dummy_scan_result() -> ScanResult:
    product = ProductData(
        url="https://www.trendyol.com/test",
        platform="trendyol",
        title="Test Ürün",
        price_current=100.0,
        seller=SellerData(name="Test Satıcı"),
        scraped_at=datetime.now(UTC),
    )
    return ScanResult(
        scan_id=uuid4(),
        url="https://www.trendyol.com/test",
        product=product,
        overall_score=75,
        verdict="BUY",
        layer_results={
            "review": LayerResult(layer_id="review", name="Review", status="OK", score=80, finding="OK"),
        },
        final_explanation="Test açıklaması",
        duration_ms=1000,
        created_at=datetime.now(UTC),
    )


# ---------------------------------------------------------------------------
# Test 1 — Miss: cache boşken get → None
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_cache_miss_returns_none() -> None:
    """Cache'de veri yokken get_scan None döner."""
    with patch("app.services.cache._get_client") as mock_factory:
        client = AsyncMock()
        client.get.return_value = None
        mock_factory.return_value = client

        result = await cache.get_scan("https://www.trendyol.com/test")

        assert result is None
        client.get.assert_called_once()


# ---------------------------------------------------------------------------
# Test 2 — Round trip: set + get
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_cache_set_get_roundtrip() -> None:
    """set_scan + get_scan aynı veriyi döner."""
    storage: dict[str, str] = {}

    async def fake_setex(key: str, ttl: int, value: str) -> None:
        storage[key] = value

    async def fake_get(key: str) -> str | None:
        return storage.get(key)

    with patch("app.services.cache._get_client") as mock_factory:
        client = MagicMock()
        client.setex = fake_setex
        client.get = fake_get
        client.aclose = AsyncMock()
        mock_factory.return_value = client

        scan = _dummy_scan_result()
        url = scan.url

        await cache.set_scan(url, scan)
        result = await cache.get_scan(url)

    assert result is not None
    assert result.overall_score == scan.overall_score
    assert result.verdict == scan.verdict
    assert str(result.scan_id) == str(scan.scan_id)


# ---------------------------------------------------------------------------
# Test 3 — Invalidate: set → invalidate → get → None
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_cache_invalidate() -> None:
    """invalidate_scan sonrası get_scan None döner."""
    storage: dict[str, str] = {}

    async def fake_setex(key: str, ttl: int, value: str) -> None:
        storage[key] = value

    async def fake_get(key: str) -> str | None:
        return storage.get(key)

    async def fake_delete(key: str) -> None:
        storage.pop(key, None)

    with patch("app.services.cache._get_client") as mock_factory:
        client = MagicMock()
        client.setex = fake_setex
        client.get = fake_get
        client.delete = fake_delete
        client.aclose = AsyncMock()
        mock_factory.return_value = client

        scan = _dummy_scan_result()
        url = scan.url

        await cache.set_scan(url, scan)
        await cache.invalidate_scan(url)
        result = await cache.get_scan(url)

    assert result is None


# ---------------------------------------------------------------------------
# Test 4 — Graceful degradation: Redis hatası → None döner
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_cache_graceful_degradation_on_error() -> None:
    """Redis bağlantı hatası olsa bile get_scan None döner, exception fırlatmaz."""
    with patch("app.services.cache._get_client") as mock_factory:
        mock_factory.side_effect = ConnectionError("Redis bağlanamadı")

        result = await cache.get_scan("https://www.trendyol.com/test")

        assert result is None


# ---------------------------------------------------------------------------
# Test 5 — URL normalize: farklı formatlarda aynı key üretilir
# ---------------------------------------------------------------------------

def test_cache_key_normalization() -> None:
    """Büyük harf ve query string farkı key'i etkilemez."""
    from app.services.cache import _cache_key

    key1 = _cache_key("https://www.Trendyol.com/test?ref=123")
    key2 = _cache_key("https://www.trendyol.com/test")
    key3 = _cache_key("HTTPS://WWW.TRENDYOL.COM/TEST/")

    assert key1 == key2 == key3
    assert key1.startswith("scan:v1:")
