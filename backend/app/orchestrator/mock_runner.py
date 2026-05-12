"""
Mock Scan Runner — TrustLens AI
TASK-13: Agent orchestration başlangıcı.
TASK-24: Decision Agent entegre edildi.
TASK-25: LangGraph graph runner'a çevrildi.
TASK-26: force_refresh + Redis cache entegre edildi.
"""

from __future__ import annotations

import logging
import time
from datetime import UTC, datetime
from uuid import UUID, uuid4

from app.models.scan import Alternative, LayerResult, ScanResult
from app.orchestrator.graph import build_graph
from app.services import cache
from mock_data.loader import match_url_to_mock

logger = logging.getLogger(__name__)

# Graph instance — modül yüklenirken bir kez derlenir
_graph = build_graph()


async def run_mock_scan(url: str, force_refresh: bool = False) -> ScanResult:
    """
    LangGraph workflow üzerinden tarama çalıştırır.

    TASK-28: Artık gerçek scraper desteği var. URL eşleşmesi ya da
    platform tespiti gerekli; ikisi de yoksa graph error döner.

    Args:
        url: Taranacak ürün URL'si.
        force_refresh: True ise cache bypass edilir, yeni tarama yapılır.

    Raises:
        ValueError: URL ne tanınan platformda ne de mock senaryoda eşleşiyorsa.
    """
    from app.scrapers import detect_platform  # noqa: PLC0415

    # URL ya tanınan bir platform olmalı, ya da demo URL'lerinden biri
    if not detect_platform(url) and not match_url_to_mock(url):
        raise ValueError(
            "Bu URL desteklenen bir platforma eşleşmiyor. "
            "Desteklenen siteler: trendyol.com, hepsiburada.com"
        )

    if force_refresh:
        await cache.invalidate_scan(url)
        logger.info("Cache invalidate edildi (force_refresh): %s", url)

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

    # scan_id / created_at: cache_check_node (hit) veya cache_save_node (miss) tarafından set edilir
    scan_id_raw = final_state.get("scan_id")
    scan_id = UUID(scan_id_raw) if scan_id_raw else uuid4()

    created_at_raw = final_state.get("created_at_iso")
    created_at = datetime.fromisoformat(created_at_raw) if created_at_raw else datetime.now(UTC)

    # Cache hit ise cached_at = şimdiki zaman
    cached_at = datetime.now(UTC) if final_state.get("cache_hit") else None

    return ScanResult(
        scan_id=scan_id,
        url=url,
        product=product,
        overall_score=overall_score,
        verdict=verdict,
        layer_results=layer_results,
        reasoning_steps=reasoning_steps,
        final_explanation=final_explanation,
        alternative=alternative,
        duration_ms=duration_ms,
        created_at=created_at,
        cached_at=cached_at,
    )


def _extract_alternative(layer_results: dict[str, LayerResult]) -> Alternative | None:
    """Crossplatform katmanı details'inden Alternative objesi çıkarır.
    Not: Bu fonksiyon graph.py'deki decide_node tarafından çağrılır (TASK-25+).
    """
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
