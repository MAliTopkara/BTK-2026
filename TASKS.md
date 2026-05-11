# TrustLens AI — Görev Kuyruğu

> Her oturum başında: "PROJECT.md, PLAN.md ve TASKS.md'yi oku. Aktif görevin ne, ne durumda?"
>
> **Görev durumları:** `[ ]` = bekliyor, `[~]` = devam ediyor (kim + tarih), `[x]` = tamamlandı

---

## 🔄 Aktif Görev

**#14** — Landing Page (HTML demo'dan port) _(4-5 saat)_

---

## 📋 Bekleyen Görevler

### FAZ 0 — Altyapı

- [x] **#01** Repo + GitHub + temel dosyalar _(Tamamlandı: 11 Mayıs 2026)_
- [x] **#02** Backend scaffold (FastAPI + uv) _(Tamamlandı: 11 Mayıs 2026)_
- [x] **#03** Frontend scaffold (Next.js + Tailwind) _(Tamamlandı: 11 Mayıs 2026)_
- [x] **#04** Pydantic Modeller + Klasör Yapısı _(Tamamlandı: 11 Mayıs 2026)_
- [x] **#05** Deploy: Vercel + Railway + Supabase + Upstash _(Tamamlandı: 11 Mayıs 2026)_
  - Frontend: https://btk-2026.vercel.app
  - Backend: https://btk-2026-production.up.railway.app

### FAZ 1.A — Backend Çekirdek

- [x] **#06** Mock Data 3 Senaryo _(Tamamlandı: 11 Mayıs 2026 — GitHub Copilot)_
- [x] **#07** Gemini Service Wrapper + Prompts İskeleti _(Tamamlandı: 11 Mayıs 2026 — GitHub Copilot)_
- [x] **#08** BaseAgent Abstract Class _(Tamamlandı: 11 Mayıs 2026 — MehdiSndg)_
- [x] **#09** Katman 1: Review Agent _(Tamamlandı: 11 Mayıs 2026 — MehdiSndg)_
- [x] **#10** Katman 4: Seller Agent (Rule-based) _(Tamamlandı: 11 Mayıs 2026 — MehdiSndg)_
- [x] **#11** Katman 2: Discount Agent + price_history Service _(Tamamlandı: 11 Mayıs 2026 — MehdiSndg)_
- [x] **#12** Katman 3: Manipulation Agent _(Tamamlandı: 11 Mayıs 2026 — MehdiSndg)_
- [x] **#13** POST /api/scan Endpoint (Mock İlk Versiyon) _(Tamamlandı: 11 Mayıs 2026 — MehdiSndg)_

### FAZ 1.B — Frontend Çekirdek

- [ ] **#14** Landing Page (HTML demo'dan port) _(4-5 saat)_
- [ ] **#15** Auth: Login + Register + Supabase _(5-6 saat)_
- [ ] **#16** Dashboard Sayfası (URL Input + Loading State) _(3 saat)_
- [ ] **#17** ScoreRing Component (Framer Motion) _(3-4 saat)_
- [ ] **#18** LayerCard Component (7 Katman Görüntüleme) _(3-4 saat)_
- [ ] **#19** ReasoningPanel Component _(3 saat)_
- [ ] **#20** Scan Detail Sayfası (Tüm Bileşenler Bir Arada) _(4-5 saat)_

### FAZ 1.C — Backend Tamamlama

- [ ] **#21** Katman 5: Visual Agent (Gemini Vision) _(4-5 saat)_
- [ ] **#22** Katman 6: CrossPlatform Agent _(4-5 saat)_
- [ ] **#23** Katman 7: Phishing Agent + Endpoint _(4-5 saat)_
  - Hazır helpers: `mock_data.loader.load_phishing_image()` ve `load_phishing_domains()` kullan
- [ ] **#24** Katman 8: Decision Agent _(5-6 saat)_ ⭐ KRİTİK
- [ ] **#25** LangGraph Workflow _(3-4 saat)_
- [ ] **#26** Cache Mantığı + duration_ms _(2 saat)_

### FAZ 1.D — Tam Entegrasyon

- [ ] **#27** Frontend ↔ Backend Tam Bağlantı _(4-5 saat)_
- [ ] **#28** Trendyol Scraper (Gerçek Playwright) _(6-8 saat)_
- [ ] **#29** Akakçe Fiyat Geçmişi _(4-5 saat)_
- [ ] **#30** History Sayfası _(3-4 saat)_
- [ ] **#31** Phishing Sayfası (Frontend) _(3 saat)_

### FAZ 1.E — Cila + Demo

- [ ] **#32** Dilekçe PDF + Endpoint + Frontend Butonu _(5-6 saat)_
- [ ] **#33** Edge Case'ler + Hata Mesajları _(4 saat)_
- [ ] **#34** Mobile Responsive Son Kontrol + Cila _(3-4 saat)_
- [ ] **#35** 4 Demo URL Pre-cache + Landing Demo Kartları _(3-4 saat)_ ⭐ JÜRİ
- [ ] **#36** README + Production Hardening + Repo PUBLIC _(2-3 saat)_

### FAZ 1.F — Bonus (Zaman Kalırsa)

- [ ] **#37** Faz 2 Mini: Finansal Dijital İkiz Lite _(6-8 saat)_ ⭐ EN ÖNEMLİ BONUS
- [ ] **#38** Paylaşılabilir Rapor + OG Kartı _(4-5 saat)_
- [ ] **#39** Karşılaştırma Sayfası _(4-5 saat)_
- [ ] **#40** Etik / Sürdürülebilirlik Skoru _(3-4 saat)_
- [ ] **#41** Browser Extension (Chrome) _(6-8 saat)_
- [ ] **#42** Telegram Bot _(4-5 saat)_
- [ ] **#43** Dark/Light Tema Toggle _(2-3 saat)_
- [ ] **#44** Türkçe / İngilizce Dil Seçimi _(4-5 saat)_
- [ ] **#45** Skor Halkası SVG Export _(2 saat)_
- [ ] **#46** Email Rapor (Haftalık Özet) _(4 saat)_

### FAZ 2 — Tam Finansal Dijital İkiz (Hackathon Sonrası)

- [ ] **#47** Ekstre PDF Parse (Gemini Vision OCR) _(6-8 saat)_
- [ ] **#48** Davranış Profili Hesabı _(4-5 saat)_
- [ ] **#49** Pişmanlık Skoru (Embeddings) _(6-8 saat)_
- [ ] **#50** 48 Saat Geri Dönüş Push Notification _(3-4 saat)_

---

## ✅ Tamamlananlar

_(Henüz yok)_

---

## 📝 Notlar / Engeller

_(Boş)_
