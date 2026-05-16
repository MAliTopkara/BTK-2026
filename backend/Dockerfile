FROM python:3.12-slim

WORKDIR /app

# uv kur
RUN pip install uv --no-cache-dir

# Bağımlılık dosyalarını kopyala
COPY pyproject.toml ./

# Bağımlılıkları kur
RUN uv pip install --system -e .

# Playwright Chromium — TASK-28 Trendyol/Hepsiburada scraper için.
# --with-deps sistem kütüphanelerini de kurar (libx11, libnss vb.).
RUN python -m playwright install chromium --with-deps

# Uygulama kodunu kopyala
COPY app/ ./app/

# Mock data — orchestrator/mock_runner.py ve services/price_history.py kullanır.
# TASK-28 (gerçek scraper) sonrasında kaldırılabilir, ama demo URL kartları için
# (TASK-35) yedek olarak kalmalı.
COPY mock_data/ ./mock_data/

# Pre-warm cache — Akakce file cache (scripts/prewarm_akakce.py tarafindan
# lokal TR IP'den uretilir). Railway IP Akakce'den 403 aldigi icin bu dosya
# olmadan crossplatform agent alternative uretemez.
COPY data/ ./data/

# Port
EXPOSE 8000

# Çalıştır
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
