"""
Mock Scan Runner — TrustLens AI
TASK-13: LangGraph (#25) gelene kadar 4 agent'ı asyncio.gather ile çalıştırır.
"""

from __future__ import annotations

import asyncio
import logging
from datetime import UTC, datetime
from typing import Literal
from uuid import uuid4

from app.agents.discount_agent import DiscountAgent
from app.agents.manipulation_agent import ManipulationAgent
from app.agents.review_agent import ReviewAgent
from app.agents.seller_agent import SellerAgent
from app.models.scan import LayerResult, ScanResult
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

_AGENTS = [ReviewAgent(), DiscountAgent(), ManipulationAgent(), SellerAgent()]


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
    overall_score = _compute_overall_score(layer_results)
    verdict = _score_to_verdict(overall_score)

    return ScanResult(
        scan_id=uuid4(),
        url=url,
        product=product,
        overall_score=overall_score,
        verdict=verdict,
        layer_results=layer_results,
        final_explanation=_build_explanation(overall_score, verdict, layer_results),
        duration_ms=duration_ms,
        created_at=datetime.now(UTC),
    )


def _compute_overall_score(layer_results: dict[str, LayerResult]) -> int:
    """Mevcut katmanların ağırlıklı ortalamasını hesaplar (None skorlar hariç)."""
    weighted_sum = 0.0
    total_weight = 0.0
    for layer_id, result in layer_results.items():
        if result.score is None:
            continue
        weight = _WEIGHTS.get(layer_id, 0.0)
        weighted_sum += result.score * weight
        total_weight += weight
    if total_weight == 0:
        return 50
    return round(weighted_sum / total_weight)


def _score_to_verdict(score: int) -> Literal["BUY", "CAUTION", "AVOID"]:
    if score >= 70:
        return "BUY"
    if score >= 40:
        return "CAUTION"
    return "AVOID"


def _build_explanation(
    score: int,
    verdict: str,
    layer_results: dict[str, LayerResult],
) -> str:
    verdict_tr = {"BUY": "AL", "CAUTION": "DİKKATLİ OL", "AVOID": "ALMA"}.get(verdict, verdict)
    risk_layers = [r.name for r in layer_results.values() if r.status == "RISK"]
    warn_layers = [r.name for r in layer_results.values() if r.status == "WARN"]

    parts = [f"Genel skor: {score}/100 — Karar: {verdict_tr}."]
    if risk_layers:
        parts.append(f"Yüksek risk: {', '.join(risk_layers)}.")
    if warn_layers:
        parts.append(f"Dikkat: {', '.join(warn_layers)}.")
    if not risk_layers and not warn_layers:
        parts.append("Analiz edilen katmanlarda belirgin sorun tespit edilmedi.")
    return " ".join(parts)
