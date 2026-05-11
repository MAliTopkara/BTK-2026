"""
Gemini prompt şablonları — TrustLens AI
TASK-07: Tüm agent'ların kullandığı prompt fonksiyonları.

Her fonksiyon format edilmiş prompt string döndürür.
Değişkenler açık parametre olarak alınır — f-string injection yok.
"""

from __future__ import annotations

import json
from typing import Any

# ---------------------------------------------------------------------------
# Katman 1 — Sahte Yorum Tespiti
# ---------------------------------------------------------------------------

def review_analysis_prompt(reviews: list[dict[str, Any]]) -> str:
    """
    Yorum listesindeki jenerik/bot yorumları puanlar.
    0 = özgün, 1 = jenerik/şüpheli.

    Returns JSON: {"results": [0, 1, 0, ...], "suspicious_indices": [...]}
    """
    reviews_text = "\n".join(
        f"[{i}] ({r.get('rating', '?')} yıldız) {r.get('text', '')}"
        for i, r in enumerate(reviews)
    )
    count = len(reviews)
    return f"""Sen bir yorum analiz uzmanısın. Aşağıda bir e-ticaret ürününe ait {count} yorum var.

Her yorum için şu kriterlere göre puan ver:
- 0 = Özgün: Kişisel deneyim içeriyor, spesifik detay var, doğal dil kullanımı
- 1 = Şüpheli: Jenerik klişe ifadeler ("çok güzel", "tavsiye ederim"), içerik yok, bot izlenimi

YORUMLAR:
{reviews_text}

Sadece JSON döndür, başka açıklama ekleme:
{{
  "results": [0_veya_1, ...],
  "suspicious_indices": [şüpheli_indexler],
  "reasoning": "kısa gerekçe"
}}"""


# ---------------------------------------------------------------------------
# Katman 3 — Manipülatif Tasarım / Dark Patterns
# ---------------------------------------------------------------------------

def manipulation_detection_prompt(
    urgency_indicators: list[str],
    html_excerpt: str = "",
) -> str:
    """
    Dark pattern tespiti — aciliyet, sosyal kanıt manipülasyonu vb.

    Returns JSON: {"patterns_found": [...], "manipulation_score": 0-100}
    """
    urgency_text = "\n".join(f"- {u}" for u in urgency_indicators) if urgency_indicators else "(yok)"
    html_section = f"\nSAYFA İÇERİĞİ (kısaltılmış):\n{html_excerpt[:1500]}" if html_excerpt else ""

    return f"""Sen bir UX etiği uzmanısın. Aşağıdaki ürün sayfası verisi içerisinde manipülatif tasarım \
kalıplarını (dark patterns) tespit et.

ACİLİYET GÖSTERGELERİ:
{urgency_text}{html_section}

Tespit edilecek kategoriler:
1. fake_urgency — Sahte aciliyet: "Son X ürün", "X dakika sonra bitiyor"
2. fake_social_proof — Sahte sosyal kanıt: "X kişi izliyor", "X kişi bu ürünü aldı"
3. confirmshaming — Reddetme butonunda manipülatif dil
4. hidden_cost — Gizli maliyet sinyali
5. preselection — Otomatik eklenen sigorta/abonelik

Her bulgu için severity: "low" | "medium" | "high"
manipulation_score: 100 = tamamen temiz, 0 = son derece manipülatif

Sadece JSON döndür:
{{
  "patterns_found": [
    {{"type": "fake_urgency", "evidence": "metin", "severity": "high"}}
  ],
  "manipulation_score": 0_ile_100_arası_tam_sayı,
  "summary": "kısa özet"
}}"""


# ---------------------------------------------------------------------------
# Katman 5 — Görsel Doğrulama
# ---------------------------------------------------------------------------

def visual_analysis_prompt() -> str:
    """
    Ürün görselinin özgünlüğünü, AI üretimini ve logo tutarlılığını analiz eder.

    Returns JSON: {"authenticity_score": ..., "is_stock_photo": ..., ...}
    """
    return """Bu ürün görselini analiz et ve aşağıdaki soruları yanıtla:

1. Marka/logo görünür mü? Logo tutarlı ve orijinal görünüyor mu?
2. Fotoğraf profesyonel ürün fotoğrafı mı yoksa amatör çekim mi?
3. AI tarafından üretilmiş işaretler var mı? (sentetik doku, anatomi hataları, arka plan tutarsızlığı)
4. Ürün replika/sahte izlenimi veriyor mu? Neden?
5. Stok fotoğraf mı yoksa gerçek kullanıcı çekimi mi?

Sadece JSON döndür:
{
  "authenticity_score": 0_ile_100_arası_tam_sayı,
  "is_stock_photo": true_veya_false,
  "logo_consistency": "good" | "suspicious" | "inconsistent" | "none",
  "ai_generated_likelihood": 0_ile_1_arası_ondalık,
  "replica_risk": "low" | "medium" | "high",
  "flags": ["bulunan_sorun_1", "bulunan_sorun_2"],
  "reasoning": "kısa gerekçe"
}"""


# ---------------------------------------------------------------------------
# Katman 6 — Çapraz Platform (anahtar kelime çıkarımı)
# ---------------------------------------------------------------------------

def crossplatform_keyword_prompt(product_title: str) -> str:
    """
    Uzun ürün başlığından arama sorgusu için öz anahtar kelimeyi çıkarır.

    Returns JSON: {"search_query": "..."}
    """
    return f"""Aşağıdaki e-ticaret ürün başlığından arama sorgusu için en öz formu çıkar.
Sadece marka + model + nesil bilgisini tut, renk/boyut/satıcı bilgilerini at.

BAŞLIK: {product_title}

Örnek:
Girdi: "Apple AirPods Pro 2. Nesil USB-C Tip-C Şarj Kutulu Orijinal Kulaklık"
Çıktı: {{"search_query": "Apple AirPods Pro 2"}}

Sadece JSON döndür:
{{"search_query": "özleştirilmiş_sorgu"}}"""


# ---------------------------------------------------------------------------
# Katman 7 — Görsel OCR (metin çıkarma)
# ---------------------------------------------------------------------------

def ocr_extraction_prompt() -> str:
    """
    SMS/e-posta ekran görüntüsündeki tüm metni JSON formatında çıkarır.

    Returns JSON: {"extracted_text": "..."}
    """
    return """Bu görüntüdeki tüm metni olduğu gibi çıkar. \
Yazım hatalarını düzeltme, büyük/küçük harf değiştirme. \
Göremediğin veya okunamayan kısımlar için [OKUNAKSIZ] yaz.

Sadece JSON döndür:
{"extracted_text": "çıkarılan_metin_buraya"}"""


# ---------------------------------------------------------------------------
# Katman 7 — Phishing SMS/E-posta Analizi
# ---------------------------------------------------------------------------

def phishing_text_analysis_prompt(extracted_text: str) -> str:
    """
    OCR ile çıkarılan SMS/e-posta metninde phishing kalıplarını analiz eder.

    Returns JSON: {"phishing_score": ..., "flags": [...], "explanation": "..."}
    """
    safe_text = extracted_text[:2000]  # token tasarrufu
    return f"""Sen bir siber güvenlik uzmanısın. Aşağıdaki SMS/e-posta metnini dolandırıcılık \
(phishing) açısından analiz et.

METİN:
{safe_text}

Değerlendirme kriterleri:
1. Acil eylem talebi ("hemen tıklayın", "hesabınız kapatılacak")
2. Sahte kurumsal kimlik (PTT, banka, kargo, icra, e-devlet)
3. Kısaltılmış veya şüpheli URL
4. Yazım/dilbilgisi hataları (Türkçe'de yaygın phishing işareti)
5. Kişisel bilgi talebi (şifre, kart numarası, TC kimlik)
6. Sahte ödeme/iade teklifi

phishing_score: 0 = kesinlikle phishing, 100 = temiz/meşru
verdict: "PHISHING_CONFIRMED" | "PHISHING_SUSPECTED" | "SUSPICIOUS" | "CLEAN"

Sadece JSON döndür:
{{
  "phishing_score": 0_ile_100_arası_tam_sayı,
  "verdict": "PHISHING_CONFIRMED | PHISHING_SUSPECTED | SUSPICIOUS | CLEAN",
  "flags": ["tespit_edilen_kalıp_1", "tespit_edilen_kalıp_2"],
  "extracted_urls": ["url1", "url2"],
  "explanation": "kısa Türkçe açıklama"
}}"""


# ---------------------------------------------------------------------------
# Karar Motoru — Decision Agent Final Reasoning
# ---------------------------------------------------------------------------

def decision_agent_prompt(
    layer_results: list[dict[str, Any]],
    overall_score: int,
    verdict: str,
) -> str:
    """
    7 katman çıktısını birleştirip insan dilinde Türkçe karar üretir.
    Gemini 2.5 Pro + thinking modu için tasarlanmıştır.

    Args:
        layer_results: Her katmanın LayerResult dict listesi
        overall_score: 0-100 genel skor
        verdict: "BUY" | "CAUTION" | "AVOID"

    Returns JSON: {"reasoning_steps": [...], "final_explanation": "..."}
    """
    layers_json = json.dumps(layer_results, ensure_ascii=False, indent=2)
    verdict_tr = {"BUY": "AL", "CAUTION": "BEKLE/DİKKATLİ OL", "AVOID": "ALMA"}.get(verdict, verdict)

    return f"""Sen TrustLens AI'ın karar motorusun. Aşağıdaki 7 katman analizi sonuçlarını \
kullanıcıya samimi ve açıklayıcı bir Türkçe ile özetle.

KATMAN SONUÇLARI:
{layers_json}

GENEL SKOR: {overall_score}/100
KARAR: {verdict} ({verdict_tr})

GÖREVIN:
1. 4-6 adımlık akıl yürütme zinciri yaz (her adım 1-2 cümle).
2. Her adımda hangi katmandan ne sinyal aldığını açıkça belirt.
3. Skor ve karara ulaşma gerekçeni netleştir.
4. Final cümle: "Bu yüzden [AL/BEKLE/ALMA] diyorum, çünkü..." formatında.
5. Ton: Uzman ama samimi. Teknik jargon kullanma, anlaşılır konuş.

Sadece JSON döndür:
{{
  "reasoning_steps": [
    {{"step": 1, "content": "Önce fiyat geçmişine baktım..."}},
    {{"step": 2, "content": "Satıcı profiline geçince..."}},
    {{"step": 3, "content": "Yorumları incelediğimde..."}},
    {{"step": 4, "content": "Görseller ve marka uyumu..."}},
    {{"step": 5, "content": "Tüm bu sinyalleri bir araya getirince..."}}
  ],
  "final_explanation": "Bu ürünü [alma/al/dikkatlı ol] diyorum çünkü..."
}}"""


# ---------------------------------------------------------------------------
# Bonus 1 — Tüketici Hakem Heyeti Dilekçesi (TASK-32)
# ---------------------------------------------------------------------------

def petition_generation_prompt(
    user_info: dict[str, str],
    product_info: dict[str, Any],
    scan_summary: dict[str, Any],
    evidence_findings: list[str],
) -> str:
    """
    Tüketici Hakem Heyeti'ne sunulacak resmi dilekçe metnini üretir.
    PDF üretici (ReportLab) her bölümü ayrı render edebilir.

    Args:
        user_info: {"full_name", "tc_no", "address", "phone"}
        product_info: {"title", "url", "price_current", "platform", "seller_name", "purchase_date"}
        scan_summary: {"overall_score", "verdict", "scan_id", "scan_date"}
        evidence_findings: Katmanlardan çıkan kanıt cümleleri (örn. "Akakçe verisine göre
                          'indirim öncesi' fiyat son 90 günde hiç görülmemiş")

    Returns JSON:
        {
          "petition_title", "complainant_block", "defendant_block",
          "subject", "incident_paragraphs", "evidence_list",
          "demand", "closing", "annexes"
        }
    """
    user_json = json.dumps(user_info, ensure_ascii=False, indent=2)
    product_json = json.dumps(product_info, ensure_ascii=False, indent=2)
    scan_json = json.dumps(scan_summary, ensure_ascii=False, indent=2)
    evidence_text = "\n".join(f"- {e}" for e in evidence_findings) if evidence_findings else "(yok)"

    return f"""Sen Türk tüketici hukuku alanında uzman bir avukatsın. Tüketici Hakem Heyeti \
Başkanlığı'na sunulacak resmi bir dilekçe taslağı hazırla. Dilekçe TÜBİS (Tüketici Bilgi Sistemi) \
formatına uygun, ölçülü ve ispatlı bir dille yazılmalı.

ŞİKAYET EDEN (TÜKETİCİ):
{user_json}

ŞİKAYET KONUSU ÜRÜN:
{product_json}

TRUSTLENS ANALİZ ÖZETİ:
{scan_json}

KATMANLARDAN ÇIKAN KANITLAR:
{evidence_text}

DİLEKÇE KURALLARI:
1. Resmi ton: "Sayın Başkanlığa", "şikayetçi sıfatıyla", "tarafımdan satın alınmıştır"
2. 6502 sayılı Tüketici Korunması Hakkında Kanun'a atıfta bulun
3. Sahte indirim varsa: "yanıltıcı fiyat uygulaması" (md. 56)
4. Sahte yorum/aldatma varsa: "haksız ticari uygulama" (md. 62)
5. Talep nettir: bedel iadesi, ayıplı mal değişimi veya tazminat
6. Duygusal değil, kanıtlara dayalı dil kullan
7. Türkçe karakter (ç,ğ,ı,ö,ş,ü) kullanmaya dikkat et

Sadece JSON döndür, başka açıklama ekleme:
{{
  "petition_title": "T.C. ... TÜKETİCİ HAKEM HEYETİ BAŞKANLIĞINA",
  "complainant_block": "Şikayet eden bilgilerinin formatlı bloğu (ad, TC, adres, telefon)",
  "defendant_block": "Şikayet edilen satıcı/platform bilgileri",
  "subject": "Şikayet konusunun 1-2 cümlelik özeti (örn: 'Trendyol üzerinden alınan ürünün yanıltıcı indirim uygulaması nedeniyle bedel iadesi talebidir')",
  "incident_paragraphs": [
    "İlk paragraf: Olayın kronolojik özeti, alış tarihi, ürün, fiyat",
    "İkinci paragraf: TrustLens analiz bulgularının somut anlatımı, hangi maddeleri ihlal ettiği",
    "Üçüncü paragraf: Bu ihlalin tüketici üzerindeki maddi/manevi etkisi"
  ],
  "evidence_list": [
    "Trendyol ürün linki: <url>",
    "TrustLens tarama raporu (Tarama ID: <scan_id>)",
    "Akakçe fiyat geçmişi ekran görüntüsü",
    "Diğer somut kanıtlar"
  ],
  "demand": "Talep paragrafı: ne istiyorsunuz? (bedel iadesi / ayıplı mal değişimi / cezai işlem)",
  "closing": "Saygılarımla arz ederim. — Tarih: <gün ay yıl>",
  "annexes": ["Ek-1: ...", "Ek-2: ..."]
}}"""
