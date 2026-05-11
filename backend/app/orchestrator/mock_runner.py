"""
Mock Scan Runner — TrustLens AI
TASK-13: Agent orchestration başlangıcı.
TASK-24: Decision Agent entegre edildi.
TASK-25: LangGraph graph runner'a çevrildi.
"""

from __future__ import annotations

import logging
import time
from datetime import UTC, datetime
from uuid import uuid4

from app.models.scan import Alternative, LayerResult, ScanResult
from app.orchestrator.graph import build_graph
from mock_data.loader import match_url_to_mock

logger = logging.getLogger(__name__)

# Graph instance — modül yüklenirken bir kez derlenir
_graph = build_graph()


async def run_mock_scan(url: str) -> ScanResult:
    """
    LangGraph workflow üzerinden tarama çalıştırır.

    Raises:
        ValueError: URL hiçbir mock senaryoya eşleşmiyorsa
    """
    # URL validasyonu — graph başlamadan erken hata
    if not match_url_to_mock(url):
        raise ValueError(
            f"URL hiçbir demo senaryoya eşleşmiyor: {url}\n"
            "Demo URL'leri: trendyol.com/apple-airpods, trendyol.com/casio, hepsiburada.com/xiaomi-laptop"
        )

    start = time.monotonic()

    final_state = await _graph.ainvoke({"url": url})

    duration_ms = int((time.monotonic() - start) * 1000)

    if final_state.get("error"):
        raise ValueError(final_state["error"])

    product = final_state["product"]
    layer_results: dict[str, LayerResult] = final_state.get("layer_results", {})
    overall_score: int = final_state.get("overall_score", 50)
    verdict = final_state.get("verdict", "CAUTION")
    reasoning_steps = final_state.get("reasoning_steps", [])
    final_explanation = final_state.get("final_explanation", "")
    alternative: Alternative | None = final_state.get("alternative")

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
