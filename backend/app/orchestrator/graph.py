"""
LangGraph Workflow — TrustLens AI
TASK-25: scrape → analyze → decide pipeline.
"""

from __future__ import annotations

import asyncio
import logging
from typing import TYPE_CHECKING

from langgraph.graph import END, StateGraph

from app.agents.crossplatform_agent import CrossPlatformAgent
from app.agents.decision_agent import run_decision
from app.agents.discount_agent import DiscountAgent
from app.agents.manipulation_agent import ManipulationAgent
from app.agents.review_agent import ReviewAgent
from app.agents.seller_agent import SellerAgent
from app.agents.visual_agent import VisualAgent
from app.models.scan import Alternative
from app.orchestrator.state import ScanState

if TYPE_CHECKING:
    pass

logger = logging.getLogger(__name__)

# Phishing agent normal scan'de pasif — ayrı endpoint'te çalışır
_AGENTS = [
    ReviewAgent(),
    DiscountAgent(),
    ManipulationAgent(),
    SellerAgent(),
    VisualAgent(),
    CrossPlatformAgent(),
]


# ---------------------------------------------------------------------------
# Node: scrape
# ---------------------------------------------------------------------------

async def scrape_node(state: ScanState) -> ScanState:
    """
    URL'den ProductData yükler.
    Şimdilik mock — TASK-28'de gerçek Playwright scraper ile değiştirilecek.
    """
    from mock_data.loader import load_mock, match_url_to_mock  # noqa: PLC0415

    url = state["url"]
    mock_name = match_url_to_mock(url)
    if not mock_name:
        return {
            **state,
            "error": (
                f"URL hiçbir demo senaryoya eşleşmiyor: {url}\n"
                "Demo URL'leri: trendyol.com/apple-airpods, "
                "trendyol.com/casio, hepsiburada.com/xiaomi-laptop"
            ),
            "product": None,
        }

    product = load_mock(mock_name)
    logger.info("Scrape tamamlandı: %s → %s", url, mock_name)
    return {**state, "product": product}


# ---------------------------------------------------------------------------
# Node: analyze (tüm katmanlar paralel)
# ---------------------------------------------------------------------------

async def analyze_node(state: ScanState) -> ScanState:
    """6 agent asyncio.gather ile paralel çalışır."""
    product = state.get("product")
    if product is None or state.get("error"):
        return state

    results_list = await asyncio.gather(
        *[agent.safe_analyze(product) for agent in _AGENTS]
    )
    layer_results = {r.layer_id: r for r in results_list}
    logger.info("Analiz tamamlandı: %d katman", len(layer_results))
    return {**state, "layer_results": layer_results}


# ---------------------------------------------------------------------------
# Node: decide
# ---------------------------------------------------------------------------

async def decide_node(state: ScanState) -> ScanState:
    """Decision Agent ile skor + verdict + reasoning üretir."""
    if state.get("error") or not state.get("layer_results"):
        return state

    layer_results = state["layer_results"]
    overall_score, verdict, reasoning_steps, final_explanation = await run_decision(
        layer_results
    )

    alternative = _extract_alternative(layer_results)

    logger.info(
        "Karar üretildi: skor=%d verdict=%s", overall_score, verdict
    )

    return {
        **state,
        "overall_score": overall_score,
        "verdict": verdict,
        "reasoning_steps": reasoning_steps,
        "final_explanation": final_explanation,
        "alternative": alternative,
    }


# ---------------------------------------------------------------------------
# Graph builder
# ---------------------------------------------------------------------------

def build_graph() -> StateGraph:
    """
    3 node'lu LangGraph workflow oluşturur ve compile eder.

    scrape → analyze → decide → END
    """
    workflow: StateGraph = StateGraph(ScanState)

    workflow.add_node("scrape", scrape_node)
    workflow.add_node("analyze", analyze_node)
    workflow.add_node("decide", decide_node)

    workflow.set_entry_point("scrape")
    workflow.add_edge("scrape", "analyze")
    workflow.add_edge("analyze", "decide")
    workflow.add_edge("decide", END)

    return workflow.compile()


# ---------------------------------------------------------------------------
# Yardımcı
# ---------------------------------------------------------------------------

def _extract_alternative(layer_results: dict) -> Alternative | None:
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
