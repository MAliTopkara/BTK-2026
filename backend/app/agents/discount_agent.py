"""
Katman 2 — Sahte İndirim Tespiti
TASK-11: 90 günlük fiyat geçmişi ile indirim gerçekliğini analiz eder.
"""

from __future__ import annotations

import logging

from app.agents.base import BaseAgent
from app.models.scan import LayerResult, ProductData
from app.services.price_history import PricePoint, get_price_history

logger = logging.getLogger(__name__)

# Pump eşikleri
_PUMP_RATIO = 1.15     # baz fiyatın %15 üzerindeyse şüpheli
_SPIKE_RATIO = 1.15    # kısa sürede %15 artış → pump sinyali


class DiscountAgent(BaseAgent):
    layer_id = "discount"
    name = "Sahte İndirim Tespiti"

    async def analyze(self, product: ProductData) -> LayerResult:
        if not product.price_original or product.price_original <= product.price_current:
            return LayerResult(
                layer_id=self.layer_id,
                name=self.name,
                status="INFO",
                score=None,
                finding="Üründe indirim iddiası yok, analiz atlandı",
            )

        history = get_price_history(product.url)
        if not history:
            return LayerResult(
                layer_id=self.layer_id,
                name=self.name,
                status="WARN",
                score=50,
                finding="Fiyat geçmişi alınamadı, indirim doğrulanamıyor",
                confidence=0.3,
            )

        score, flags, details = _analyze_history(
            product.price_original,
            product.price_current,
            history,
        )
        status = _score_to_status(score)
        finding = _build_finding(product.price_original, product.price_current, flags, details)

        return LayerResult(
            layer_id=self.layer_id,
            name=self.name,
            status=status,
            score=score,
            finding=finding,
            details={
                **details,
                "price_current": product.price_current,
                "price_original_claimed": product.price_original,
                "discount_pct_claimed": product.discount_pct,
                "flags": flags,
            },
            confidence=0.9,
        )


# ---------------------------------------------------------------------------
# Yardımcı fonksiyonlar
# ---------------------------------------------------------------------------

def _analyze_history(
    price_original: float,
    price_current: float,
    history: list[PricePoint],
) -> tuple[int, list[str], dict]:
    prices = [p.price for p in history]
    baseline = prices[0]      # en eski kayıtlı fiyat (90 gün öncesi)
    min_price = min(prices)
    max_price = max(prices)

    score = 100
    flags: list[str] = []

    # Orijinal fiyat yapay mı şişirildi?
    if price_original > baseline * _PUMP_RATIO:
        score -= 40
        flags.append(
            f"'indirim öncesi fiyat' ({price_original:.0f} TL) "
            f"baz fiyatın çok üzerinde ({baseline:.0f} TL)"
        )

    # Pump tespiti: geçmişin ilk yarısına göre ikinci yarıda sert artış var mı?
    mid = len(prices) // 2
    if mid > 0:
        old_avg = sum(prices[:mid]) / mid
        recent_peak = max(prices[mid:])
        if recent_peak > old_avg * _SPIKE_RATIO:
            score -= 30
            flags.append(
                f"indirimden önce yapay fiyat şişirmesi: "
                f"{old_avg:.0f} TL'den {recent_peak:.0f} TL'ye"
            )

    # Mevcut fiyat gerçek minimumun üstünde mi?
    true_discount_pct = round((1 - price_current / baseline) * 100, 1)
    if price_current > baseline:
        score -= 15
        flags.append(f"mevcut fiyat ({price_current:.0f} TL) baz fiyatın üzerinde")

    details = {
        "baseline_price": baseline,
        "min_price_90d": min_price,
        "max_price_90d": max_price,
        "true_discount_pct": true_discount_pct,
        "history_points": len(history),
    }
    return max(0, min(100, score)), flags, details


def _score_to_status(score: int) -> str:
    if score >= 70:
        return "OK"
    if score >= 40:
        return "WARN"
    return "RISK"


def _build_finding(
    price_original: float,
    price_current: float,
    flags: list[str],
    details: dict,
) -> str:
    true_pct = details.get("true_discount_pct", 0)
    if not flags:
        return (
            f"İndirim gerçek görünüyor — gerçek baz fiyata göre %{true_pct} indirim"
        )
    claimed_pct = round((1 - price_current / price_original) * 100)
    return (
        f"Sahte indirim şüphesi: %{claimed_pct} indirim iddia ediliyor "
        f"ama gerçek baz fiyata göre %{true_pct}"
    )
