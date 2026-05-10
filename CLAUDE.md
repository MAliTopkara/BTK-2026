# CLAUDE.md — TrustLens AI Kodlama Kuralları

> Bu dosya tüm AI coding agent'lar içindir (Claude Code, GitHub Copilot, vb.)
> Her oturumda PROJECT.md + PLAN.md + TASKS.md ile birlikte oku.

---

## 🚀 Proje Bağlamı

- **Proje:** TrustLens AI — 7 katmanlı e-ticaret güven asistanı
- **Hackathon:** BTK Akademi 2026
- **Repo:** https://github.com/MAliTopkara/BTK-2026.git
- **Branch:** sadece `main` — branch açma

## 📁 Repo Yapısı

```
BTK-2026/
├── backend/          # FastAPI + Python
├── frontend/         # Next.js 14 + TypeScript
├── mock_data/        # Test verisi
├── docs/             # API + prompt dokümantasyonu
├── PROJECT.md        # Teknik spec (her oturumda oku)
├── PLAN.md           # Geliştirme planı
├── TASKS.md          # Görev kuyruğu (her oturumda güncelle)
└── CLAUDE.md         # Bu dosya
```

## 🧑‍💻 Kodlama Kuralları

### Genel
- Türkçe yorum + log mesajları kabul edilir, kod isimlendirmesi İngilizce
- Type hint'ler zorunlu (Python + TypeScript)
- Her fonksiyon maksimum 50 satır; büyükse böl
- `TODO:` yerine görev numarası kullan: `# TASK-09: yorum benzerlik algoritması`

### Python (Backend)
- Python 3.11+, `uv` paket yöneticisi
- FastAPI async endpoint'leri — blocking I/O yasak
- Pydantic v2 model syntax
- Linter: `ruff check` — commit öncesi çalıştır
- Import sırası: stdlib → third-party → local
- Exception handling: bare `except:` yasak, spesifik exception yaz
- Env var'lar sadece `app/config.py`'dan — hardcoded secret yasak

### TypeScript (Frontend)
- Next.js 14 App Router — Pages Router kullanma
- `'use client'` direktifi gerektiğinde ekle, gereksiz ekleme
- Zustand store'lar `lib/store.ts`'de
- API çağrıları sadece `lib/api.ts`'den
- Tailwind class'ları — inline style yasak
- `any` tipi yasak; `unknown` veya proper tip kullan

### Git
- Commit format: `feat:`, `fix:`, `wip:`, `chore:`, `docs:`
- Her 30-60 dakikada push
- Commit mesajına görev numarasını ekle: `feat(#09): review agent TF-IDF implementasyonu`

## 🤖 AI Model Stratejisi

- **Gemini 2.5 Pro:** Decision Agent, final reasoning (thinking aktif)
- **Gemini 2.5 Flash:** Yorum analizi, metin sınıflandırma, dark pattern tespiti
- **Gemini 2.5 Flash (Vision):** Görsel analizi, OCR/phishing
- Gemini API key sadece backend'de — frontend'e sızdırma

## 🔒 Güvenlik

- CORS: sadece production domain'den istek kabul et
- Supabase RLS: her tablo için Row Level Security aktif
- Input validation: URL'leri Pydantic ile validate et
- Rate limiting: `/api/scan` için (sonradan eklenecek)
- `.env` dosyaları asla commit'leme — `.gitignore`'da

## 🧪 Test Stratejisi

- Minimum: her agent için 3 test (normal, edge, error)
- `pytest` + `pytest-asyncio`
- Mock data: `mock_data/` klasöründen yükle
- CI yok (zaman kısıtı), lokal test yeterli

## 📋 Görev Tamamlama Protokolü

1. TASKS.md'de görevi `[~]` yap + adın + tarih
2. Kodu yaz
3. Lokal test geç
4. `ruff check` (backend) / `pnpm lint` (frontend) temiz
5. Commit + push
6. TASKS.md'de `[x]` yap + sıradaki göreve bak
