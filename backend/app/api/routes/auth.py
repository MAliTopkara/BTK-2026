from fastapi import APIRouter, HTTPException, status

router = APIRouter(tags=["auth"])


@router.get("/auth/me")
async def get_current_user() -> dict:
    # TASK-15: Auth implementasyonu — şu an Supabase SSR cookies frontend tarafında
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Auth endpoint TASK-15 ile aktif olacak",
    )
