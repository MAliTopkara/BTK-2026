"""
Mock data loader — TrustLens AI
TASK-06: JSON dosyalarından ProductData nesneleri yükler.
"""

from __future__ import annotations

import json
from pathlib import Path

from app.models.scan import ProductData

# mock_data/ klasörünün mutlak yolu
_MOCK_DIR = Path(__file__).parent

_AVAILABLE = {
    "airpods_fake": "airpods_fake.json",
    "watch_genuine": "watch_genuine.json",
    "laptop_suspicious": "laptop_suspicious.json",
}


def load_mock(name: str) -> ProductData:
    """
    İsme göre mock JSON dosyasını yükleyip ProductData döndürür.

    Args:
        name: Senaryo adı — 'airpods_fake', 'watch_genuine', 'laptop_suspicious'

    Returns:
        ProductData Pydantic nesnesi

    Raises:
        KeyError: Bilinmeyen senaryo adı
        FileNotFoundError: JSON dosyası bulunamadı
        ValidationError: JSON şema uyuşmazlığı
    """
    if name not in _AVAILABLE:
        available = ", ".join(_AVAILABLE.keys())
        raise KeyError(f"Bilinmeyen mock senaryo: '{name}'. Mevcut: {available}")

    file_path = _MOCK_DIR / _AVAILABLE[name]

    if not file_path.exists():
        raise FileNotFoundError(f"Mock dosyası bulunamadı: {file_path}")

    with file_path.open(encoding="utf-8") as f:
        data = json.load(f)

    return ProductData.model_validate(data)


def list_mocks() -> list[str]:
    """Mevcut mock senaryo isimlerini döndürür."""
    return list(_AVAILABLE.keys())
