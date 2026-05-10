from fastapi import APIRouter

router = APIRouter(tags=["scan"])


@router.post("/scan")
async def scan_product():
    # TASK-13: POST /api/scan implementasyonu
    return {"message": "Yakında aktif olacak"}


@router.post("/scan/phishing")
async def scan_phishing():
    # TASK-23: Phishing endpoint implementasyonu
    return {"message": "Yakında aktif olacak"}
