"""
Dilekçe PDF endpoint — TrustLens AI
TASK-32: POST /api/petition/{scan_id} → PDF indir
"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, status
from fastapi.responses import Response
from pydantic import BaseModel, Field

from app.services.cache import get_scan
from app.services.pdf_generator import generate_petition_pdf

router = APIRouter(tags=["petition"])


class PetitionRequest(BaseModel):
    url: str = Field(..., description="Taranan ürün URL'si (cache key olarak kullanılır)")
    user_full_name: str = Field(..., min_length=3, max_length=100)
    tc_no: str = Field(..., pattern=r"^\d{11}$")
    address: str = Field(..., min_length=10, max_length=500)
    phone: str = Field(..., pattern=r"^[0-9\s\+\-\(\)]{7,20}$")


@router.post("/petition/{scan_id}")
async def generate_petition(
    scan_id: str,
    body: PetitionRequest,
) -> Response:
    """
    Belirtilen scan_id için Tüketici Hakem Heyeti dilekçesi PDF'i üretir.

    scan_id URL path'inde taşınır (doğrulama için).
    body.url cache key olarak kullanılır (scan URL'si).
    Body'de kullanıcı bilgileri gerekmektedir.
    """
    scan = await get_scan(body.url)

    if scan is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=(
                f"Tarama bulunamadı (scan_id={scan_id[:16]}). "
                "Önce /api/scan endpoint'i ile tarama yapın."
            ),
        )

    try:
        pdf_bytes = await generate_petition_pdf(
            scan=scan,
            user_full_name=body.user_full_name,
            tc_no=body.tc_no,
            address=body.address,
            phone=body.phone,
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"PDF üretimi başarısız: {exc}",
        ) from exc

    filename = f"trustlens_dilekce_{scan_id[:8]}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Content-Length": str(len(pdf_bytes)),
        },
    )

