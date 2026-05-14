from __future__ import annotations

from fastapi import APIRouter, File, HTTPException, UploadFile, status

from app.agents.phishing_agent import PhishingAgent
from app.models.scan import LayerResult, ScanRequest, ScanResult
from app.orchestrator.mock_runner import run_mock_scan
from app.scrapers import detect_platform

router = APIRouter(tags=["scan"])

_phishing_agent = PhishingAgent()

# Desteklenen platformlar — kullanıcı mesajı için
_SUPPORTED_PLATFORMS = {
    "trendyol.com",
    "hepsiburada.com",
    "n11.com",
    "amazon.com.tr",
}
_PLATFORM_NAMES = "Trendyol, Hepsiburada, N11 veya Amazon TR"


@router.post("/scan", response_model=ScanResult)
async def scan_product(request: ScanRequest) -> ScanResult:
    # 1) Protokol zorunlu
    if not request.url.startswith(("http://", "https://")):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=(
                "Geçersiz URL. http:// veya https:// ile başlayan tam bir bağlantı girin. "
                "Örnek: https://www.trendyol.com/..."
            ),
        )

    # 2) Desteklenmeyen platform → 422
    platform = detect_platform(request.url)
    if platform is None:
        # Bilinen ama desteklenmeyen domain'ler için özel mesaj
        url_lower = request.url.lower()
        if any(d in url_lower for d in ("gittigidiyor", "ciceksepeti", "boyner", "zara", "amazon.com/", "amazon.de")):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail=(
                    "Bu site şu an desteklenmiyor. "
                    f"TrustLens şu an yalnızca {_PLATFORM_NAMES} URL'lerini analiz edebilir."
                ),
            )
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=(
                f"Desteklenmeyen platform. "
                f"Geçerli bir {_PLATFORM_NAMES} ürün linki girin."
            ),
        )

    try:
        return await run_mock_scan(request.url, force_refresh=request.force_refresh)
    except ValueError as exc:
        err_msg = str(exc)
        # Scraping başarısız / ürün bulunamadı
        if "analiz edilemiyor" in err_msg or "eşleşmiyor" in err_msg:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=(
                    "Bu ürün şu an analiz edilemiyor. "
                    "Sayfa bot koruması, anti-scraping veya ağ engeli nedeniyle "
                    "erişilemiyor olabilir. "
                    "Aşağıdaki demo URL'lerinden birini veya farklı bir ürün bağlantısını deneyin."
                ),
            ) from exc
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=err_msg,
        ) from exc
    except RuntimeError as exc:
        err_msg = str(exc)
        # Gemini / AI servisi hatası
        if "Gemini" in err_msg or "AI" in err_msg or "denemede başarısız" in err_msg:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=(
                    "AI servisi şu an yavaş yanıt veriyor. "
                    "Lütfen birkaç saniye bekleyip tekrar deneyin."
                ),
            ) from exc
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Tarama sırasında beklenmedik bir hata oluştu: {err_msg[:200]}",
        ) from exc


@router.get("/scan/debug/akakce")
async def debug_akakce(q: str = "Apple iPhone 15 128 GB") -> dict:
    """Akakçe servisini scraper'dan bağımsız test eder (geçici diagnostic endpoint)."""
    from app.services.akakce import fetch_akakce_summary  # noqa: PLC0415

    diagnostics: dict = {}
    result = await fetch_akakce_summary(q, diagnostics=diagnostics)
    if result:
        return {
            "success": True,
            "seller_count": result.seller_count,
            "min_price": result.min_price,
            "max_price": result.max_price,
            "avg_price": round(result.avg_price, 2),
            "product_url": result.product_url,
            "diagnostics": diagnostics,
        }
    return {"success": False, "diagnostics": diagnostics}


@router.post("/scan/phishing", response_model=LayerResult)
async def scan_phishing(
    file: UploadFile = File(..., description="SMS/e-posta ekran görüntüsü"),
) -> LayerResult:
    # TASK-23: Phishing endpoint — Gemini Vision OCR + URL kara liste + metin analizi
    _ALLOWED_MIME = {"image/jpeg", "image/png", "image/webp", "image/gif"}
    mime = file.content_type or "image/jpeg"
    if mime not in _ALLOWED_MIME:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=f"Desteklenmeyen dosya türü: {mime}. Kabul edilenler: jpeg, png, webp",
        )

    image_bytes = await file.read()
    if len(image_bytes) == 0:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="Boş dosya yüklendi",
        )
    if len(image_bytes) > 10 * 1024 * 1024:  # 10 MB limit
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="Dosya boyutu 10 MB limitini aşıyor",
        )

    return await _phishing_agent.analyze_phishing_image(image_bytes, mime)
