from __future__ import annotations

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, EmailStr


class UserProfile(BaseModel):
    id: UUID
    email: str
    full_name: Optional[str] = None
    created_at: datetime


class BehaviorProfile(BaseModel):
    """Faz 2 Mini — Finansal Dijital İkiz için"""
    user_id: UUID
    monthly_income: Optional[float] = None
    shopping_budget: Optional[float] = None
    payday: Optional[int] = None  # Ayın kaçı
    impulse_score: Optional[float] = None  # 0-1
    updated_at: Optional[datetime] = None
