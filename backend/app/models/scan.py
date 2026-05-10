from __future__ import annotations

from datetime import datetime
from typing import Literal, Optional
from uuid import UUID

from pydantic import BaseModel


class SellerData(BaseModel):
    name: str
    age_days: Optional[int] = None
    total_products: Optional[int] = None
    rating: Optional[float] = None
    rating_count: Optional[int] = None
    is_verified: bool = False


class ReviewData(BaseModel):
    text: str
    rating: int
    author_name: Optional[str] = None
    date: Optional[datetime] = None
    has_image: bool = False
    image_url: Optional[str] = None
    verified_purchase: bool = False


class ProductData(BaseModel):
    url: str
    platform: Literal["trendyol", "hepsiburada", "n11", "amazon_tr", "unknown"]
    title: str
    price_current: float
    price_original: Optional[float] = None
    discount_pct: Optional[float] = None
    images: list[str] = []
    description: str = ""
    seller: SellerData
    reviews: list[ReviewData] = []
    review_count_total: int = 0
    rating_avg: float = 0.0
    urgency_indicators: list[str] = []
    raw_html: Optional[str] = None
    scraped_at: datetime


class Highlight(BaseModel):
    start: int
    end: int
    color: str  # "red", "yellow", "green"


class ReasoningStep(BaseModel):
    step: int
    content: str
    highlights: list[Highlight] = []


class Alternative(BaseModel):
    platform: str
    seller_name: str
    price: float
    savings: float
    rating: float
    url: str


class LayerResult(BaseModel):
    layer_id: str
    name: str
    status: Literal["RISK", "WARN", "OK", "INFO"]
    score: Optional[int] = None  # 0-100, None ise analiz yapılamadı
    finding: str
    details: dict = {}
    confidence: float = 1.0  # 0-1


class ScanRequest(BaseModel):
    url: str
    force_refresh: bool = False


class ScanResult(BaseModel):
    scan_id: UUID
    url: str
    product: ProductData
    overall_score: int  # 0-100
    verdict: Literal["BUY", "CAUTION", "AVOID"]
    layer_results: dict[str, LayerResult]
    reasoning_steps: list[ReasoningStep] = []
    final_explanation: str
    alternative: Optional[Alternative] = None
    duration_ms: int
    created_at: datetime
