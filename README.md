# TrustLens AI

**BTK Akademi Hackathon 2026 — E-Ticaret Güven Asistanı**

> "Bu ürün güvenilir mi?" sorusunu 8 saniyede, şeffaf gerekçelerle cevaplayan AI asistanı.

---

## 🎯 Ne Yapıyor?

Bir e-ticaret ürün linkini yapıştırıyorsunuz, TrustLens AI 7 paralel yapay zeka katmanından geçiriyor:

| Katman | Kontrol |
|--------|---------|
| 🔍 Sahte Yorum Tespiti | TF-IDF + burst analizi + Gemini |
| 💰 Sahte İndirim | 90 günlük fiyat geçmişi (Akakçe) |
| 🎯 Manipülatif Tasarım | Dark patterns: fake urgency, sosyal kanıt |
| 🏪 Satıcı Profili | Yaş, ürün sayısı, puan tutarlılığı |
| 🖼️ Görsel Doğrulama | Gemini Vision ile stok fotoğraf + replika tespiti |
| 🌐 Çapraz Platform | Diğer platformlarda daha iyi seçenek var mı? |
| 🛡️ Phishing Tarama | SMS/email screenshot analizi |

**Sonuç:** 0-100 güven skoru + BUY/CAUTION/AVOID kararı + Türkçe gerekçe + Tüketici Hakem Heyeti dilekçesi

---

## 🚀 Canlı Demo

- **Frontend:** https://btk-2026.vercel.app
- **Backend API:** https://btk-2026-production.up.railway.app/health

---

## 🛠️ Teknoloji Yığını

- **Backend:** Python 3.11 + FastAPI + LangGraph + Gemini 2.5
- **Frontend:** Next.js 14 + TypeScript + Tailwind CSS + Framer Motion
- **DB/Auth:** Supabase
- **Cache:** Upstash Redis
- **Deploy:** Vercel (frontend) + Railway (backend)

---

## 🏃 Kurulum

### Backend

```bash
# Python bağımlılıkları (uv gerekli: https://docs.astral.sh/uv/)
cd backend
uv sync

# Env vars
cp ../.env.example .env
# .env dosyasını düzenle (Gemini API key, Supabase, Redis)

# Çalıştır
uv run uvicorn app.main:app --reload
# → http://localhost:8000/health
```

### Frontend

```bash
cd frontend
pnpm install

# Env vars
cp ../.env.example .env.local
# .env.local'i düzenle (Supabase public key'leri, API URL)

pnpm dev
# → http://localhost:3000
```

---

## 📁 Proje Yapısı

```
BTK-2026/
├── backend/           # FastAPI + LangGraph arka uç
├── frontend/          # Next.js 14 ön yüz
├── mock_data/         # Test verisi (3 senaryo)
├── docs/              # API ve prompt dokümantasyonu
├── PROJECT.md         # Teknik specification
├── PLAN.md            # Geliştirme planı
├── TASKS.md           # Görev kuyruğu
└── CLAUDE.md          # AI agent kodlama kuralları
```

---

## 👥 Takım

BTK Akademi Hackathon 2026 katılımcıları.

---

## 📄 Lisans

Bu proje hackathon amaçlı geliştirilmiştir.
