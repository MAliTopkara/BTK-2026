from fastapi import APIRouter

router = APIRouter(tags=["petition"])


@router.post("/petition/{scan_id}")
async def generate_petition(scan_id: str):
    # TASK-32: Dilekçe PDF üretimi
    return {"message": "Yakında aktif olacak"}
