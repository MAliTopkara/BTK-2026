from fastapi import APIRouter

router = APIRouter(tags=["auth"])


@router.get("/auth/me")
async def get_current_user():
    # TASK-15: Auth implementasyonu
    return {"message": "Yakında aktif olacak"}
