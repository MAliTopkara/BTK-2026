"""
LangGraph Workflow — TrustLens AI
TASK-25: scrape → analyze → decide pipeline.
TASK-26: cache_check → (hit? END : scrape → analyze → decide → cache_save → END)
"""

from __future__ import annotations

import asyncio
import logging
from datetime import UTC, datetime
from uuid import uuid4

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
from app.services import cache

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
# Node: cache_check (entry point)
# ---------------------------------------------------------------------------

async def cache_check_node(state: ScanState) -> ScanState:
    """
    URL için cache kontrolü yapar.
    Hit: tüm sonuçları state'e yükler, cache_hit=True.
    Miss: cache_hit=False, normal akış devam eder.
    """
    url = state["url"]
    cached = await cache.get_scan(url)

    if cached is None:
        logger.info("Cache miss: %s", url)
        return {**state, "cache_hit": False}

    logger.info("Cache hit: %s", url)
    return {
        **state,
        "cache_hit": True,
        "product": cached.product,
        "layer_results": cached.layer_results,
        "overall_score": cached.overall_score,
        "verdict": cached.verdict,
        "reasoning_steps": cached.reasoning_steps,
        "final_explanation": cached.final_explanation,
        "alternative": cached.alternative,
        "scan_id": str(cached.scan_id),
        "created_at_iso": cached.created_at.isoformat(),
    }


def _route_after_cache(state: ScanState) -> str:
    """Cache hit ise 'end', miss ise 'scrape' döner."""
    if state.get("cache_hit"):
        return "end"
    return "scrape"


# ---------------------------------------------------------------------------
# Node: scrape
# ---------------------------------------------------------------------------

async def scrape_node(state: ScanState) -> ScanState:
    """
    URL'den ProductData yükler.

    Akış:
      1. URL'den platform tespit (trendyol / hepsiburada)
      2. İlgili Playwright scraper'ı çalıştır
      3. Başarısızsa state.error set et — sahte data dönülmez.

    Not: Daha önce `match_url_to_mock` fallback'i vardı; kullanıcı 404 / anti-bot
    aldığında mock data dönüp gerçek ürün gibi gösteriyordu. Bu yüzden kaldırıldı.
    Demo akışı /api/demo/{scenario} endpoint'inden ayrıca hizmet veriliyor.
    """
    from app.scrapers import detect_platform, get_scraper  # noqa: PLC0415

    url = state["url"]
    platform = detect_platform(url)

    if platform:
        scraper = get_scraper(platform)
        if scraper is not None:
            try:
                product = await scraper.scrape(url)
                if product is not None:
                    logger.info(
                        "Scrape başarılı: %s → %s", url, product.title[:40]
                    )
                    return {**state, "product": product}
                logger.warning("Scraper None döndü (ürün bulunamadı): %s", url)
            except Exception as exc:  # noqa: BLE001 — defansif
                logger.warning("Scraper exception: %s", exc)

    logger.warning("Scraping başarısız: %s", url)
    return {
        **state,
        "error": (
            f"Bu ürün şu an analiz edilemiyor: {url[:80]}\n"
            "URL'nin doğru olduğundan emin olun. Sayfa kaldırılmış, "
            "anti-bot koruması devreye girmiş veya ürün bulunamamış olabilir."
        ),
        "product": None,
    }


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
# Node: cache_save (decide sonrası)
# ---------------------------------------------------------------------------

async def cache_save_node(state: ScanState) -> ScanState:
    """
    Scan sonucunu Redis cache'e yazar.
    scan_id ve created_at üretir, state'e ekler.
    Hata olursa sessizce geçer (graceful degradation).
    """
    from app.models.scan import ScanResult  # noqa: PLC0415

    if state.get("error") or not state.get("layer_results"):
        return state

    scan_id_str = str(uuid4())
    created_at = datetime.now(UTC)

    try:
        scan_result = ScanResult(
            scan_id=scan_id_str,
            url=state["url"],
            product=state["product"],
            overall_score=state.get("overall_score", 50),
            verdict=state.get("verdict", "CAUTION"),
            layer_results=state.get("layer_results", {}),
            reasoning_steps=state.get("reasoning_steps", []),
            final_explanation=state.get("final_explanation", ""),
            alternative=state.get("alternative"),
            duration_ms=0,  # Gerçek süre mock_runner'da ölçülür
            created_at=created_at,
        )
        await cache.set_scan(state["url"], scan_result)
    except Exception as exc:
        logger.warning("Cache save node hatası: %s", exc)

    return {
        **state,
        "scan_id": scan_id_str,
        "created_at_iso": created_at.isoformat(),
    }


# ---------------------------------------------------------------------------
# Graph builder
# ---------------------------------------------------------------------------

def build_graph() -> StateGraph:
    """
    cache_check → (hit? END : scrape → analyze → decide → cache_save → END)
    LangGraph conditional edges ile cache bypass akışı.
    """
    workflow: StateGraph = StateGraph(ScanState)

    workflow.add_node("cache_check", cache_check_node)
    workflow.add_node("scrape", scrape_node)
    workflow.add_node("analyze", analyze_node)
    workflow.add_node("decide", decide_node)
    workflow.add_node("cache_save", cache_save_node)

    workflow.set_entry_point("cache_check")
    workflow.add_conditional_edges(
        "cache_check",
        _route_after_cache,
        {"scrape": "scrape", "end": END},
    )
    workflow.add_edge("scrape", "analyze")
    workflow.add_edge("analyze", "decide")
    workflow.add_edge("decide", "cache_save")
    workflow.add_edge("cache_save", END)

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
