"""
Decision Agent testleri — TrustLens AI
TASK-24: Ağırlıklı skor, verdict, Gemini reasoning ve fallback senaryoları.
"""

from __future__ import annotations

from unittest.mock import AsyncMock, patch

import pytest

from app.agents.decision_agent import (
    _fallback_reasoning,
    compute_overall_score,
    run_decision,
    score_to_verdict,
)
from app.models.scan import LayerResult

# ---------------------------------------------------------------------------
# Fixture: LayerResult oluşturucu
# ---------------------------------------------------------------------------

def _layer(layer_id: str, score: int | None, status: str = "OK", name: str = "") -> LayerResult:
    return LayerResult(
        layer_id=layer_id,
        name=name or layer_id,
        status=status,  # type: ignore[arg-type]
        score=score,
        finding="test",
    )


def _all_ok_layers(base_score: int = 80) -> dict[str, LayerResult]:
    return {
        "review": _layer("review", base_score, "OK", "Sahte Yorum"),
        "discount": _layer("discount", base_score, "OK", "Sahte İndirim"),
        "manipulation": _layer("manipulation", base_score, "OK", "Dark Pattern"),
        "seller": _layer("seller", base_score, "OK", "Satıcı Profili"),
        "visual": _layer("visual", base_score, "OK", "Görsel"),
        "crossplatform": _layer("crossplatform", base_score, "OK", "Çapraz Platform"),
    }


# ---------------------------------------------------------------------------
# Test 1 — Skor hesabı: tüm katmanlar 80 → 80 beklenir
# (crossplatform dahil edilmez, ağırlıklar normalize edilir)
# ---------------------------------------------------------------------------

def test_compute_overall_score_all_same() -> None:
    layers = _all_ok_layers(80)
    score = compute_overall_score(layers)
    assert score == 80


# ---------------------------------------------------------------------------
# Test 2 — Skor hesabı: karışık skorlar doğru ağırlıklanmalı
# ---------------------------------------------------------------------------

def test_compute_overall_score_weighted() -> None:
    layers = {
        "review": _layer("review", 20, "RISK"),      # ağırlık 0.20
        "discount": _layer("discount", 100, "OK"),   # ağırlık 0.20
        "seller": _layer("seller", 100, "OK"),       # ağırlık 0.15
        "manipulation": _layer("manipulation", 100, "OK"),  # 0.10
        "visual": _layer("visual", 100, "OK"),       # 0.20
    }
    score = compute_overall_score(layers)
    # review=20*0.20=4, diğerleri toplamda 0.20+0.15+0.10+0.20=0.65 → 100*0.65=65
    # toplam ağırlık=0.85, total=(4+65)/0.85 ≈ 81
    assert 70 <= score <= 90


# ---------------------------------------------------------------------------
# Test 3 — score=None katmanlar hesaba katılmamalı
# ---------------------------------------------------------------------------

def test_compute_overall_score_skips_none() -> None:
    layers = {
        "review": _layer("review", None, "INFO"),
        "seller": _layer("seller", 60, "WARN"),
    }
    score = compute_overall_score(layers)
    assert score == 60


# ---------------------------------------------------------------------------
# Test 4 — Boş/tümü None → 50 döner
# ---------------------------------------------------------------------------

def test_compute_overall_score_all_none() -> None:
    layers = {
        "review": _layer("review", None, "INFO"),
        "phishing": _layer("phishing", None, "INFO"),
    }
    assert compute_overall_score(layers) == 50


# ---------------------------------------------------------------------------
# Test 5 — score_to_verdict eşikleri
# ---------------------------------------------------------------------------

def test_score_to_verdict() -> None:
    assert score_to_verdict(70) == "BUY"
    assert score_to_verdict(75) == "BUY"
    assert score_to_verdict(69) == "CAUTION"
    assert score_to_verdict(40) == "CAUTION"
    assert score_to_verdict(39) == "AVOID"
    assert score_to_verdict(0) == "AVOID"


# ---------------------------------------------------------------------------
# Test 6 — run_decision: Gemini başarılı → steps + explanation döner
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_run_decision_gemini_success() -> None:
    gemini_result = (
        {
            "reasoning_steps": [
                {"step": 1, "content": "Yorumlar incelendi, şüpheli yok."},
                {"step": 2, "content": "Satıcı güvenilir görünüyor."},
            ],
            "final_explanation": "Bu ürünü AL diyorum, çünkü tüm göstergeler olumlu.",
        },
        None,   # thinking_text
    )

    with patch(
        "app.agents.decision_agent.generate_json_with_thinking",
        new_callable=AsyncMock,
    ) as mock_gen:
        mock_gen.return_value = gemini_result
        layers = _all_ok_layers(85)
        score, verdict, steps, explanation = await run_decision(layers)

    assert score == 85
    assert verdict == "BUY"
    assert len(steps) == 2
    assert steps[0].content == "Yorumlar incelendi, şüpheli yok."
    assert "AL" in explanation


# ---------------------------------------------------------------------------
# Test 7 — run_decision: Gemini başarısız → fallback
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_run_decision_gemini_fallback() -> None:
    with patch(
        "app.agents.decision_agent.generate_json_with_thinking",
        new_callable=AsyncMock,
    ) as mock_gen:
        mock_gen.side_effect = Exception("API hatası")
        layers = _all_ok_layers(85)
        score, verdict, steps, explanation = await run_decision(layers)

    assert score == 85
    assert verdict == "BUY"
    assert len(steps) >= 1
    assert isinstance(explanation, str)
    assert len(explanation) > 0


# ---------------------------------------------------------------------------
# Test 8 — _fallback_reasoning: RISK katmanı varsa adımda görünmeli
# ---------------------------------------------------------------------------

def test_fallback_reasoning_shows_risks() -> None:
    layers = {
        "review": _layer("review", 15, "RISK", "Sahte Yorum"),
        "seller": _layer("seller", 80, "OK", "Satıcı"),
    }
    steps, explanation = _fallback_reasoning(30, "AVOID", layers)
    assert any("Sahte Yorum" in s.content for s in steps)
    assert "ALMA" in explanation or "30" in explanation


# ---------------------------------------------------------------------------
# Test 9 — run_decision AVOID verdict: düşük skor
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_run_decision_avoid_verdict() -> None:
    gemini_result = (
        {"reasoning_steps": [{"step": 1, "content": "Risk yüksek."}],
         "final_explanation": "Bu ürünü ALMA diyorum."},
        None,
    )

    with patch(
        "app.agents.decision_agent.generate_json_with_thinking",
        new_callable=AsyncMock,
    ) as mock_gen:
        mock_gen.return_value = gemini_result
        layers = {
            "review": _layer("review", 20, "RISK"),
            "seller": _layer("seller", 10, "RISK"),
            "visual": _layer("visual", 25, "RISK"),
            "discount": _layer("discount", 30, "RISK"),
            "manipulation": _layer("manipulation", 20, "RISK"),
        }
        score, verdict, steps, explanation = await run_decision(layers)

    assert verdict == "AVOID"
    assert score < 40
