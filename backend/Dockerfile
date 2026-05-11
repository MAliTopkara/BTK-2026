FROM python:3.12-slim

WORKDIR /app

# uv kur
RUN pip install uv --no-cache-dir

# Bağımlılık dosyalarını kopyala
COPY pyproject.toml ./

# Bağımlılıkları kur
RUN uv pip install --system -e .

# Playwright browser kurulumu — TASK-28 (Trendyol scraper) aktif olduğunda açılacak.
# ~500MB image şişirir, şimdi gereksiz.
# RUN python -m playwright install chromium --with-deps

# Uygulama kodunu kopyala
COPY app/ ./app/

# Mock data — orchestrator/mock_runner.py ve services/price_history.py kullanır.
# TASK-28 (gerçek scraper) sonrasında kaldırılabilir, ama demo URL kartları için
# (TASK-35) yedek olarak kalmalı.
COPY mock_data/ ./mock_data/

# Port
EXPOSE 8000

# Çalıştır
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
