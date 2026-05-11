from fastapi import APIRouter, HTTPException, status

router = APIRouter(tags=["history"])


@router.get("/history")
async def get_history() -> dict:
    # TASK-30: History sayfası + Supabase scans tablosu ile bağlanacak
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="History endpoint TASK-30 ile aktif olacak",
    )
