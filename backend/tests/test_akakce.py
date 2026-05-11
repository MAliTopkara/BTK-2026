"""
Akakçe servisi — pure-Python helper testleri (TASK-29).
Canlı network testi yok — fetch_akakce_summary için scripts/akakce_inspect.py.
"""

from __future__ import annotations

from datetime import date

from app.services.akakce import (
    AkakceResult,
    _denoise_prices,
    _parse_price,
    synthesize_history,
)


class TestParsePrice:
    def test_thousands_with_decimal(self):
        assert _parse_price("5.399,00 TL") == 5399.0

    def test_thousands_only(self):
        # "13.162" Akakçe formatında 13162 TL (kuruşlar gizli)
        assert _parse_price("13.162") == 13162.0

    def test_thousands_with_kurus(self):
        assert _parse_price("1.598,99 TL") == 1598.99

    def test_no_thousands_decimal(self):
        assert _parse_price("999,50") == 999.5

    def test_plain_integer(self):
        assert _parse_price("12097") == 12097.0

    def test_empty(self):
        assert _parse_price("") is None

    def test_no_number(self):
        assert _parse_price("fiyatı sorgula") is None


class TestDenoisePrices:
    def test_no_reference_returns_unchanged(self):
        prices = [100.0, 200.0, 300.0]
        assert _denoise_prices(prices, None) == prices

    def test_filters_accessories_below_floor(self):
        # current=1000, floor=400. 50 ve 200 atılmalı
        prices = [50.0, 200.0, 800.0, 1100.0, 1200.0, 1500.0]
        result = _denoise_prices(prices, reference=1000.0)
        assert 50.0 not in result
        assert 200.0 not in result
        assert 800.0 in result

    def test_filters_premium_variants_above_ceil(self):
        # current=1000, ceil=2500. 5000 atılmalı
        prices = [800.0, 1100.0, 1500.0, 2000.0, 5000.0]
        result = _denoise_prices(prices, reference=1000.0)
        assert 5000.0 not in result
        assert 1500.0 in result

    def test_falls_back_when_filter_too_aggressive(self):
        # Reference 100 (yanlış), tüm fiyatlar 1000+. Filtre %70+'yı atarsa
        # ham listeye dönmeli (denoise fail-safe).
        prices = [1000.0, 1100.0, 1200.0]
        result = _denoise_prices(prices, reference=100.0)
        # Hepsi ceil (250)'in üstünde — filtre boş dönerdi, geri dönmeli
        assert result == prices


class TestSynthesizeHistory:
    def test_two_point_history(self):
        res = AkakceResult(
            product_url="https://akakce.com/x",
            seller_count=10,
            min_price=1000.0,
            max_price=2000.0,
            avg_price=1500.0,
        )
        history = synthesize_history(res, current_price=1800.0, days=90)
        assert len(history) == 2
        # İlk nokta 90 gün önceki min, ikinci nokta bugünkü current
        assert history[0][1] == 1000.0
        assert history[1][1] == 1800.0
        # Tarihler sıralı
        assert history[0][0] < history[1][0]
        # Bugün
        assert history[1][0] == date.today()
