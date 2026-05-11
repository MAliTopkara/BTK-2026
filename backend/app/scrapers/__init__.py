"""
TrustLens scraper registry — TASK-28.

URL'den platform tespit edip uygun scraper'ı döndürür.
graph.py scrape_node burayı kullanır; başarısız olursa mock_data fallback'i çalışır.
"""

from __future__ import annotations

from app.scrapers.base import BaseScraper, ScraperError, ScraperNotFound
from app.scrapers.hepsiburada import HepsiburadaScraper
from app.scrapers.trendyol import TrendyolScraper

__all__ = [
    "BaseScraper",
    "HepsiburadaScraper",
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
    return None


def get_scraper(platform: str) -> BaseScraper | None:
    """Platform adına göre scraper instance'ı döner."""
    if platform == "trendyol":
        return TrendyolScraper()
    if platform == "hepsiburada":
        return HepsiburadaScraper()
    return None
