"""
Sahte phishing SMS ekran görüntüsü üreteci — TrustLens AI

TASK-06: phishing_sms.png mock dosyasını üretir.
TASK-23 (Phishing Agent) için Vision API'nin OCR test girdisi olarak kullanılır.

Kullanım:
    cd backend
    uv run python mock_data/generate_phishing_sms.py

Çıktı:
    backend/mock_data/phishing_sms.png  (iOS Mesajlar tarzı, koyu tema)

Senaryo:
    Sahte PTT Kargo bilgilendirmesi.
    İçinde phishing_domains.txt'te listelenen `pttkargo-takip-sorgula.com`
    sahte URL'i mevcut. Acil eylem talebi (3 gün içinde iade) ile dolandırıcılık.
"""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

# iOS Mesajlar koyu tema renkleri
BG = (28, 28, 30)
HEADER_BG = (44, 44, 46)
DIVIDER = (60, 60, 62)
BUBBLE = (58, 58, 60)
TEXT = (255, 255, 255)
TEXT_DIM = (174, 174, 178)
GREEN = (48, 209, 88)
URL_BLUE = (64, 156, 255)

# Canvas
W, H = 414, 760  # iPhone Pro genişliği yaklaşık


def _load_font(size: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    """Sistemdeki Türkçe destekli font'u yükle, yoksa default'a düş."""
    candidates = [
        "C:/Windows/Fonts/segoeui.ttf",   # Windows Segoe UI
        "C:/Windows/Fonts/arial.ttf",      # Windows Arial
        "/System/Library/Fonts/Helvetica.ttc",  # macOS
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",  # Linux
    ]
    for path in candidates:
        try:
            return ImageFont.truetype(path, size)
        except OSError:
            continue
    return ImageFont.load_default()


def generate(output_path: Path) -> None:
    """Phishing SMS görseli üret ve PNG olarak kaydet."""
    img = Image.new("RGB", (W, H), BG)
    draw = ImageDraw.Draw(img)

    font_status = _load_font(13)
    font_back = _load_font(15)
    font_sender = _load_font(17)
    font_subtitle = _load_font(12)
    font_msg = _load_font(15)
    font_time = _load_font(11)

    # ── Status bar ───────────────────────────────────────
    draw.rectangle([0, 0, W, 44], fill=BG)
    draw.text((24, 14), "14:23", fill=TEXT, font=font_status)
    draw.text((W - 80, 14), "100%", fill=TEXT, font=font_status)
    # Pil ikonu (basit dikdörtgen)
    draw.rounded_rectangle([W - 50, 13, W - 26, 26], radius=3, outline=TEXT, width=1)
    draw.rectangle([W - 48, 16, W - 28, 23], fill=GREEN)

    # ── Header (gönderici bilgisi) ───────────────────────
    draw.rectangle([0, 44, W, 120], fill=HEADER_BG)
    draw.line([(0, 120), (W, 120)], fill=DIVIDER, width=1)

    # Geri butonu
    draw.text((16, 60), "‹ Mesajlar", fill=GREEN, font=font_back)

    # Gönderici
    sender_text = "PTT Kargo"
    bbox = draw.textbbox((0, 0), sender_text, font=font_sender)
    sender_w = bbox[2] - bbox[0]
    draw.text(((W - sender_w) // 2, 56), sender_text, fill=TEXT, font=font_sender)

    subtitle = "5454 · Bilgilendirme"
    bbox2 = draw.textbbox((0, 0), subtitle, font=font_subtitle)
    sub_w = bbox2[2] - bbox2[0]
    draw.text(((W - sub_w) // 2, 82), subtitle, fill=TEXT_DIM, font=font_subtitle)

    # ── Tarih ayraç ──────────────────────────────────────
    date_text = "Bugün 14:23"
    bbox3 = draw.textbbox((0, 0), date_text, font=font_time)
    date_w = bbox3[2] - bbox3[0]
    draw.text(((W - date_w) // 2, 145), date_text, fill=TEXT_DIM, font=font_time)

    # ── Mesaj balonu (sol hizalı, gelen mesaj) ───────────
    msg_lines = [
        "Sayın müşterimiz,",
        "",
        "Kargonuz adres bilgisi eksikliği",
        "nedeniyle teslim edilemedi.",
        "",
        "Adres bilgilerinizi güncellemek için:",
        "pttkargo-takip-sorgula.com",
        "",
        "Aksi takdirde kargonuz 3 gün içinde",
        "iade edilecektir.",
    ]

    bubble_x = 16
    bubble_y = 175
    bubble_w = 320
    line_h = 22
    pad_x = 18
    pad_y = 14
    bubble_h = pad_y * 2 + len(msg_lines) * line_h

    # Balon
    draw.rounded_rectangle(
        [bubble_x, bubble_y, bubble_x + bubble_w, bubble_y + bubble_h],
        radius=20,
        fill=BUBBLE,
    )

    # Mesaj satırları
    for i, line in enumerate(msg_lines):
        y = bubble_y + pad_y + i * line_h
        if "pttkargo-takip-sorgula" in line:
            # URL'i mavi + altı çizili
            draw.text((bubble_x + pad_x, y), line, fill=URL_BLUE, font=font_msg)
            # Basit alt çizgi
            url_bbox = draw.textbbox((0, 0), line, font=font_msg)
            url_w = url_bbox[2] - url_bbox[0]
            draw.line(
                [
                    (bubble_x + pad_x, y + 18),
                    (bubble_x + pad_x + url_w, y + 18),
                ],
                fill=URL_BLUE,
                width=1,
            )
        else:
            draw.text((bubble_x + pad_x, y), line, fill=TEXT, font=font_msg)

    # ── Saat (mesajın altı) ──────────────────────────────
    draw.text(
        (bubble_x + 8, bubble_y + bubble_h + 8),
        "Teslim edildi · 14:23",
        fill=TEXT_DIM,
        font=font_time,
    )

    # ── Kaydet ───────────────────────────────────────────
    img.save(output_path, "PNG", optimize=True)
    print(f"[OK] Uretildi: {output_path} ({W}x{H})")


if __name__ == "__main__":
    output = Path(__file__).parent / "phishing_sms.png"
    generate(output)
