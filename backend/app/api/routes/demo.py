"""
Demo endpoint — TrustLens AI
TASK-35: Pre-cache edilmiş demo senaryolarını döner.
Login gerektirmez; jüri demo deneyimi için tasarlanmıştır.
"""

from __future__ import annotations

import json
from pathlib import Path

from fastapi import APIRouter, HTTPException, status

from app.models.scan import ScanResult

router = APIRouter(tags=["demo"])

_DEMO_DIR = Path(__file__).parent.parent.parent.parent / "mock_data" / "precached_results"

_VALID_SCENARIOS = {"airpods_fake", "laptop_suspicious", "watch_genuine"}


@router.get("/demo/{scenario}", response_model=ScanResult)
async def get_demo_scenario(scenario: str) -> ScanResult:
    """Pre-cache edilmiş demo sonucunu döner. Auth gerektirmez."""
    if scenario not in _VALID_SCENARIOS:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=(
                f"Demo senaryosu bulunamadı: '{scenario}'. "
                f"Geçerli senaryolar: {', '.join(sorted(_VALID_SCENARIOS))}"
            ),
        )

    json_path = _DEMO_DIR / f"{scenario}.json"
    if not json_path.exists():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Demo verisi henüz yüklenmemiş.",
        )

    data = json.loads(json_path.read_text(encoding="utf-8"))
    return ScanResult.model_validate(data)
