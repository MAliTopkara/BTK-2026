from __future__ import annotations

from fastapi import APIRouter, HTTPException, status

from app.models.scan import ScanRequest, ScanResult
from app.orchestrator.mock_runner import run_mock_scan

router = APIRouter(tags=["scan"])


@router.post("/scan", response_model=ScanResult)
async def scan_product(request: ScanRequest) -> ScanResult:
    # TASK-13: Mock versiyon — TASK-25'te LangGraph ile değiştirilecek
    if not request.url.startswith(("http://", "https://")):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="Geçersiz URL — http:// veya https:// ile başlamalı",
        )
    try:
        return await run_mock_scan(request.url)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc


@router.post("/scan/phishing")
async def scan_phishing() -> dict:
    # TASK-23: Phishing endpoint (Gemini Vision OCR + URL blacklist)
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Phishing taraması TASK-23 ile aktif olacak",
    )
