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


def load_phishing_image() -> bytes:
    """
    Sahte phishing SMS ekran görüntüsünü bytes olarak yükler.

    TASK-23 (Phishing Agent + Endpoint) için Vision API'ye beslenecek
    test girdisi olarak kullanılır. Görsel iOS Mesajlar tarzında PTT Kargo
    sahte bilgilendirme mesajı içerir, içinde phishing_domains.txt'te
    listelenen `pttkargo-takip-sorgula.com` sahte URL'i bulunur.

    Returns:
        PNG dosyasının içeriği (bytes)

    Raises:
        FileNotFoundError: phishing_sms.png bulunamadı
            (Üretmek için: uv run python mock_data/generate_phishing_sms.py)
    """
    image_path = _MOCK_DIR / "phishing_sms.png"

    if not image_path.exists():
        raise FileNotFoundError(
            f"Phishing SMS gorseli bulunamadi: {image_path}\n"
            "Uretmek icin: uv run python mock_data/generate_phishing_sms.py"
        )

    return image_path.read_bytes()


def load_phishing_domains() -> list[dict[str, str]]:
    """
    Bilinen phishing alan adları listesini yükler.

    TASK-23 (Phishing Agent) için Vision OCR sonrası URL eşleştirmesinde kullanılır.
    Format: phishing_domains.txt — her satır TAB ile ayrılmış 3 alan
    (alan_adi TAB kategori TAB aciklama). Yorum satırları (#) ve boş satırlar atlanır.

    Returns:
        Liste of dict: [{"domain": str, "category": str, "description": str}, ...]
    """
    txt_path = _MOCK_DIR / "phishing_domains.txt"

    if not txt_path.exists():
        raise FileNotFoundError(f"phishing_domains.txt bulunamadi: {txt_path}")

    domains: list[dict[str, str]] = []
    with txt_path.open(encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            parts = line.split("\t")
            if len(parts) >= 3:
                domains.append(
                    {
                        "domain": parts[0].strip(),
                        "category": parts[1].strip(),
                        "description": parts[2].strip(),
                    }
                )
    return domains
