from __future__ import annotations

from fastapi import APIRouter, File, HTTPException, UploadFile, status

from app.agents.phishing_agent import PhishingAgent
from app.models.scan import LayerResult, ScanRequest, ScanResult
from app.orchestrator.mock_runner import run_mock_scan

router = APIRouter(tags=["scan"])

_phishing_agent = PhishingAgent()


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


@router.post("/scan/phishing", response_model=LayerResult)
async def scan_phishing(
    file: UploadFile = File(..., description="SMS/e-posta ekran görüntüsü"),
) -> LayerResult:
    # TASK-23: Phishing endpoint — Gemini Vision OCR + URL kara liste + metin analizi
    _ALLOWED_MIME = {"image/jpeg", "image/png", "image/webp", "image/gif"}
    mime = file.content_type or "image/jpeg"
    if mime not in _ALLOWED_MIME:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=f"Desteklenmeyen dosya türü: {mime}. Kabul edilenler: jpeg, png, webp",
        )

    image_bytes = await file.read()
    if len(image_bytes) == 0:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Boş dosya yüklendi",
        )
    if len(image_bytes) > 10 * 1024 * 1024:  # 10 MB limit
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="Dosya boyutu 10 MB limitini aşıyor",
        )

    return await _phishing_agent.analyze_phishing_image(image_bytes, mime)
