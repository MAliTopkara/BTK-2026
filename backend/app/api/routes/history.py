from fastapi import APIRouter

router = APIRouter(tags=["history"])


@router.get("/history")
async def get_history():
    # TASK-30: History implementasyonu
    return {"scans": []}
