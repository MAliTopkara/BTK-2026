"""
TrustLens scraper registry.

URL'den platform tespit edip uygun scraper'ı döndürür.
graph.py scrape_node burayı kullanır; başarısız olursa kullanıcıya net hata.

Desteklenen platformlar (Mayıs 2026):
  - Trendyol (trendyol.com)
  - Hepsiburada (hepsiburada.com)
  - N11 (n11.com)
  - Amazon TR (amazon.com.tr)
"""

from __future__ import annotations

from app.scrapers.amazon_tr import AmazonTRScraper
from app.scrapers.base import BaseScraper, ScraperError, ScraperNotFound
from app.scrapers.hepsiburada import HepsiburadaScraper
from app.scrapers.n11 import N11Scraper
from app.scrapers.trendyol import TrendyolScraper

__all__ = [
    "AmazonTRScraper",
    "BaseScraper",
    "HepsiburadaScraper",
    "N11Scraper",
    "ScraperError",
    "ScraperNotFound",
    "TrendyolScraper",
    "detect_platform",
    "get_scraper",
]


def detect_platform(url: str) -> str | None:
    """URL'den platform tespit eder."""
    url_lower = url.lower()
    if "trendyol.com" in url_lower:
        return "trendyol"
    if "hepsiburada.com" in url_lower:
        return "hepsiburada"
    if "n11.com" in url_lower:
        return "n11"
    if "amazon.com.tr" in url_lower:
        return "amazon_tr"
    return None


def get_scraper(platform: str) -> BaseScraper | None:
    """Platform adına göre scraper instance'ı döner."""
    if platform == "trendyol":
        return TrendyolScraper()
    if platform == "hepsiburada":
        return HepsiburadaScraper()
    if platform == "n11":
        return N11Scraper()
    if platform == "amazon_tr":
        return AmazonTRScraper()
    return None
