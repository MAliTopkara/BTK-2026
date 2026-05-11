from fastapi import APIRouter, HTTPException, status

router = APIRouter(tags=["petition"])


@router.post("/petition/{scan_id}")
async def generate_petition(scan_id: str) -> dict:
    # TASK-32: Dilekçe PDF üretimi (ReportLab + Gemini)
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail=f"Dilekçe üretimi TASK-32 ile aktif olacak (scan_id={scan_id})",
    )
