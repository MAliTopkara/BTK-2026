"""
Scraper tests — TASK-28
Pure-Python helpers + URL/platform detection. Playwright entegrasyon testi
yok (CI'da Chromium kurulu olmayabilir; manuel script: scripts/scrape_smoke.py).
"""

from __future__ import annotations

from app.scrapers import detect_platform, get_scraper
from app.scrapers.trendyol import _extract_money


class TestExtractMoney:
    def test_simple_integer(self):
        assert _extract_money("1899 TL") == [1899.0]

    def test_turkish_thousands_separator(self):
        assert _extract_money("1.899,00 TL") == [1899.0]

    def test_turkish_with_kurus(self):
        assert _extract_money("4.999,99 TL") == [4999.99]

    def test_multiple_prices(self):
        # "1.899 TL ... 4.999 TL" — sahte indirim metni
        nums = _extract_money("1.899,00 TL 4.999,00 TL")
        assert nums == [1899.0, 4999.0]

    def test_ignores_small_numbers(self):
        # KDV oranı, yıldız sayısı vs. küçük sayılar dahil edilmez
        assert _extract_money("KDV %18 dahil — fiyat 1.899 TL") == [1899.0]

    def test_empty_string(self):
        assert _extract_money("") == []

    def test_no_numbers(self):
        assert _extract_money("fiyat sorgulanıyor...") == []


class TestPlatformDetection:
    def test_trendyol_url(self):
        assert detect_platform("https://www.trendyol.com/apple/airpods-p-123") == "trendyol"

    def test_trendyol_subdomain(self):
        assert detect_platform("https://ty.trendyol.com/x") == "trendyol"

    def test_hepsiburada_url(self):
        assert detect_platform("https://www.hepsiburada.com/laptop-p-HBC123") == "hepsiburada"

    def test_n11_url(self):
        assert detect_platform("https://www.n11.com/urun/foo-123") == "n11"

    def test_amazon_tr_url(self):
        assert detect_platform("https://www.amazon.com.tr/dp/B0ABC12345") == "amazon_tr"

    def test_unsupported(self):
        assert detect_platform("https://www.amazon.com/dp/x") is None
        assert detect_platform("https://example.com") is None

    def test_case_insensitive(self):
        assert detect_platform("HTTPS://WWW.TRENDYOL.COM/x") == "trendyol"


class TestGetScraper:
    def test_trendyol_instance(self):
        scraper = get_scraper("trendyol")
        assert scraper is not None
        assert scraper.platform == "trendyol"

    def test_hepsiburada_instance(self):
        scraper = get_scraper("hepsiburada")
        assert scraper is not None
        assert scraper.platform == "hepsiburada"

    def test_n11_instance(self):
        scraper = get_scraper("n11")
        assert scraper is not None
        assert scraper.platform == "n11"

    def test_amazon_tr_instance(self):
        scraper = get_scraper("amazon_tr")
        assert scraper is not None
        assert scraper.platform == "amazon_tr"

    def test_unknown_platform(self):
        assert get_scraper("ebay") is None
        assert get_scraper("") is None
