# TrustLens AI — API Kontrat Dokümanı

## Base URL
- Dev: `http://localhost:8000`
- Prod: Railway URL (deploy sonrası)

## Endpoints

### `GET /health`
Backend sağlık kontrolü.

**Response:**
```json
{ "status": "ok", "service": "TrustLens AI" }
```

---

### `POST /api/scan`
Ürün URL'i tarar, 7 katmanlı analiz yapar.

**Request:**
```json
{
  "url": "https://www.trendyol.com/...",
  "force_refresh": false
}
```

**Response:** `ScanResult` objesi (bkz. `backend/app/models/scan.py`)

---

### `POST /api/scan/phishing`
Şüpheli SMS/email görselini analiz eder.

**Request:** `multipart/form-data` — `file` alanı

**Response:** `LayerResult` objesi

---

### `GET /api/history`
Kullanıcının geçmiş taramalarını listeler.

**Response:** `ScanResult[]`

---

### `POST /api/petition/{scan_id}`
Tüketici Hakem Heyeti dilekçesi PDF üretir.

**Request:**
```json
{
  "user_full_name": "Ad Soyad",
  "tc_no": "12345678901",
  "address": "Adres",
  "phone": "05001234567"
}
```

**Response:** PDF blob (`application/pdf`)
