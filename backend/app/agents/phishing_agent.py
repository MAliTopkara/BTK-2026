"""
Katman 7 — Phishing Tarama
TASK-23: SMS/e-posta ekran görüntüsünde OCR + URL blacklist + Gemini analizi.
Bu katman yalnızca POST /api/scan/phishing endpoint'iyle aktif olur.
"""

from __future__ import annotations

import logging
import re
from pathlib import Path

from app.agents.base import BaseAgent
from app.models.scan import LayerResult, ProductData
from app.services.gemini import analyze_image, generate_json
from app.utils.prompts import ocr_extraction_prompt, phishing_text_analysis_prompt

logger = logging.getLogger(__name__)

# Phishing domain kara listesi dosyası
_BLACKLIST_PATH = Path(__file__).parent.parent.parent / "mock_data" / "phishing_domains.txt"

# Phishing skoru eşikleri
_RISK_THRESHOLD = 40    # bu altı RISK (0 = kesin phishing)
_WARN_THRESHOLD = 70    # bu altı WARN


def _load_blacklist() -> frozenset[str]:
    """phishing_domains.txt'den domain listesini yükler."""
    try:
        domains: set[str] = set()
        for line in _BLACKLIST_PATH.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            domain = line.split()[0].lower()
            if domain:
                domains.add(domain)
        return frozenset(domains)
    except OSError as exc:
        logger.warning("Phishing kara listesi yüklenemedi: %s", exc)
        return frozenset()


# Modül yüklenirken bir kez yükle
_BLACKLIST: frozenset[str] = _load_blacklist()

# URL çıkarma regex
_URL_PATTERN = re.compile(
    r"https?://[^\s\]\"'<>)]+|"
    r"(?<!\w)[a-zA-Z0-9](?:[a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?\."
    r"(?:com|net|org|info|xyz|online|site|tk|ml|ga|cf|gq|click|link|live|top|shop|store)"
    r"(?:/[^\s]*)?",
    re.IGNORECASE,
)


class PhishingAgent(BaseAgent):
    layer_id = "phishing"
    name = "Phishing Tarama"

    async def analyze(self, product: ProductData) -> LayerResult:
        """
        Standart ürün taramasında bu katman pasif — INFO döner.
        Gerçek analiz için analyze_phishing_image() kullan.
        """
        return LayerResult(
            layer_id=self.layer_id,
            name=self.name,
            status="INFO",
            score=None,
            finding="Phishing taraması görsel yükleme ile yapılır (/api/scan/phishing)",
            details={},
            confidence=0.0,
        )

    async def analyze_phishing_image(
        self,
        image_bytes: bytes,
        image_mime: str = "image/jpeg",
    ) -> LayerResult:
        """
        SMS/e-posta ekran görüntüsünü analiz eder.

        1. Gemini Vision ile OCR
        2. URL'leri çek, kara listeyle karşılaştır
        3. Gemini Flash ile phishing metin analizi
        """
        # -- Adım 1: OCR --
        extracted_text = await _ocr_image(image_bytes, image_mime)
        if not extracted_text:
            return LayerResult(
                layer_id=self.layer_id,
                name=self.name,
                status="INFO",
                score=None,
                finding="Görselden metin çıkarılamadı",
                details={"extracted_text": ""},
                confidence=0.0,
            )

        # -- Adım 2: URL çıkar + kara liste --
        urls_found = _extract_urls(extracted_text)
        blacklisted = _check_blacklist(urls_found)

        # -- Adım 3: Gemini metin analizi --
        gemini_result = await _gemini_analyze_text(extracted_text)
        phishing_score: int = gemini_result.get("phishing_score", 50)
        verdict: str = gemini_result.get("verdict", "SUSPICIOUS")
        flags: list[str] = gemini_result.get("flags", [])
        gemini_urls: list[str] = gemini_result.get("extracted_urls", [])
        explanation: str = gemini_result.get("explanation", "")

        # Gemini'den gelen URL'leri yerel regex sonuçlarıyla birleştir
        all_urls = list(dict.fromkeys(urls_found + gemini_urls))

        # Kara listede domain varsa skoru düşür
        if blacklisted:
            phishing_score = min(phishing_score, 10)
            verdict = "PHISHING_CONFIRMED"
            flags.extend([f"Kara listede: {d}" for d in blacklisted])

        url_checks = _build_url_checks(all_urls, blacklisted)

        status = _score_to_status(phishing_score)
        finding = _build_finding(verdict, phishing_score, blacklisted, explanation)

        return LayerResult(
            layer_id=self.layer_id,
            name=self.name,
            status=status,
            score=phishing_score,
            finding=finding,
            details={
                "extracted_text": extracted_text[:500],
                "urls_found": all_urls,
                "url_checks": url_checks,
                "blacklisted_domains": list(blacklisted),
                "verdict": verdict,
                "flags": flags,
                "explanation": explanation,
            },
            confidence=0.85,
        )


# ---------------------------------------------------------------------------
# Yardımcı fonksiyonlar
# ---------------------------------------------------------------------------

async def _ocr_image(image_bytes: bytes, image_mime: str) -> str:
    """Gemini Vision ile görüntüdeki metni çıkarır."""
    try:
        result = await analyze_image(
            prompt=ocr_extraction_prompt(),
            image_bytes=image_bytes,
            image_mime=image_mime,
        )
        text = result.get("extracted_text", "")
        return text.strip() if isinstance(text, str) else ""
    except Exception as exc:
        logger.warning("OCR hatası: %s", exc)
        return ""


async def _gemini_analyze_text(text: str) -> dict:
    """Gemini Flash ile phishing metin analizi yapar."""
    try:
        return await generate_json(phishing_text_analysis_prompt(text))
    except Exception as exc:
        logger.warning("Phishing metin analiz hatası: %s", exc)
        return {
            "phishing_score": 50,
            "verdict": "SUSPICIOUS",
            "flags": [],
            "extracted_urls": [],
            "explanation": "Analiz tamamlanamadı",
        }


def _extract_urls(text: str) -> list[str]:
    """Metinden URL'leri regex ile çıkarır."""
    found = _URL_PATTERN.findall(text)
    # Tekrar edenleri kaldır, sırayı koru
    seen: set[str] = set()
    result: list[str] = []
    for url in found:
        url_lower = url.lower().rstrip(".,;)")
        if url_lower not in seen:
            seen.add(url_lower)
            result.append(url_lower)
    return result[:20]  # maks 20 URL


def _extract_domain(url: str) -> str:
    """URL'den sadece domain adını çıkarır."""
    url = re.sub(r"^https?://", "", url)
    url = url.split("/")[0].split("?")[0].split(":")[0]
    # www. prefix'ini kaldır
    if url.startswith("www."):
        url = url[4:]
    return url.lower()


def _check_blacklist(urls: list[str]) -> set[str]:
    """URL listesinden kara listede olanları döndürür."""
    blacklisted: set[str] = set()
    for url in urls:
        domain = _extract_domain(url)
        if domain in _BLACKLIST:
            blacklisted.add(domain)
    return blacklisted


def _build_url_checks(urls: list[str], blacklisted: set[str]) -> list[dict]:
    """Her URL için kontrol sonucunu döndürür."""
    checks: list[dict] = []
    for url in urls:
        domain = _extract_domain(url)
        checks.append({
            "url": url,
            "domain": domain,
            "in_blacklist": domain in blacklisted,
        })
    return checks


def _score_to_status(score: int) -> str:
    """Phishing skoru → LayerResult status (düşük skor = daha kötü)."""
    if score < _RISK_THRESHOLD:
        return "RISK"
    if score < _WARN_THRESHOLD:
        return "WARN"
    return "OK"


def _build_finding(
    verdict: str,
    score: int,
    blacklisted: set[str],
    explanation: str,
) -> str:
    if verdict == "PHISHING_CONFIRMED":
        if blacklisted:
            domains_str = ", ".join(list(blacklisted)[:2])
            return f"Phishing tespit edildi — kara listede: {domains_str}"
        return "Phishing içerik tespit edildi"
    if verdict == "PHISHING_SUSPECTED":
        return f"Phishing şüphesi var (skor: {score}/100)"
    if verdict == "SUSPICIOUS":
        return explanation[:120] if explanation else "Şüpheli içerik — dikkatli olun"
    return "İçerik temiz görünüyor"
