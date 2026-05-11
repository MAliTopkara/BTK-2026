"""
LangGraph ScanState tanımı — TrustLens AI
TASK-25: StateGraph için TypedDict state şeması.
"""

from __future__ import annotations

from typing import Literal

from typing_extensions import TypedDict

from app.models.scan import Alternative, LayerResult, ProductData, ReasoningStep


class ScanState(TypedDict, total=False):
    """
    LangGraph workflow boyunca taşınan durum.
    total=False → tüm alanlar opsiyonel (node'lar kademeli doldurur).
    """

    url: str
    product: ProductData | None
    layer_results: dict[str, LayerResult]
    overall_score: int
    verdict: Literal["BUY", "CAUTION", "AVOID"]
    reasoning_steps: list[ReasoningStep]
    final_explanation: str
    alternative: Alternative | None
    duration_ms: int
    error: str | None
    cache_hit: bool
    scan_id: str  # UUID as string — cache_save_node veya cache_check_node tarafından set edilir
    created_at_iso: str  # ISO datetime string
