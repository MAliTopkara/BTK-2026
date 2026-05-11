from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class UserProfile(BaseModel):
    id: UUID
    email: str
    full_name: str | None = None
    created_at: datetime


class BehaviorProfile(BaseModel):
    """Faz 2 Mini — Finansal Dijital İkiz için"""
    user_id: UUID
    monthly_income: float | None = None
    shopping_budget: float | None = None
    payday: int | None = None  # Ayın kaçı
    impulse_score: float | None = None  # 0-1
    updated_at: datetime | None = None
