"""
ManipulationAgent testleri — TASK-12
Normal, edge case ve error senaryoları. Gemini mock'lu çalışır.
"""

from __future__ import annotations

from datetime import datetime, timezone
from unittest.mock import AsyncMock, patch

import pytest

from app.agents.manipulation_agent import (
    ManipulationAgent,
    _build_finding,
    _score_to_status,
)
from app.models.scan import ProductData, SellerData


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

def _make_product(
    urgency_indicators: list[str] | None = None,
    raw_html: str | None = None,
) -> ProductData:
    return ProductData(
        url="https://www.trendyol.com/test",
        platform="trendyol",
        title="Test Ürünü",
        price_current=100.0,
        seller=SellerData(name="Satıcı"),
        urgency_indicators=urgency_indicators or [],
        raw_html=raw_html,
        scraped_at=datetime.now(timezone.utc),
    )


_FAKE_PATTERNS = [
    {"type": "fake_urgency", "evidence": "Son 2 ürün kaldı!", "severity": "high"},
    {"type": "fake_social_proof", "evidence": "847 kişi izliyor", "severity": "medium"},
]

_GEMINI_RISKY = {
    "patterns_found": _FAKE_PATTERNS,
    "manipulation_score": 25,
    "summary": "Yüksek manipülasyon tespit edildi",
}

_GEMINI_CLEAN = {
    "patterns_found": [],
    "manipulation_score": 95,
    "summary": "Temiz sayfa",
}


# ---------------------------------------------------------------------------
# Test 1 — Normal: manipülatif sayfa RISK döndürür
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_analyze_manipulative_page_returns_risk() -> None:
    product = _make_product(
        urgency_indicators=["Son 2 ürün kaldı!", "847 kişi izliyor"]
    )
    with patch("app.agents.manipulation_agent.generate_json", new_callable=AsyncMock, return_value=_GEMINI_RISKY):
        result = await ManipulationAgent().analyze(product)

    assert result.status == "RISK"
    assert result.score is not None and result.score < 40
    assert result.details["pattern_count"] == 2
    assert result.details["high_severity_count"] == 1


# ---------------------------------------------------------------------------
# Test 2 — Normal: temiz sayfa OK döndürür
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_analyze_clean_page_returns_ok() -> None:
    product = _make_product(urgency_indicators=["Kargo bedava"])
    with patch("app.agents.manipulation_agent.generate_json", new_callable=AsyncMock, return_value=_GEMINI_CLEAN):
        result = await ManipulationAgent().analyze(product)

    assert result.status == "OK"
    assert result.score is not None and result.score >= 70


# ---------------------------------------------------------------------------
# Test 3 — Edge: gösterge yok → INFO
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_analyze_no_indicators_returns_info() -> None:
    product = _make_product()
    result = await ManipulationAgent().analyze(product)

    assert result.status == "INFO"
    assert result.score is None


# ---------------------------------------------------------------------------
# Test 4 — Error: Gemini başarısız → WARN
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_analyze_gemini_failure_returns_warn() -> None:
    product = _make_product(urgency_indicators=["Son 3 ürün!"])
    with patch("app.agents.manipulation_agent.generate_json", side_effect=RuntimeError("timeout")):
        result = await ManipulationAgent().analyze(product)

    assert result.status == "WARN"
    assert result.score == 50
    assert result.confidence == 0.2


# ---------------------------------------------------------------------------
# Unit testler
# ---------------------------------------------------------------------------

def test_score_to_status() -> None:
    assert _score_to_status(90) == "OK"
    assert _score_to_status(55) == "WARN"
    assert _score_to_status(20) == "RISK"


def test_build_finding_no_patterns() -> None:
    finding = _build_finding([], "temiz")
    assert "tespit edilmedi" in finding


def test_build_finding_with_patterns() -> None:
    finding = _build_finding(_FAKE_PATTERNS, "iki kalıp")
    assert "2 manipülatif" in finding
    assert "Sahte aciliyet" in finding


def test_build_finding_many_patterns_truncated() -> None:
    many = [
        {"type": t, "evidence": "x", "severity": "low"}
        for t in ["fake_urgency", "fake_social_proof", "confirmshaming", "hidden_cost", "preselection"]
    ]
    finding = _build_finding(many, "")
    assert "daha" in finding


def test_html_excerpt_used_if_provided() -> None:
    product = _make_product(raw_html="<div>Son 1 ürün kaldı</div>")
    # raw_html varsa INFO dönmemeli (Gemini'ye gidecek)
    # Burada sadece agent'ın INFO dönmediğini kontrol ediyoruz
    import asyncio
    with patch("app.agents.manipulation_agent.generate_json", new_callable=AsyncMock, return_value=_GEMINI_CLEAN):
        result = asyncio.get_event_loop().run_until_complete(
            ManipulationAgent().analyze(product)
        )
    assert result.status != "INFO"
