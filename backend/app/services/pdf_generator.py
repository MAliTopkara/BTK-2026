"""
PDF Dilekçe Üreticisi — TrustLens AI
TASK-32: Tüketici Hakem Heyeti dilekçesi (ReportLab + Gemini).

Akış:
  1. Gemini Flash → dilekçe JSON üret (petition_generation_prompt)
  2. ReportLab → PDF'e döndür (Türkçe karakter destekli)
  3. PDF bytes döndür
"""

from __future__ import annotations

import io
import logging
from datetime import date
from pathlib import Path
from typing import TYPE_CHECKING

from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer

from app.services.gemini import generate_json
from app.utils.prompts import petition_generation_prompt

if TYPE_CHECKING:
    from app.models.scan import ScanResult

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Font kaydı — repoya gömülü DejaVu Sans (Türkçe karakter desteği)
# Helvetica WinAnsi'dir ve ç/ş/ğ/İ render edemez. DejaVu Sans Unicode TTF.
# ---------------------------------------------------------------------------

_FONTS_DIR = Path(__file__).resolve().parent.parent / "assets" / "fonts"
_BODY_FONT_NAME = "DejaVuSans"
_BOLD_FONT_NAME = "DejaVuSans-Bold"
_FONT_REGISTERED = False


def _register_fonts() -> None:
    """DejaVu Sans TTF'lerini bir kez kaydeder. İkinci çağrıda no-op."""
    global _FONT_REGISTERED  # noqa: PLW0603
    if _FONT_REGISTERED:
        return
    regular = _FONTS_DIR / "DejaVuSans.ttf"
    bold = _FONTS_DIR / "DejaVuSans-Bold.ttf"
    if not regular.is_file() or not bold.is_file():
        raise RuntimeError(
            f"DejaVu Sans TTF dosyaları bulunamadı: {_FONTS_DIR}. "
            "Türkçe karakter desteği için bu fontlar gereklidir."
        )
    pdfmetrics.registerFont(TTFont(_BODY_FONT_NAME, str(regular)))
    pdfmetrics.registerFont(TTFont(_BOLD_FONT_NAME, str(bold)))
    _FONT_REGISTERED = True
    logger.info("DejaVu Sans kaydedildi (Türkçe PDF desteği aktif)")


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

async def generate_petition_pdf(
    scan: ScanResult,
    user_full_name: str,
    tc_no: str,
    address: str,
    phone: str,
) -> bytes:
    """
    ScanResult + kullanıcı bilgilerinden PDF dilekçe üretir.

    Args:
        scan: Tamamlanmış tarama sonucu
        user_full_name: Ad Soyad
        tc_no: TC Kimlik No
        address: Açık adres
        phone: Telefon numarası

    Returns:
        PDF dosyasının bytes içeriği
    """
    _register_fonts()

    user_info = {
        "full_name": user_full_name,
        "tc_no": tc_no,
        "address": address,
        "phone": phone,
    }

    product_info = {
        "title": scan.product.title,
        "url": scan.url,
        "price_current": scan.product.price_current,
        "price_original": scan.product.price_original,
        "platform": scan.product.platform,
        "seller_name": scan.product.seller.name,
        "purchase_date": date.today().strftime("%d.%m.%Y"),
    }

    scan_summary = {
        "overall_score": scan.overall_score,
        "verdict": scan.verdict,
        "scan_id": str(scan.scan_id),
        "scan_date": scan.created_at.strftime("%d.%m.%Y") if hasattr(scan.created_at, "strftime") else str(scan.created_at)[:10],
    }

    # RISK/WARN katmanlarından kanıt cümleleri
    evidence_findings = [
        f"{r.name}: {r.finding}"
        for r in scan.layer_results.values()
        if r.status in ("RISK", "WARN") and r.finding
    ]

    # Gemini → dilekçe metni
    prompt = petition_generation_prompt(user_info, product_info, scan_summary, evidence_findings)
    try:
        petition_data = await generate_json(prompt)
    except Exception as exc:
        logger.warning("Gemini dilekçe üretilemedi, fallback şablon kullanılıyor: %s", exc)
        petition_data = _fallback_petition(user_info, product_info, scan_summary, evidence_findings)

    return _build_pdf(petition_data, user_info, scan_summary)


# ---------------------------------------------------------------------------
# PDF oluşturucu
# ---------------------------------------------------------------------------

def _build_pdf(
    data: dict,
    user_info: dict,
    scan_summary: dict,
) -> bytes:
    """ReportLab ile dilekçe PDF'i oluşturur."""
    buf = io.BytesIO()

    doc = SimpleDocTemplate(
        buf,
        pagesize=A4,
        rightMargin=2.5 * cm,
        leftMargin=2.5 * cm,
        topMargin=2.5 * cm,
        bottomMargin=2.5 * cm,
    )

    body_font = _BODY_FONT_NAME
    bold_font = _BOLD_FONT_NAME

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        "TitleStyle",
        parent=styles["Normal"],
        fontName=bold_font,
        fontSize=13,
        spaceAfter=18,
        alignment=1,  # CENTER
    )
    bold_style = ParagraphStyle(
        "BoldStyle",
        parent=styles["Normal"],
        fontName=bold_font,
        fontSize=10,
        spaceAfter=6,
    )
    normal_style = ParagraphStyle(
        "NormalStyle",
        parent=styles["Normal"],
        fontName=body_font,
        fontSize=10,
        spaceAfter=8,
        leading=15,
    )
    small_style = ParagraphStyle(
        "SmallStyle",
        parent=styles["Normal"],
        fontName=body_font,
        fontSize=9,
        spaceAfter=5,
        textColor=(0.3, 0.3, 0.3),
    )

    story = []

    # Başlık
    title = data.get("petition_title", "T.C. TÜKETİCİ HAKEM HEYETİ BAŞKANLIĞINA")
    story.append(Paragraph(_safe(title), title_style))
    story.append(Spacer(1, 0.4 * cm))

    # Şikayet eden
    story.append(Paragraph("ŞİKAYET EDEN (TÜKETİCİ):", bold_style))
    story.append(Paragraph(_safe(data.get("complainant_block", "")), normal_style))
    story.append(Spacer(1, 0.3 * cm))

    # Şikayet edilen
    story.append(Paragraph("ŞİKAYET EDİLEN:", bold_style))
    story.append(Paragraph(_safe(data.get("defendant_block", "")), normal_style))
    story.append(Spacer(1, 0.3 * cm))

    # Konu
    story.append(Paragraph("KONU:", bold_style))
    story.append(Paragraph(_safe(data.get("subject", "")), normal_style))
    story.append(Spacer(1, 0.4 * cm))

    # Olay anlatımı
    story.append(Paragraph("AÇIKLAMALAR:", bold_style))
    for para in data.get("incident_paragraphs", []):
        story.append(Paragraph(_safe(para), normal_style))
    story.append(Spacer(1, 0.3 * cm))

    # Kanıtlar
    evidence = data.get("evidence_list", [])
    if evidence:
        story.append(Paragraph("DELİLLER:", bold_style))
        for ev in evidence:
            story.append(Paragraph(f"• {_safe(ev)}", normal_style))
        story.append(Spacer(1, 0.3 * cm))

    # Talep
    demand = data.get("demand", "")
    if demand:
        story.append(Paragraph("TALEP:", bold_style))
        story.append(Paragraph(_safe(demand), normal_style))
        story.append(Spacer(1, 0.3 * cm))

    # Kapanış
    closing = data.get("closing", f"Saygılarımla arz ederim.\n{date.today().strftime('%d.%m.%Y')}")
    story.append(Spacer(1, 0.5 * cm))
    story.append(Paragraph(_safe(closing), normal_style))
    story.append(Spacer(1, 1 * cm))
    story.append(Paragraph(f"İmza: {_safe(user_info.get('full_name', ''))}", normal_style))

    # Ekler
    annexes = data.get("annexes", [])
    if annexes:
        story.append(Spacer(1, 0.5 * cm))
        story.append(Paragraph("EKLER:", bold_style))
        for ann in annexes:
            story.append(Paragraph(f"• {_safe(ann)}", normal_style))

    # TrustLens footer
    story.append(Spacer(1, 0.8 * cm))
    story.append(Paragraph(
        f"Bu dilekçe TrustLens AI tarafından üretilmiştir. "
        f"Tarama ID: {scan_summary.get('scan_id', '')[:8]} · "
        f"Skor: {scan_summary.get('overall_score', 0)}/100 · "
        f"Karar: {scan_summary.get('verdict', '')}",
        small_style,
    ))

    doc.build(story)
    return buf.getvalue()


# ---------------------------------------------------------------------------
# Yardımcılar
# ---------------------------------------------------------------------------

def _safe(text: str) -> str:
    """HTML özel karakterlerini ve None'u escape eder."""
    if not text:
        return ""
    return (
        str(text)
        .replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace("\n", "<br/>")
    )


def _fallback_petition(
    user_info: dict,
    product_info: dict,
    scan_summary: dict,
    evidence_findings: list[str],
) -> dict:
    """Gemini başarısız olursa kullanılan minimal şablon."""
    return {
        "petition_title": "T.C. TÜKETİCİ HAKEM HEYETİ BAŞKANLIĞINA",
        "complainant_block": (
            f"Ad Soyad: {user_info.get('full_name', '')}\n"
            f"TC Kimlik No: {user_info.get('tc_no', '')}\n"
            f"Adres: {user_info.get('address', '')}\n"
            f"Telefon: {user_info.get('phone', '')}"
        ),
        "defendant_block": (
            f"Platform: {product_info.get('platform', '').upper()}\n"
            f"Satıcı: {product_info.get('seller_name', '')}\n"
            f"Ürün URL: {product_info.get('url', '')}"
        ),
        "subject": (
            f"{product_info.get('platform', '').capitalize()} üzerinden satın alınan "
            f"'{product_info.get('title', '')}' ürününe ilişkin şikayet."
        ),
        "incident_paragraphs": [
            (
                f"Şikayet konusu ürün {product_info.get('platform', '').capitalize()} "
                f"platformunda '{product_info.get('seller_name', '')}' satıcısından "
                f"{product_info.get('price_current', 0)} TL bedelle incelendi. "
                f"Ürün URL'si: {product_info.get('url', '')}"
            ),
            (
                f"TrustLens AI analiz aracı, söz konusu ürün için aşağıdaki bulgulara ulaşmıştır "
                f"(Genel Güven Skoru: {scan_summary.get('overall_score', 0)}/100, "
                f"Karar: {scan_summary.get('verdict', '')}): "
                + "; ".join(evidence_findings[:3])
            ),
            (
                "Bahsi geçen bulgular, 6502 sayılı Tüketici Korunması Hakkında Kanun kapsamında "
                "yanıltıcı uygulama teşkil etmektedir. Tüketici olarak mağdur edildiğimden "
                "gereğinin yapılmasını saygıyla arz ederim."
            ),
        ],
        "evidence_list": [
            f"Ürün sayfası: {product_info.get('url', '')}",
            f"TrustLens Tarama Raporu (ID: {scan_summary.get('scan_id', '')[:8]})",
        ] + [f"Bulgu: {e}" for e in evidence_findings[:3]],
        "demand": (
            "6502 sayılı Kanun'un 56. maddesi uyarınca yanıltıcı fiyat uygulamasının tespiti "
            "ve tarafıma ödenen tutarın iadesi ya da ürünün değiştirilerek teslimi talep edilmektedir."
        ),
        "closing": f"Saygılarımla arz ederim.\n{date.today().strftime('%d.%m.%Y')}",
        "annexes": [
            "Ek-1: TrustLens Tarama Ekran Görüntüsü",
            "Ek-2: Ürün Sayfası Ekran Görüntüsü",
        ],
    }
