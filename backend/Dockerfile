FROM python:3.11-slim

WORKDIR /app

# uv kur
RUN pip install uv --no-cache-dir

# Bağımlılık dosyalarını kopyala
COPY pyproject.toml ./

# Bağımlılıkları kur
RUN uv pip install --system -e .

# Playwright browser kur
RUN python -m playwright install chromium --with-deps

# Uygulama kodunu kopyala
COPY app/ ./app/

# Port
EXPOSE 8000

# Çalıştır
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
