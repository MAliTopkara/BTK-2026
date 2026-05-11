"""
Katman 4 — Satıcı Profili
TASK-10: Satıcı yaşı, ürün sayısı, puan ve doğrulama durumuna göre kural bazlı skor.
"""

from __future__ import annotations

import logging

from app.agents.base import BaseAgent
from app.models.scan import LayerResult, ProductData, SellerData

logger = logging.getLogger(__name__)


class SellerAgent(BaseAgent):
    layer_id = "seller"
    name = "Satıcı Profili"

    async def analyze(self, product: ProductData) -> LayerResult:
        seller = product.seller
        score, flags = _score_seller(seller)
        status = _score_to_status(score)
        finding = _build_finding(seller, score, flags)

        return LayerResult(
            layer_id=self.layer_id,
            name=self.name,
            status=status,
            score=score,
            finding=finding,
            details={
                "seller_name": seller.name,
                "age_days": seller.age_days,
                "total_products": seller.total_products,
                "rating": seller.rating,
                "rating_count": seller.rating_count,
                "is_verified": seller.is_verified,
                "flags": flags,
            },
            confidence=0.9,
        )


# ---------------------------------------------------------------------------
# Yardımcı fonksiyonlar
# ---------------------------------------------------------------------------

def _score_seller(seller: SellerData) -> tuple[int, list[str]]:
    """Kural bazlı satıcı skoru (0-100). Yüksek = güvenilir."""
    score = 100
    flags: list[str] = []

    # --- Satıcı yaşı ---
    if seller.age_days is None:
        score -= 10
        flags.append("satıcı yaşı bilinmiyor")
    elif seller.age_days < 30:
        score -= 35
        flags.append(f"çok yeni satıcı ({seller.age_days} gün)")
    elif seller.age_days < 90:
        score -= 25
        flags.append(f"yeni satıcı ({seller.age_days} gün)")
    elif seller.age_days < 180:
        score -= 15
        flags.append(f"görece yeni satıcı ({seller.age_days} gün)")
    elif seller.age_days < 365:
        score -= 5

    # --- Ürün çeşitliliği ---
    if seller.total_products is None:
        score -= 10
        flags.append("ürün sayısı bilinmiyor")
    elif seller.total_products < 5:
        score -= 20
        flags.append(f"çok az ürün ({seller.total_products})")
    elif seller.total_products < 20:
        score -= 10
        flags.append(f"az ürün ({seller.total_products})")

    # --- Satıcı puanı ---
    if seller.rating is None:
        score -= 10
        flags.append("satıcı puanı yok")
    elif seller.rating < 3.5:
        score -= 30
        flags.append(f"düşük satıcı puanı ({seller.rating:.1f})")
    elif seller.rating < 4.0:
        score -= 15
        flags.append(f"orta satıcı puanı ({seller.rating:.1f})")
    elif seller.rating < 4.5:
        score -= 5

    # --- Değerlendirme sayısı ---
    if seller.rating_count is not None:
        if seller.rating_count < 10:
            score -= 15
            flags.append(f"az değerlendirme ({seller.rating_count})")
        elif seller.rating_count < 50:
            score -= 5

    # --- Doğrulama ---
    if not seller.is_verified:
        score -= 5
        flags.append("doğrulanmamış satıcı")

    return max(0, min(100, score)), flags


def _score_to_status(score: int) -> str:
    if score >= 70:
        return "OK"
    if score >= 40:
        return "WARN"
    return "RISK"


def _build_finding(seller: SellerData, score: int, flags: list[str]) -> str:
    if not flags:
        age_str = f"{seller.age_days} gündür aktif" if seller.age_days else "bilinmeyen süre"
        return f"Satıcı güvenilir görünüyor — {age_str}, puan {seller.rating or '?'}"
    return f"Satıcıda {len(flags)} sorun tespit edildi: {flags[0]}"
