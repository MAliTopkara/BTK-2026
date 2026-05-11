"""
Gemini servis katmanı testleri — TrustLens AI
TASK-07: Normal, edge case ve error senaryoları.

Mock kullanır — gerçek API çağrısı yapmaz.
"""

from __future__ import annotations

import json
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.services.gemini import (
    _clean_json_response,
    generate_json,
)
from app.utils.prompts import (
    crossplatform_keyword_prompt,
    decision_agent_prompt,
    manipulation_detection_prompt,
    phishing_text_analysis_prompt,
    review_analysis_prompt,
    visual_analysis_prompt,
)

# ---------------------------------------------------------------------------
# Helper: Sahte Gemini response nesnesi (google.genai API)
# ---------------------------------------------------------------------------

def _mock_response(text: str) -> MagicMock:
    """Minimal google.genai response mock'u."""
    resp = MagicMock()
    resp.text = text
    resp.candidates = []
    return resp


# ---------------------------------------------------------------------------
# Test 1 — Normal: generate_json başarıyla JSON döndürüyor
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_generate_json_success() -> None:
    expected = {"results": [0, 1, 0], "suspicious_indices": [1], "reasoning": "test"}

    with (
        patch("app.services.gemini.settings") as mock_settings,
        patch("app.services.gemini.genai") as mock_genai,
    ):
        mock_settings.gemini_api_key = "test-key"
        mock_client = MagicMock()
        mock_client.models.generate_content.return_value = _mock_response(json.dumps(expected))
        mock_genai.Client.return_value = mock_client
        mock_genai.types = MagicMock()
        mock_genai.types.GenerateContentConfig.return_value = MagicMock()

        result = await generate_json("test prompt")

    assert result["results"] == [0, 1, 0]
    assert result["suspicious_indices"] == [1]


# ---------------------------------------------------------------------------
# Test 2 — Edge case: Model markdown code block içinde JSON döndürüyor
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_generate_json_markdown_codeblock() -> None:
    """Model bazen ```json ... ``` bloğuyla sarar — temizlenmeli."""
    inner = {"patterns_found": [], "manipulation_score": 95, "summary": "temiz"}
    wrapped = f"```json\n{json.dumps(inner)}\n```"

    with (
        patch("app.services.gemini.settings") as mock_settings,
        patch("app.services.gemini.genai") as mock_genai,
    ):
        mock_settings.gemini_api_key = "test-key"
        mock_client = MagicMock()
        mock_client.models.generate_content.return_value = _mock_response(wrapped)
        mock_genai.Client.return_value = mock_client
        mock_genai.types = MagicMock()
        mock_genai.types.GenerateContentConfig.return_value = MagicMock()

        result = await generate_json("test prompt")

    assert result["manipulation_score"] == 95
    assert result["patterns_found"] == []


# ---------------------------------------------------------------------------
# Test 3 — Error: API 3 kez başarısız olunca RuntimeError fırlatıyor
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_generate_json_retry_exhausted() -> None:
    """3 retry sonrası RuntimeError fırlatılmalı."""
    with (
        patch("app.services.gemini.settings") as mock_settings,
        patch("app.services.gemini.genai") as mock_genai,
        patch("app.services.gemini.asyncio.sleep", new_callable=AsyncMock),
    ):
        mock_settings.gemini_api_key = "test-key"
        mock_client = MagicMock()
        mock_client.models.generate_content.side_effect = Exception("API quota exceeded")
        mock_genai.Client.return_value = mock_client
        mock_genai.types = MagicMock()
        mock_genai.types.GenerateContentConfig.return_value = MagicMock()

        with pytest.raises(RuntimeError, match="3 denemede başarısız"):
            await generate_json("test prompt")

    assert mock_client.models.generate_content.call_count == 3


# ---------------------------------------------------------------------------
# Test 4 — _clean_json_response yardımcı fonksiyonu
# ---------------------------------------------------------------------------

def test_clean_json_response_plain() -> None:
    """Düz JSON olduğunda değişmeden döner."""
    raw = '{"key": "value"}'
    assert _clean_json_response(raw) == raw


def test_clean_json_response_with_codeblock() -> None:
    """```json ... ``` bloğunu temizler."""
    raw = "```json\n{\"key\": \"value\"}\n```"
    assert _clean_json_response(raw) == '{"key": "value"}'


def test_clean_json_response_with_bare_codeblock() -> None:
    """``` ... ``` (lang etiketi olmadan) bloğunu temizler."""
    raw = "```\n{\"key\": \"value\"}\n```"
    assert _clean_json_response(raw) == '{"key": "value"}'


# ---------------------------------------------------------------------------
# Test 5 — Prompt fonksiyonları doğru format üretiyor
# ---------------------------------------------------------------------------

def test_review_analysis_prompt_contains_reviews() -> None:
    reviews = [
        {"text": "Harika ürün", "rating": 5},
        {"text": "Çok kötü", "rating": 1},
    ]
    prompt = review_analysis_prompt(reviews)
    assert "Harika ürün" in prompt
    assert "Çok kötü" in prompt
    assert "results" in prompt  # JSON şema açıklaması


def test_manipulation_detection_prompt_with_urgency() -> None:
    indicators = ["Son 2 ürün kaldı!", "847 kişi izliyor"]
    prompt = manipulation_detection_prompt(indicators)
    assert "Son 2 ürün kaldı!" in prompt
    assert "fake_urgency" in prompt


def test_decision_agent_prompt_verdict_translation() -> None:
    prompt = decision_agent_prompt(
        layer_results=[{"layer_id": "review", "score": 40}],
        overall_score=45,
        verdict="AVOID",
    )
    assert "ALMA" in prompt  # Türkçe karşılık
    assert "45/100" in prompt


def test_crossplatform_keyword_prompt() -> None:
    title = "Apple AirPods Pro 2. Nesil USB-C Tip-C Şarj Kutulu"
    prompt = crossplatform_keyword_prompt(title)
    assert title in prompt
    assert "search_query" in prompt


def test_phishing_prompt_truncates_long_text() -> None:
    """2000 karakterden uzun metin kısaltılmalı (prompt içinde)."""
    long_text = "x" * 5000
    prompt = phishing_text_analysis_prompt(long_text)
    # Prompt 2000 karakter kırpılmış metin içermeli (tam 5000 değil)
    assert "x" * 2000 in prompt
    assert "x" * 2001 not in prompt


def test_visual_analysis_prompt_not_empty() -> None:
    prompt = visual_analysis_prompt()
    assert len(prompt) > 50
    assert "authenticity_score" in prompt
