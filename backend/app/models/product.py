from __future__ import annotations

from datetime import datetime
from typing import Literal, Optional
from uuid import UUID

from pydantic import BaseModel

from app.models.scan import ScanResult


class ScanRecord(BaseModel):
    """DB'de kaydedilen tarama kaydı"""
    id: UUID
    user_id: UUID
    url: str
    overall_score: int
    verdict: Literal["BUY", "CAUTION", "AVOID"]
    result_json: dict  # ScanResult.model_dump()
    created_at: datetime
