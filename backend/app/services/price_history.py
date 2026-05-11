"""
Fiyat geçmişi servisi — TrustLens AI
TASK-11: Akakçe entegrasyonu için soyutlama katmanı.
Şu an mock_data kullanır; TASK-29'da gerçek scraper ile değiştirilecek.
"""

from __future__ import annotations

import json
import logging
from dataclasses import dataclass
from datetime import date, datetime, timedelta
from pathlib import Path

from mock_data.loader import match_url_to_mock

logger = logging.getLogger(__name__)

_MOCK_FILE = Path(__file__).parent.parent.parent / "mock_data" / "price_histories.json"

_HISTORY_DAYS = 90


@dataclass
class PricePoint:
    date: date
    price: float


def get_price_history(url: str) -> list[PricePoint] | None:
    """
    URL'e göre 90 günlük fiyat geçmişini döndürür.

    Args:
        url: Ürün URL'i

    Returns:
        PricePoint listesi (eskiden yeniye sıralı) veya None (veri yok)
    """
    mock_name = match_url_to_mock(url)
    if not mock_name:
        logger.info("Fiyat geçmişi bulunamadı: %s", url)
        return None

    try:
        raw = json.loads(_MOCK_FILE.read_text(encoding="utf-8"))
        history_data = raw.get(mock_name, {}).get("history", [])
    except (FileNotFoundError, json.JSONDecodeError) as exc:
        logger.error("Mock fiyat verisi yüklenemedi: %s", exc)
        return None

    cutoff = datetime.now().date() - timedelta(days=_HISTORY_DAYS)
    points = [
        PricePoint(date=date.fromisoformat(e["date"]), price=float(e["price"]))
        for e in history_data
        if date.fromisoformat(e["date"]) >= cutoff
    ]

    return sorted(points, key=lambda p: p.date) if points else None
