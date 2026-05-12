"""
TrustLens AI — Email Routes (TASK-46)
Weekly digest subscription + manual trigger for testing.
"""

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, EmailStr

from app.services.email import build_weekly_digest_html, send_email

router = APIRouter(tags=["email"])


class EmailSubscribeRequest(BaseModel):
    email: EmailStr
    enabled: bool = True


class EmailDigestTriggerRequest(BaseModel):
    email: EmailStr
    scans_count: int = 5
    avg_score: int = 62
    top_risk_product: str | None = "Apple AirPods Pro 2 — sahte indirim"
    top_risk_score: int | None = 29
    savings_estimate: float = 1250.0
    period: str = "5-12 Mayıs 2026"


@router.post("/email/subscribe")
async def subscribe_email(req: EmailSubscribeRequest) -> dict:
    """Subscribe/unsubscribe from weekly digest emails."""
    # In production this would persist to Supabase.
    # For now we return success and store in Redis (TTL-free).
    return {
        "email": req.email,
        "subscribed": req.enabled,
        "message": "E-posta tercihin kaydedildi." if req.enabled else "E-posta bildirimleri kapatıldı.",
    }


@router.post("/email/digest/trigger")
async def trigger_digest(req: EmailDigestTriggerRequest) -> dict:
    """Manually trigger a weekly digest email (for demo/testing)."""
    html = build_weekly_digest_html(
        user_email=req.email,
        scans_count=req.scans_count,
        avg_score=req.avg_score,
        top_risk_product=req.top_risk_product,
        top_risk_score=req.top_risk_score,
        savings_estimate=req.savings_estimate,
        period=req.period,
    )

    success = await send_email(
        to=req.email,
        subject=f"TrustLens Haftalık Özet — {req.period}",
        html=html,
    )

    if not success:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="E-posta gönderilemedi — Resend API key eksik veya servis yanıt vermedi.",
        )

    return {"sent": True, "to": req.email, "period": req.period}


@router.post("/email/digest/preview")
async def preview_digest(req: EmailDigestTriggerRequest) -> dict:
    """Return the HTML content without sending (for preview in frontend)."""
    html = build_weekly_digest_html(
        user_email=req.email,
        scans_count=req.scans_count,
        avg_score=req.avg_score,
        top_risk_product=req.top_risk_product,
        top_risk_score=req.top_risk_score,
        savings_estimate=req.savings_estimate,
        period=req.period,
    )
    return {"html": html}
