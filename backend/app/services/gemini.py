"""
Gemini API wrapper — TrustLens AI
TASK-07: Tüm agent'ların kullandığı merkezi Gemini servis katmanı.
SDK: google.genai (v1+) — eski google.generativeai paketi deprecated.
"""

from __future__ import annotations

import asyncio
import json
import logging
import re
from typing import Any

import httpx
from google import genai
from google.genai import types as genai_types

from app.config import settings

logger = logging.getLogger(__name__)

# Model sabitleri
MODEL_PRO = "gemini-2.5-pro"
MODEL_FLASH = "gemini-2.5-flash"

# Retry ayarları
_MAX_RETRIES = 3
_RETRY_BASE_DELAY = 1.5  # saniye (exponential backoff: 1.5, 3, 6)


def _get_client() -> genai.Client:
    """
    Gemini API istemcisi oluşturur. Çağrı zamanında çalışır (lazy init).

    Raises:
        RuntimeError: API key eksikse
    """
    if not settings.gemini_api_key:
        raise RuntimeError(
            "GEMINI_API_KEY tanımlı değil. "
            "backend/.env dosyasını veya ortam değişkenlerini kontrol et."
        )
    return genai.Client(api_key=settings.gemini_api_key)


def _clean_json_response(text: str) -> str:
    """
    Model bazen ```json ... ``` bloğu döndürebilir.
    Defensive temizleme: ham JSON'u çıkart.
    """
    match = re.search(r"```(?:json)?\s*([\s\S]+?)\s*```", text)
    if match:
        return match.group(1).strip()
    return text.strip()


async def _call_with_retry(
    client: genai.Client,
    model: str,
    contents: Any,
    config: genai_types.GenerateContentConfig,
) -> genai_types.GenerateContentResponse:
    """
    generate_content'i asyncio executor'da çalıştırır, hata durumunda
    exponential backoff ile 3 kez retry atar.
    """
    loop = asyncio.get_event_loop()
    last_exc: Exception | None = None

    for attempt in range(_MAX_RETRIES):
        try:
            return await loop.run_in_executor(
                None,
                lambda: client.models.generate_content(
                    model=model,
                    contents=contents,
                    config=config,
                ),
            )
        except Exception as exc:
            last_exc = exc
            wait = _RETRY_BASE_DELAY * (2**attempt)
            logger.warning(
                "Gemini API hatası (deneme %d/%d): %s — %.1f saniye beklenecek",
                attempt + 1,
                _MAX_RETRIES,
                exc,
                wait,
            )
            await asyncio.sleep(wait)

    raise RuntimeError(f"Gemini API {_MAX_RETRIES} denemede başarısız: {last_exc}") from last_exc


async def generate_text(
    prompt: str,
    model: str = MODEL_FLASH,
    temperature: float = 0.2,
) -> str:
    """
    Serbest metin üretir.

    Args:
        prompt: Kullanıcı / sistem prompt'u
        model: Hangi Gemini modeli kullanılacak
        temperature: Yaratıcılık düzeyi (düşük = daha deterministik)

    Returns:
        Model çıktısı (string)
    """
    client = _get_client()
    config = genai_types.GenerateContentConfig(temperature=temperature)

    response = await _call_with_retry(client, model, prompt, config)
    return response.text


async def generate_json(
    prompt: str,
    model: str = MODEL_FLASH,
    temperature: float = 0.1,
) -> dict[str, Any]:
    """
    JSON modunda çağrı yapar, otomatik parse eder.

    Args:
        prompt: JSON çıktı bekleyen prompt
        model: Hangi Gemini modeli kullanılacak
        temperature: Düşük tutulur (JSON için determinism gerekir)

    Returns:
        Parse edilmiş dict

    Raises:
        ValueError: JSON parse edilemezse
    """
    client = _get_client()
    config = genai_types.GenerateContentConfig(
        temperature=temperature,
        response_mime_type="application/json",
    )

    response = await _call_with_retry(client, model, prompt, config)
    raw = _clean_json_response(response.text)

    try:
        return json.loads(raw)
    except json.JSONDecodeError as exc:
        logger.error("JSON parse hatası. Ham yanıt: %s", raw[:500])
        raise ValueError(f"Gemini JSON parse edilemedi: {exc}") from exc


async def generate_json_with_thinking(
    prompt: str,
    temperature: float = 0.1,
) -> tuple[dict[str, Any], str | None]:
    """
    Gemini 2.5 Pro ile thinking modu — Decision Agent için.

    Args:
        prompt: Final karar prompt'u
        temperature: 0.1 (deterministik karar)

    Returns:
        Tuple: (parse edilmiş dict, thinking_summary veya None)
    """
    client = _get_client()
    config = genai_types.GenerateContentConfig(
        temperature=temperature,
        response_mime_type="application/json",
        thinking_config=genai_types.ThinkingConfig(include_thoughts=True),
    )

    response = await _call_with_retry(client, MODEL_PRO, prompt, config)

    # Thinking part'ı ayıkla
    thinking_text: str | None = None
    try:
        for part in response.candidates[0].content.parts:
            if getattr(part, "thought", False):
                thinking_text = part.text
                break
    except (IndexError, AttributeError):
        pass  # thinking desteklenmiyorsa sessizce atla

    raw = _clean_json_response(response.text)
    try:
        result = json.loads(raw)
    except json.JSONDecodeError as exc:
        logger.error("Decision Agent JSON parse hatası. Ham yanıt: %s", raw[:500])
        raise ValueError(f"Decision Agent JSON parse edilemedi: {exc}") from exc

    return result, thinking_text


async def analyze_image(
    prompt: str,
    image_url: str | None = None,
    image_bytes: bytes | None = None,
    image_mime: str = "image/jpeg",
    model: str = MODEL_FLASH,
    temperature: float = 0.1,
) -> dict[str, Any]:
    """
    Görsel analizi — Katman 5 (visual_agent) ve Katman 7 (phishing_agent) için.

    Args:
        prompt: Görsel analiz prompt'u
        image_url: CDN URL (image_bytes ile birlikte kullanılmaz)
        image_bytes: Ham görsel verisi (image_url ile birlikte kullanılmaz)
        image_mime: MIME türü
        model: Flash varsayılan (vision destekliyor)
        temperature: Düşük

    Returns:
        Parse edilmiş JSON dict

    Raises:
        ValueError: Ne URL ne bytes verilmemişse, veya JSON parse hatası
    """
    if image_url is None and image_bytes is None:
        raise ValueError("analyze_image: image_url veya image_bytes gerekli")

    if image_bytes is None and image_url is not None:
        async with httpx.AsyncClient(timeout=10) as http:
            resp = await http.get(image_url)
            resp.raise_for_status()
            image_bytes = resp.content
            image_mime = resp.headers.get("content-type", image_mime).split(";")[0]

    client = _get_client()
    config = genai_types.GenerateContentConfig(
        temperature=temperature,
        response_mime_type="application/json",
    )

    image_part = genai_types.Part.from_bytes(data=image_bytes, mime_type=image_mime)  # type: ignore[arg-type]
    contents = [prompt, image_part]

    response = await _call_with_retry(client, model, contents, config)
    raw = _clean_json_response(response.text)

    try:
        return json.loads(raw)
    except json.JSONDecodeError as exc:
        logger.error("Vision JSON parse hatası. Ham yanıt: %s", raw[:500])
        raise ValueError(f"Vision JSON parse edilemedi: {exc}") from exc
