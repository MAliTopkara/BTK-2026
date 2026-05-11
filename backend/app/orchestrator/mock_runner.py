"""
Mock Scan Runner — TrustLens AI
TASK-13: LangGraph (#25) gelene kadar agent'ları asyncio.gather ile çalıştırır.
TASK-24: Decision Agent entegre edildi."""

from __future__ import annotations

import asyncio
import logging
from datetime import UTC, datetime
from uuid import uuid4

from app.agents.crossplatform_agent import CrossPlatformAgent
from app.agents.decision_agent import run_decision
from app.agents.discount_agent import DiscountAgent
from app.agents.manipulation_agent import ManipulationAgent
from app.agents.review_agent import ReviewAgent
from app.agents.seller_agent import SellerAgent
from app.agents.visual_agent import VisualAgent
from app.models.scan import Alternative, LayerResult, ScanResult
from mock_data.loader import match_url_to_mock

logger = logging.getLogger(__name__)

# PROJECT.md'deki ağırlıklar — eksik katmanlar normalize edilir
_WEIGHTS: dict[str, float] = {
    "review": 0.20,
    "discount": 0.20,
    "manipulation": 0.10,
    "seller": 0.15,
    "visual": 0.20,
    "crossplatform": 0.05,
    "phishing": 0.10,
}

# Phishing agent normal scan'de pasif (POST /api/scan/phishing ayrı endpoint).
# Diğer 6 katman ağırlıklı skora dahil edilir.
_AGENTS = [
    ReviewAgent(),
    DiscountAgent(),
    ManipulationAgent(),
    SellerAgent(),
    VisualAgent(),
    CrossPlatformAgent(),
]


async def run_mock_scan(url: str) -> ScanResult:
    """
    URL'e göre mock ProductData yükler, 4 agent paralel çalıştırır.

    Raises:
        ValueError: URL hiçbir mock senaryoya eşleşmiyorsa
    """
    from mock_data.loader import load_mock  # noqa: PLC0415

    mock_name = match_url_to_mock(url)
    if not mock_name:
        raise ValueError(
            f"URL hiçbir demo senaryoya eşleşmiyor: {url}\n"
            "Demo URL'leri: trendyol.com/apple-airpods, trendyol.com/casio, hepsiburada.com/xiaomi-laptop"
        )

    product = load_mock(mock_name)

    import time
    start = time.monotonic()

    layer_results_list = await asyncio.gather(
        *[agent.safe_analyze(product) for agent in _AGENTS]
    )

    duration_ms = int((time.monotonic() - start) * 1000)
    layer_results = {r.layer_id: r for r in layer_results_list}

    # TASK-24: Decision Agent — ağırlıklı skor + Gemini reasoning
    overall_score, verdict, reasoning_steps, final_explanation = await run_decision(
        layer_results
    )

    # Crossplatform katmanından alternatif önerisi çıkar
    alternative = _extract_alternative(layer_results)

    return ScanResult(
        scan_id=uuid4(),
        url=url,
        product=product,
        overall_score=overall_score,
        verdict=verdict,
        layer_results=layer_results,
        reasoning_steps=reasoning_steps,
        final_explanation=final_explanation,
        alternative=alternative,
        duration_ms=duration_ms,
        created_at=datetime.now(UTC),
    )


def _extract_alternative(layer_results: dict[str, LayerResult]) -> Alternative | None:
    """Crossplatform katmanı details'inden Alternative objesi çıkarır."""
    cp = layer_results.get("crossplatform")
    if cp is None or cp.status != "INFO":
        return None
    alt_data = cp.details.get("alternative")
    if not isinstance(alt_data, dict):
        return None
    try:
        return Alternative(**alt_data)
    except Exception:
        return None
