"""
BaseAgent abstract class testleri — TrustLens AI
TASK-08: Normal, error ve abstract enforcement senaryoları.
"""

from __future__ import annotations

from datetime import UTC, datetime

import pytest

from app.agents.base import BaseAgent
from app.models.scan import LayerResult, ProductData, SellerData

# ---------------------------------------------------------------------------
# Test fixtures
# ---------------------------------------------------------------------------

def _dummy_product() -> ProductData:
    return ProductData(
        url="https://www.trendyol.com/test",
        platform="trendyol",
        title="Test Ürünü",
        price_current=100.0,
        seller=SellerData(name="Test Satıcı"),
        scraped_at=datetime.now(UTC),
    )


def _ok_result(layer_id: str, name: str) -> LayerResult:
    return LayerResult(
        layer_id=layer_id,
        name=name,
        status="OK",
        score=80,
        finding="Sorun yok",
    )


# ---------------------------------------------------------------------------
# Test 1 — Normal: Somut agent analyze() sonucunu döndürür
# ---------------------------------------------------------------------------

class _WorkingAgent(BaseAgent):
    layer_id = "test_layer"
    name = "Test Katmanı"

    async def analyze(self, product: ProductData) -> LayerResult:
        return _ok_result(self.layer_id, self.name)


@pytest.mark.asyncio
async def test_safe_analyze_success() -> None:
    agent = _WorkingAgent()
    product = _dummy_product()
    result = await agent.safe_analyze(product)

    assert result.layer_id == "test_layer"
    assert result.status == "OK"
    assert result.score == 80


# ---------------------------------------------------------------------------
# Test 2 — Error: analyze() hata fırlatınca safe_analyze INFO döndürür
# ---------------------------------------------------------------------------

class _BrokenAgent(BaseAgent):
    layer_id = "broken_layer"
    name = "Bozuk Katman"

    async def analyze(self, product: ProductData) -> LayerResult:
        raise ValueError("Scraping başarısız")


@pytest.mark.asyncio
async def test_safe_analyze_catches_exception() -> None:
    agent = _BrokenAgent()
    product = _dummy_product()
    result = await agent.safe_analyze(product)

    assert result.layer_id == "broken_layer"
    assert result.status == "INFO"
    assert result.score is None
    assert result.confidence == 0.0
    assert "Scraping başarısız" in result.details.get("error", "")


# ---------------------------------------------------------------------------
# Test 3 — Abstract enforcement: BaseAgent direkt instantiate edilemez
# ---------------------------------------------------------------------------

def test_base_agent_cannot_be_instantiated() -> None:
    with pytest.raises(TypeError):
        BaseAgent()  # type: ignore[abstract]
