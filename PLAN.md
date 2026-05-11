# TrustLens AI — Geliştirme Planı (Stafet Modeli, Kazanma Odaklı)

> **Bu doküman, 3 kişilik takımın stafet (sıralı) çalışma planıdır.**
> Hedef: BTK Akademi Hackathon 2026'yı **kazanmak.** Faz 1 (7 katmanlı e-ticaret güven asistanı) **eksiksiz, cilalı ve canlı deploy** halinde teslim edilir. Zaman kalırsa **ekstra özellikler ve Faz 2 mini** eklenir.
>
> - **Çalışma modeli:** Aynı anda hep 1 aktif kişi. Tokenı bitince push, devir.
> - **Süre kısıtı yok:** Gerekirse uyumadan çalışılır. Hız değil **kalite ve tamlık** ana hedef.
> - **Görev kuyruğu:** `TASKS.md` dosyası repo köküne. 50 sıralı görev, kim müsaitse sıradakini alır.
> - **Tek branch:** `main`. Çatallaşma yok, conflict yok.
>
> Her oturum başında AI'na şu komutu ver: *"PROJECT.md, PLAN.md ve TASKS.md'yi oku. Aktif görevin ne, ne durumda?"*

---

## 🎯 Felsefe

1. **Eksiksiz > hızlı.** PROJECT.md'deki 7 katmanın hepsi çalışacak. Hiçbiri "Faz 1.5'e atıldı" denmeyecek.
2. **Cila kazandırır.** Skor halkası animasyonu, reasoning paneli yazma efekti, mobile responsive — bunlar "vay" anıdır.
3. **Türkiye'ye özel hooks korunacak.** Tüketici Hakem Heyeti dilekçesi, USOM phishing taraması, Akakçe entegrasyonu — bunlar farklılaştırıcı.
4. **Demo deneyimi parlak olacak.** Jüri linke tıkladığında 1 saniyede çalışan bir şey görmeli.
5. **Faz 2 mini hedef.** Manuel bütçe + WAIT_48H verdict ekleyip "diğerleri 'güvenli mi?' sorar, biz 'sana göre doğru mu?' deriz" söylevini sahneye çıkarmak.

---

## 🔄 Çalışma Modeli — Stafet

### Temel Kural
**Aynı anda her zaman tek aktif kişi.** Bu kişi tüm AI araçlarını kullanır, sırayla:
1. Claude Code (Sonnet 4.6 high) → token bitince
2. GitHub Copilot (Sonnet 4.6) → token bitince
3. Antigravity (Sonnet 4.6) → bitince

Bu üç araç **tek bir kişinin elinde** sırayla kullanılır. Bir araç biter, aynı kişi diğer araca aynı görevi devreder. Bu kişisel araç stafetidir, takım stafeti değildir.

Aynı kişinin tüm araçları bittiğinde **takım stafeti** devreye girer: WhatsApp'a "ben de bittim" mesajı, sıradaki kişi devralır.

### Devir Protokolü (4 Adım)

**🔻 Aktif kişi (devir öncesi):**

```
1. Mevcut kodu commit + push:
   git add .
   git commit -m "wip: <görev_no> - <ne_yapıldı> - <ne_kaldı>"
   git push origin main

2. TASKS.md'yi güncelle:
   - Aktif görev: kendi adını sil
   - Durum: "DEVİR BEKLİYOR"
   - Yapılanları işaretle, kalanları yaz

3. WhatsApp grubuna devir mesajı (şablon plan sonunda):
   - Görev numarası
   - Yapılan
   - Kalan
   - PROJECT.md spec referansı
   - Son commit hash

4. Devir öncesi SAĞLIK KONTROLÜ (ZORUNLU):
   Backend'e dokunduysan:
   → cd backend && uv run uvicorn app.main:app --reload
   → Hatasız açılıyor mu? Açılmıyorsa düzelt, sonra devret.
   
   Frontend'e dokunduysan:
   → cd frontend && pnpm dev
   → Derleme hatasız mı? Hata varsa düzelt, sonra devret.
   
   AI'ya: "Devir öncesi şu komutu çalıştır, hata varsa düzelt: ..."
```

**🔺 Sıradaki kişi (devralırken):**

```
1. git pull origin main

2. TASKS.md'yi aç → aktif görevin durumunu oku

3. AI oturumu aç (Claude Code), ilk prompt:
   "Sen TrustLens AI projesindesin.
    Önce şu üç dosyayı oku:
    - PROJECT.md (tüm spec)
    - PLAN.md (bu plan)
    - TASKS.md (görev kuyruğu, aktif görev)
    
    Aktif görev: #XX — <başlık>
    Durum: yarı kalmış, devraldım.
    Yapılan: <WhatsApp'tan kopyala>
    Kalan: <WhatsApp'tan kopyala>
    Spec: PROJECT.md Bölüm <X>
    Son commit: <hash>
    
    Lütfen kalan kısmı tamamla. Önce mevcut kodu oku, sonra devam et."

4. AI bağlamı yakalar, devam eder.
```

### Bir Görev Bitince
- TASKS.md'de o görevi `[x]` yap, "Tamamlananlar" bölümüne taşı
- Yanına: tamamlayan kişi(ler)in adı + tarih
- Sıradaki görevi alıp aynı kişi devam eder (token varsa) veya devreder

### Token Bitti Yoksa Görev Bitti Karması Sorularsa
- Görev bitti, token var → SIRADAKİ GÖREVE GEÇ (aynı kişi devam)
- Görev yarım, token bitti → DEVİR
- Görev yarım, token var → DEVAM

---

## 🌳 Tek Branch Politikası — `main`

Çatallaşmayın. Hep `main` branch'inde çalışın. Çünkü hep 1 aktif kişi var, conflict imkansız.

**Commit mesaj kuralları:**
- `feat: <ne eklendi>` → tamamlanmış özellik
- `wip: <görev_no> - <durum>` → yarım kalmış (devir)
- `fix: <ne düzeltildi>` → bug fix
- `chore: <altyapı>` → config, dependency, deploy
- `docs: <ne eklendi>` → dokümantasyon

**Push sıklığı:** Her 30-60 dakikada bir push. Sadece devir öncesi değil. AI'na "her anlamlı değişiklikten sonra commit + push yap" de.

---

## 🤖 Model Stratejisi

**Tek model: Sonnet 4.6 (high reasoning).** Tüm 9 gün boyunca varsayılan budur.

- **Opus'a gerek yok.** Sonnet 4.6 high zaten Opus seviyesinde reasoning veriyor, token maliyeti çok daha düşük.
- **Haiku'ya da gerek yok.** Tutarsız kalite, basit işler için bile riskli.
- **Sonnet 4.6 high — istisnasız.**

Her araç bu modeli farklı arayüzden sunuyor:
- Claude Code → Sonnet 4.6 (Settings'ten "high reasoning" seç)
- Copilot → Anthropic provider seç → Sonnet 4.6
- Antigravity → Model selector → Sonnet 4.6

---

## 🚀 Deploy Stratejisi

### Felsefe
**Canlı link Gün 1 sonunda ayakta**, her main'e push'ta otomatik güncellenir.

### Servisler
- **Frontend:** Vercel (GitHub bağlantısı, otomatik deploy)
- **Backend:** Railway (Dockerfile + GitHub bağlantısı)
- **DB + Auth:** Supabase
- **Redis:** Upstash
- **Domain:** Vercel'in verdiği `trustlens-ai.vercel.app` yeter (özel domain opsiyonel)

### Kontrol
Her görev bitiminde:
- Backend dokunulmuşsa → Railway'de deploy başarılı mı? Logs temiz mi?
- Frontend dokunulmuşsa → Vercel'de deploy başarılı mı? Build hatası yok mu?
- Bunu AI'ya kontrol ettir, hata varsa düzeltmeden başka göreve geçme.

---

## 📍 Kontrol Noktaları (9 Gün İçin 5 Checkpoint)

Bu noktalar kesin değil, esnek. Süreye takılmayız ama sıralama bu yönde olmalı:

| Checkpoint | Hedef | Beklenen ilerleme |
|------------|-------|-------------------|
| **CP-1 (Gün 2 sonu)** | Faz 0 bitti, deploy ayakta | Görev #1-5 tamam |
| **CP-2 (Gün 4 sonu)** | Backend çekirdek + 4 katman | Görev #6-13 tamam |
| **CP-3 (Gün 6 sonu)** | Frontend çekirdek + tam akış | Görev #14-26 tamam |
| **CP-4 (Gün 8 sonu)** | 7 katman + tam entegrasyon + scraper | Görev #27-36 tamam |
| **CP-5 (Gün 9)** | Cila + demo + bonus + Faz 2 mini | Görev #37-50 tamam |

**Eğer checkpoint kaçırıldıysa** → o gece uyumayın, yetiştirin. Süre kısıtı yok.

---

# 📋 SIRALI GÖREV LİSTESİ — 50 GÖREV

> Her görev için: **No, Başlık, Tahmini süre, Spec referansı, Çıktı, Test.**
> 
> Görev bitiminde TASKS.md'de işaretle, sıradakine geç.

---

## 🏗️ FAZ 0 — Altyapı (5 görev, ~12 saat)

### Görev #01 — Repo + GitHub + temel dosyalar
**Süre:** 1-2 saat | **Atomic** (yarım bırakılmaz)
- `trustlens-ai/` monorepo, GitHub'a push (PRIVATE başla)
- `PROJECT.md`, `PLAN.md`, `TASKS.md` repo köküne
- `CLAUDE.md` yaz: AI agent'lar için kodlama kuralları
- `.env.example` (GEMINI_API_KEY, SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_KEY, REDIS_URL)
- `.gitignore` (Python + Node + .env)
- README.md başlangıç (kurulum + canlı link placeholder)

**Test:** GitHub'da repo açıldı mı? README görünüyor mu?

---

### Görev #02 — Backend scaffold (FastAPI + uv)
**Süre:** 2-3 saat | **Atomic**
- `backend/` klasörü, `uv init`
- Tüm bağımlılıklar yüklü:
  ```
  uv add fastapi uvicorn pydantic python-dotenv
  uv add google-generativeai langchain langgraph langchain-google-genai
  uv add playwright beautifulsoup4 redis httpx
  uv add scikit-learn imagehash pillow
  uv add reportlab supabase
  uv add --dev pytest ruff
  ```
- `app/main.py` → minimal FastAPI + `/health` endpoint
- `app/config.py` → Pydantic Settings
- CORS middleware (production domain'i açık)
- `Dockerfile` (Railway için)
- Lokal test: `uv run uvicorn app.main:app --reload` → 200 OK

**Test:** `curl localhost:8000/health` → `{"status": "ok"}`

---

### Görev #03 — Frontend scaffold (Next.js + Tailwind)
**Süre:** 2-3 saat | **Atomic**
- `pnpm create next-app frontend --typescript --tailwind --app`
- Bağımlılıklar:
  ```
  pnpm add zustand framer-motion react-hook-form zod
  pnpm add @supabase/supabase-js sonner react-dropzone
  pnpm add -D @types/node
  ```
- Mevcut HTML demo'dan **renkler, fontlar, spacing** Tailwind config'e port et:
  - Instrument Serif (başlık) + JetBrains Mono (kod)
  - Koyu tema, neon yeşil accent (#00ff88 civarı)
- `app/layout.tsx` → temel layout, font import
- `app/page.tsx` → minimal landing ("Coming Soon")
- `globals.css` → tema değişkenleri

**Test:** `pnpm dev` → localhost:3000 açılıyor, koyu tema görünüyor

---

### Görev #04 — Pydantic Modeller + Klasör Yapısı
**Süre:** 2 saat | **Atomic**
- `backend/app/models/scan.py` → PROJECT.md Bölüm 5'teki tüm Pydantic modelleri:
  - ProductData, SellerData, ReviewData
  - ScanRequest, ScanResult, LayerResult, ReasoningStep, Highlight, Alternative
- `backend/app/models/product.py`
- `backend/app/models/user.py`
- Tüm modeller import edilebilir, `from app.models.scan import ScanResult` çalışıyor
- `backend/app/agents/__init__.py` (boş)
- `backend/app/services/__init__.py` (boş)
- `backend/app/scrapers/__init__.py` (boş)
- `backend/app/api/__init__.py`, `backend/app/api/routes/__init__.py`
- `backend/app/orchestrator/__init__.py`

**Test:** `python -c "from app.models.scan import ScanResult; print(ScanResult.__fields__)"`

---

### Görev #05 — Deploy: Vercel + Railway + Supabase + Upstash
**Süre:** 3-4 saat | **Atomic — bu görev BİTMEDEN sonraki göreve geçilmez**
- **Supabase:** Yeni proje, `users`, `scans`, `petitions` tabloları (basit şema)
  - Anon key + service key al
- **Upstash Redis:** Free tier, REDIS_URL al
- **Vercel:** GitHub bağlantısı, frontend deploy, env vars set:
  - NEXT_PUBLIC_SUPABASE_URL
  - NEXT_PUBLIC_SUPABASE_ANON_KEY
  - NEXT_PUBLIC_API_URL (Railway URL'i, henüz hazır değilse placeholder)
- **Railway:** GitHub bağlantısı, backend deploy (Dockerfile)
  - Env vars: GEMINI_API_KEY, SUPABASE_*, REDIS_URL
- Her iki deploy'un URL'lerini README'ye ekle
- Test:
  - `curl <railway-url>/health` → 200
  - Tarayıcıda `<vercel-url>` → "Coming Soon" görünüyor

**Test:** İki canlı URL var. Push → otomatik deploy çalışıyor.

**🎯 CP-1 BİTTİ:** Faz 0 tamamlandı. Canlı altyapı ayakta.

---

## 🧠 FAZ 1.A — Backend Çekirdek (8 görev, ~30 saat)

### Görev #06 — Mock Data 3 Senaryo
**Süre:** 2-3 saat | **Atomic — Devirsiz tamamlanmalı**
- `backend/mock_data/` klasörü
- `airpods_fake.json` → ProductData formatında, sahte indirimli + sahte yorumlu (~50 yorum, %40'ı şüpheli)
- `watch_genuine.json` → Güvenli ürün, gerçek yorumlar, yetkili satıcı
- `laptop_suspicious.json` → Orta risk, yeni satıcı, görsel şüpheli
- `phishing_sms.png` → Sahte SMS ekran görüntüsü (fake URL içeren)
- `price_histories.json` → 3 ürün için 90 günlük fiyat geçmişi (sahte indirim deseni dahil)
- `phishing_domains.txt` → Bilinen sahte domain listesi (10-20 örnek)
- `mock_data/loader.py` → `load_mock(name) -> ProductData` helper

**Test:** `python -c "from mock_data.loader import load_mock; print(load_mock('airpods_fake').title)"`

---

### Görev #07 — Gemini Service Wrapper + Prompts İskeleti
**Süre:** 3 saat | **Atomic**
- `backend/app/services/gemini.py`:
  ```python
  class GeminiService:
      async def generate_json(prompt: str, model: str = "gemini-2.5-flash") -> dict
      async def generate_text(prompt: str, model: str = "gemini-2.5-flash") -> str
      async def analyze_image(image_bytes: bytes, prompt: str) -> dict
      async def generate_with_thinking(prompt: str, model: str = "gemini-2.5-pro") -> dict
          # reasoning_steps + final cevap döner
  ```
- Retry logic (2 deneme, 30sn timeout)
- Token loglama (her çağrı için)
- `backend/app/utils/prompts.py` → tüm prompt şablonları için iskelet (boş string'ler, sonra dolacak):
  ```python
  REVIEW_GENERIC_DETECTION = """..."""
  MANIPULATION_DETECTION = """..."""
  VISUAL_ANALYSIS = """..."""
  CROSSPLATFORM_QUERY_EXTRACTION = """..."""
  PHISHING_TEXT_ANALYSIS = """..."""
  DECISION_REASONING = """..."""
  PETITION_GENERATION = """..."""
  ```

**Test:** `python -c "import asyncio; from app.services.gemini import GeminiService; print(asyncio.run(GeminiService().generate_text('Merhaba de.')))"`

---

### Görev #08 — BaseAgent Abstract Class
**Süre:** 1 saat | **Atomic**
- `backend/app/agents/base.py`:
  ```python
  from abc import ABC, abstractmethod
  from app.models.scan import ProductData, LayerResult
  
  class BaseAgent(ABC):
      layer_id: str
      name: str
      
      @abstractmethod
      async def analyze(self, product: ProductData, state: dict) -> LayerResult:
          ...
  ```
- Hata yönetimi: agent içinde exception olursa LayerResult status="INFO", finding="Analiz yapılamadı: ..." dönsün

**Test:** `python -c "from app.agents.base import BaseAgent; print(BaseAgent)"`

---

### Görev #09 — Katman 1: Review Agent
**Süre:** 4-5 saat | **Devir uyumlu** (TF-IDF, sonra burst, sonra Gemini şeklinde adım adım yarım kalabilir)
- `backend/app/agents/review_agent.py`
- PROJECT.md Bölüm 6.1'e tıpa tıp uygun:
  - TF-IDF cosine similarity (sklearn)
  - Zamansal yoğunluk (numpy std)
  - Gemini Flash ile jenerik yorum tespiti (prompts.py'de tanımla)
  - Skor formülü
- Yorum sayısı <20 ise INFO döner

**Test:**
```python
from app.agents.review_agent import ReviewAgent
from mock_data.loader import load_mock
import asyncio
result = asyncio.run(ReviewAgent().analyze(load_mock('airpods_fake'), {}))
assert result.status == "RISK"
assert result.score < 50
print(result)
```

---

### Görev #10 — Katman 4: Seller Agent (Rule-based)
**Süre:** 1-2 saat | **Atomic**
- `backend/app/agents/seller_agent.py`
- PROJECT.md Bölüm 6.4 — sadece kural tabanlı, Gemini çağrısı yok
- Hızlı + ucuz

**Test:** 3 farklı satıcı profili (yeni/orta/eski) ile beklenen skorlar

---

### Görev #11 — Katman 2: Discount Agent + price_history Service
**Süre:** 4 saat | **Devir uyumlu**
- `backend/app/services/price_history.py`:
  - Akakçe scraping fonksiyonu (henüz çalışmasa da yapı hazır)
  - Mock fallback (`mock_data/price_histories.json` kullan)
  - Redis cache 24 saat TTL
- `backend/app/agents/discount_agent.py`
- PROJECT.md Bölüm 6.2 algoritmasına tıpa tıp

**Test:** Mock fiyat geçmişi ile sahte indirim → status="RISK", score<20

---

### Görev #12 — Katman 3: Manipulation Agent
**Süre:** 2-3 saat | **Atomic**
- `backend/app/agents/manipulation_agent.py`
- Gemini Flash prompt (PROJECT.md Bölüm 6.3, prompts.py'a yaz)
- Dark patterns: fake urgency, fake social proof, confirmshaming, hidden costs, preselection

**Test:** "Son 2 ürün kaldı!" + "1000 kişi izliyor" içeren mock → patterns_found en az 2

---

### Görev #13 — POST /api/scan Endpoint (Mock İlk Versiyon)
**Süre:** 3 saat | **Atomic**
- `backend/app/api/routes/scan.py`
- `POST /api/scan` endpoint'i:
  - `ScanRequest` alır
  - URL parse edip platform tespiti (şimdilik sadece Trendyol döner, scraping henüz yok)
  - Mock data loader ile uygun ProductData yükler
  - 4 mevcut agent'ı `asyncio.gather` ile paralel çalıştırır
  - LayerResult'ları topla, ortalama skor hesapla
  - ScanResult döner (henüz Decision Agent yok, basit gerçeklik)
- `backend/app/api/routes/__init__.py` ve `main.py`'a route'u kaydet

**Test:** `curl -X POST <railway>/api/scan -H 'Content-Type: application/json' -d '{"url":"https://www.trendyol.com/apple-airpods-pro-2nd-gen-p-123456"}'` → 4 katmanlı JSON

> URL `http://` veya `https://` prefix'i zorunlu (scan.py:14 — 422 döner). Eşleşen mock anahtar kelime gerekli: `airpods`, `casio`, `xiaomi` (mock_data/loader.py).

**🎯 CP-2 BİTTİ:** Backend çekirdek hazır. 4 katman çalışıyor, mock akış canlıda.

---

## 🎨 FAZ 1.B — Frontend Çekirdek (7 görev, ~25 saat)

### Görev #14 — Landing Page (HTML demo'dan port)
**Süre:** 4-5 saat | **Devir uyumlu** (sekme sekme)
- `app/page.tsx` → mevcut HTML demo'daki landing page'i Tailwind + Next.js'e port et
- Hero, problem, çözüm, 7 katman görseli, CTA bölümleri
- Mobile responsive baştan
- Animasyonlar (scroll-triggered fade-in)

**Test:** Canlıda `<vercel-url>` → landing tam görünüyor, mobile'da bozuk değil

---

### Görev #15 — Auth: Login + Register + Supabase
**Süre:** 5-6 saat | **Devir uyumlu**
- `app/(auth)/login/page.tsx` → mevcut HTML demo'daki login tasarımı
- `app/(auth)/register/page.tsx`
- `lib/supabase.ts` → Supabase client (anon key)
- Zustand store (`lib/store.ts`) → session yönetimi
- Protected route HOC (`app/(app)/layout.tsx`) → not authenticated → redirect login
- Google OAuth butonu (Supabase auth provider'dan)
- Logout fonksiyonu

**Test:** Register → email confirm → login → /dashboard açılıyor, refresh sonrası session korunuyor

---

### Görev #16 — Dashboard Sayfası (URL Input + Loading State)
**Süre:** 3 saat | **Atomic**
- `app/(app)/dashboard/page.tsx`
- URL input + "Tara" butonu
- Loading state: 8 saniyelik fake progress + "Reasoning..." yer tutucu
- Son 3 tarama listesi (DB'den, henüz boş gösterilebilir)

**Test:** Login → dashboard → URL gir → loading state görünüyor

---

### Görev #17 — ScoreRing Component (Framer Motion)
**Süre:** 3-4 saat | **Atomic**
- `components/ScoreRing.tsx`
- SVG circle + Framer Motion animasyonu (0 → final score, 2sn)
- Verdict rengi: BUY=yeşil, CAUTION=sarı, AVOID=kırmızı
- Mobile responsive (boyut ayarı)
- Skor dışında verdict tag'i altında

**Test:** Storybook olmasa bile, dashboard'a hardcoded score=34 ile entegre edip görsel kontrol

---

### Görev #18 — LayerCard Component (7 Katman Görüntüleme)
**Süre:** 3-4 saat | **Atomic**
- `components/LayerCard.tsx`
- Bir LayerResult alıp render eder:
  - Status icon (✅ OK, ⚠️ WARN, ❌ RISK, ℹ️ INFO)
  - Layer name + finding
  - Score bar
  - Detaylar collapsible (tıkla aç/kapa)
- 7 farklı katman tipini destekler

**Test:** 7 mock LayerResult ile listede render → hepsi görünüyor

---

### Görev #19 — ReasoningPanel Component
**Süre:** 3 saat | **Atomic**
- `components/ReasoningPanel.tsx`
- ReasoningStep array'i alır, adım adım yazma efekti (her adım 200ms gecikmeli, typewriter benzeri)
- Highlight'lı kelimeler (renkli vurgu)
- "Düşünüyor..." başlangıç state'i

**Test:** 5 adımlık mock reasoning ile yazma efekti çalışıyor

---

### Görev #20 — Scan Detail Sayfası (Tüm Bileşenler Bir Arada)
**Süre:** 4-5 saat | **Devir uyumlu**
- `app/(app)/scan/[id]/page.tsx`
- Layout:
  - Üstte ScoreRing + verdict
  - Reasoning paneli (yazma efekti)
  - 7 LayerCard grid
  - Alternative öneri kartı (varsa)
  - "Dilekçe Hazırla" butonu (henüz placeholder)
- Mobile responsive

**Test:** Mock scan_id ile sayfa açılıyor, tüm component'ler düzgün render

**🎯 CP-3 BİTTİ:** Frontend çekirdek hazır. Tam akış görsel olarak çalışıyor (mock veriyle).

---

## 🧪 FAZ 1.C — Backend Tamamlama (6 görev, ~25 saat)

### Görev #21 — Katman 5: Visual Agent (Gemini Vision)
**Süre:** 4-5 saat | **Devir uyumlu**
- `backend/app/agents/visual_agent.py`
- `imagehash` ile perceptual hash
- Gemini Vision prompt (PROJECT.md Bölüm 6.5, prompts.py'a yaz)
- Sadece ilk 3 görsel (token tasarrufu)
- Mock görsellerle test

**Test:** `mock_data/airpods_fake.json`'daki görsellerle çalıştır, authenticity_score < 70

---

### Görev #22 — Katman 6: CrossPlatform Agent
**Süre:** 4-5 saat | **Devir uyumlu**
- `backend/app/agents/crossplatform_agent.py`
- Gemini Flash → ürün başlığından "core query" çıkarımı
- Şimdilik mock arama sonuçları (`mock_data/crossplatform_results.json` ekle)
- Alternatif önerisi üret (PROJECT.md Bölüm 6.6)
- Bu katman negatif skor üretmez, sadece bilgi/fırsat

**Test:** Mock ürün → en az 1 alternatif önerisi dönüyor

---

### Görev #23 — Katman 7: Phishing Agent + Endpoint
**Süre:** 4-5 saat | **Devir uyumlu**
- `backend/app/agents/phishing_agent.py`
- Vision OCR (Gemini Vision ile metin çıkarımı)
- URL regex + `mock_data/phishing_domains.txt` ile blacklist kontrolü
- Gemini Flash ile metin analizi (PROJECT.md Bölüm 6.7)
- **Ayrı endpoint:** `POST /api/scan/phishing` (multipart/form-data)
- `backend/app/api/routes/scan.py` içine ek

**Test:** `mock_data/phishing_sms.png` ile çalıştır → urls_found ≥ 1, in_phishtank=true

---

### Görev #24 — Katman 8: Decision Agent (Karar Motoru, Gemini 2.5 Pro + Thinking)
**Süre:** 5-6 saat | **Devir uyumlu — KRİTİK GÖREV**
- `backend/app/agents/decision_agent.py`
- Ağırlıklı skor hesabı (PROJECT.md Bölüm 6.8 ağırlıkları)
- Gemini 2.5 Pro reasoning prompt (thinking aktif, prompts.py'a yaz):
  - 4-6 adımlık akıl yürütme zinciri
  - Final cümle: "Bu yüzden ALMA/BEKLE/AL diyorum, çünkü..."
- Türkçe, samimi ton
- ScanResult'a `reasoning_steps` + `final_explanation` ekler

**Test:** 3 mock senaryo (high/medium/low risk) → 3 farklı verdict + reasoning

---

### Görev #25 — LangGraph Workflow
**Süre:** 3-4 saat | **Atomic** (yarım bırakma — bütün workflow ya tam ya hiç)
- `backend/app/orchestrator/state.py`:
  ```python
  class ScanState(TypedDict):
      url: str
      product: ProductData | None
      layer_results: dict[str, LayerResult]
      final_result: ScanResult | None
      errors: list[str]
  ```
- `backend/app/orchestrator/graph.py`:
  - `scrape_node` (şimdilik mock loader)
  - `analyze_parallel_node` (6 agent paralel: Review, Discount, Manipulation, Seller, Visual, CrossPlatform)
  - `decide_node` (DecisionAgent çağır)
- `run_scan(url: str) -> ScanResult` fonksiyonu export

**Test:** `python -c "import asyncio; from app.orchestrator.graph import run_scan; print(asyncio.run(run_scan('mock://airpods_fake')))"` → tam ScanResult döner

---

### Görev #26 — Cache Mantığı + duration_ms
**Süre:** 2 saat | **Atomic**
- `backend/app/services/cache.py` → Redis wrapper
- `POST /api/scan` endpoint'inde:
  - URL hash'le → Redis'te var mı kontrol
  - Varsa: 24 saat TTL içinde mi? Evetse cached_at ile dön
  - Yoksa: workflow çalıştır, sonucu cache'le, dön
- `force_refresh: bool` flag desteği
- Her response'a `duration_ms` ekle (start time - end time)
- `POST /api/scan` artık LangGraph workflow'unu çağırır (mock değil)

**Test:** Aynı URL ikinci taramada <500ms dönüyor

**🎯 CP-4 KISMEN BİTTİ:** 7 katman + Decision + LangGraph + cache hazır. Backend tam.

---

## 🔌 FAZ 1.D — Tam Entegrasyon (5 görev, ~22 saat)

### Görev #27 — Frontend ↔ Backend Tam Bağlantı
**Süre:** 4-5 saat | **Atomic**
- `lib/api.ts` → tüm endpoint wrapper'ları:
  - `scan(url: string): Promise<ScanResult>`
  - `getScanHistory(): Promise<ScanResult[]>`
  - `getScanById(id: string): Promise<ScanResult>`
  - `scanPhishing(file: File): Promise<PhishingResult>`
  - `generatePetition(scanId: string, userInfo: UserInfo): Promise<Blob>`
- Toast notification sistemi (sonner)
- Error boundary (`app/error.tsx`)
- Loading skeleton'ları
- Dashboard'da "Tara" → backend → ScoreRing animasyonu → sayfa scroll

**Test:** Canlıda mock URL gir → 8-15 saniye → ScoreRing + 7 katman + reasoning görünüyor

---

### Görev #28 — Trendyol Scraper (Gerçek Playwright)
**Süre:** 6-8 saat | **Devir uyumlu — En kırılgan görev**
- `backend/app/scrapers/base.py` → BaseScraper abstract
- `backend/app/scrapers/trendyol.py`:
  - Playwright async
  - Ürün sayfasını aç, ProductData parse et:
    - title, price_current, price_original, discount_pct
    - images (CDN URL'leri)
    - description
    - seller bilgileri
    - reviews (en az ilk 50)
    - urgency_indicators
  - User-Agent rotation
  - 2 retry, sonra mock'a fallback
- `app/orchestrator/graph.py`'daki `scrape_node` → Trendyol URL ise gerçek scraper, değilse mock

**Plan B:** Anti-bot takılırsa Hepsiburada dene
**Plan C:** İkisi de başarısızsa, demoyu mock veriyle göster (4 demo URL pre-cache stratejisi devrede)

**Test:** Gerçek bir Trendyol URL'i ile scan endpoint çağır → ProductData dolu, scan tamamlanıyor

---

### Görev #29 — Akakçe Fiyat Geçmişi (Gerçek Scraping)
**Süre:** 4-5 saat | **Devir uyumlu**
- `backend/app/services/price_history.py`'da gerçek Akakçe scraping
- Ürün adından arama → fiyat geçmişi sayfası → 90 günlük veri parse
- Cimri.com fallback
- Redis cache 24 saat
- Başarısız olursa mock JSON'a fallback

**Test:** Trendyol scraper'dan gelen ProductData → discount_agent → gerçek price history kullanıyor

---

### Görev #30 — History Sayfası
**Süre:** 3-4 saat | **Atomic**
- `app/(app)/history/page.tsx`
- Kullanıcının tüm taramaları (DB sorgusu)
- Filtreleme: verdict bazlı (BUY/CAUTION/AVOID), tarih aralığı
- Pagination (sayfa başına 20)
- Tıkla → `/scan/[id]` git
- Sil butonu (kullanıcı kendi taramasını silebilir)

**Test:** 5 farklı tarama yapıp History'de hepsi görünüyor, filtre çalışıyor

---

### Görev #31 — Phishing Sayfası (Frontend)
**Süre:** 3 saat | **Atomic**
- `app/(app)/phishing/page.tsx`
- Drag-drop görsel yükleme (react-dropzone)
- Yükleme sonrası `POST /api/scan/phishing` çağrısı
- Sonuç ekranı: kırmızı/sarı/yeşil banner + tespit edilen URL'ler tablosu + her URL için detay (PhishTank, USOM, domain age)
- "Yeni tara" butonu

**Test:** `mock_data/phishing_sms.png`'i yükle → "PHISHING_CONFIRMED" sonucu görünüyor

**🎯 CP-4 TAM BİTTİ:** PROJECT.md'deki Faz 1 kapsamı %100 hazır.

---

## ✨ FAZ 1.E — Cila + Demo Deneyimi (5 görev, ~18 saat)

### Görev #32 — Dilekçe PDF + Endpoint + Frontend Butonu
**Süre:** 5-6 saat | **Devir uyumlu**
- `backend/app/services/pdf_generator.py`:
  - Tüketici Hakem Heyeti dilekçesi şablonu (TÜBİS formatına yakın)
  - Gemini ile dilekçe metni üret (resmi ton, ScanResult'taki kanıtlar dahil)
  - ReportLab ile PDF üret (Türkçe karakter düzgün)
- `POST /api/petition/{scan_id}` endpoint:
  - Body: `{ user_full_name, tc_no, address, phone }`
  - Response: PDF blob
- Frontend Scan Detail sayfasında "Dilekçe Hazırla" butonu:
  - Tıkla → modal aç → kullanıcı bilgileri formu → submit → PDF indir

**Test:** Yüksek riskli scan için PDF üret → Türkçe karakter düzgün, içerik anlamlı

---

### Görev #33 — Edge Case'ler + Hata Mesajları
**Süre:** 4 saat | **Atomic**
- 5 edge case için kullanıcı dostu mesaj:
  - URL geçersiz → "Geçerli bir Trendyol/Hepsiburada/N11 URL'i girin"
  - Desteklenmeyen platform → "Bu site şu an desteklenmiyor"
  - Scraping başarısız → "Bu ürün şu an analiz edilemiyor, lütfen sonra deneyin"
  - 0 yorumlu ürün → "Yetersiz veri ile sınırlı analiz"
  - Gemini timeout → "AI servisi yavaş yanıt veriyor, tekrar deneyin"
- Backend: her case için anlamlı HTTP status + JSON error
- Frontend: toast notification + retry butonu

**Test:** 5 edge case URL'i dene → hepsi anlamlı mesaj döner, uygulama crash etmiyor

---

### Görev #34 — Mobile Responsive Son Kontrol + Cila
**Süre:** 3-4 saat | **Devir uyumlu**
- iPhone SE (375px), iPhone 14 (390px), iPad (768px), Desktop (1280px+) — hepsinde test
- Bozuk yerleri düzelt:
  - ScoreRing boyut uyumu
  - LayerCard grid → mobile'da tek sütun
  - ReasoningPanel padding
  - Sidebar → mobile'da hamburger menü
- Animasyon hızlarını ayarla (mobile'da yavaş gözükmesin)
- Touch target boyutları (44px min)

**Test:** 4 farklı viewport'ta tüm sayfalar düzgün, kullanılabilir

---

### Görev #35 — 4 Demo URL Pre-cache + Landing Demo Kartları
**Süre:** 3-4 saat | **Atomic — Jüri deneyimi için kritik**
- 4 senaryo için tarama yap, sonuçları cache'le:
  - Yüksek riskli Trendyol AirPods (sahte indirim + fake yorumlar)
  - Orta riskli ürün (yeni satıcı, görsel şüpheli)
  - Güvenli ürün (yetkili bayi, gerçek yorumlar)
  - Phishing SMS
- Backend'de `mock_data/precached_results/` klasörü
- Her biri için tam ScanResult JSON kaydet
- Landing page'de "Hemen Dene" bölümü → 4 kart
- Tıkla → giriş gerektirmeden `/demo/[scenario]` sayfasında cache'lenmiş sonucu göster
- Animasyon yine 8 saniye gibi gözüksün (drama için), gerçekte 1 saniye

**Test:** 4 demo kartını tıkla → hepsi 1-2 saniyede sonuç gösteriyor, login istemiyor

---

### Görev #36 — README + Production Hardening + Repo PUBLIC
**Süre:** 2-3 saat | **Atomic**
- `README.md` tam içerik:
  - Proje açıklaması (1 paragraf)
  - Canlı link
  - Demo videosu link (henüz yoksa placeholder)
  - Teknoloji yığını
  - Kurulum (lokal geliştirme)
  - Mimari diyagram (ASCII veya basit görsel)
  - Takım üyeleri
  - Lisans
- Production env vars hepsi doğru
- Supabase RLS policy'leri sıkı
- HTTPS zorla
- Gemini API key sızdırılmıyor (frontend'de yok)
- Robots.txt + sitemap.xml
- Favicon + meta tags + OG image
- Repo PUBLIC yap

**Test:** Repo'yu logout incognito'da aç → README görünüyor, canlı link tıklanır, çalışıyor

**🎯 CP-5 KISMEN BİTTİ:** PROJECT.md Faz 1 kapsamı + cila + demo deneyimi tamam. Jüriye sunulabilir.

---

## 🌟 FAZ 1.F — Bonus Özellikler (Zaman Kalırsa)

> Görev #37'den itibaren **opsiyonel.** Sıralama önemine göre. Bir tanesini bitirmeden sonrakine geçme.

### Görev #37 — Faz 2 Mini: Finansal Dijital İkiz Lite ⭐ EN ÖNEMLİ BONUS
**Süre:** 6-8 saat | **Devir uyumlu**
- Backend:
  - `backend/app/models/user.py`'a `BehaviorProfile` ekle (basit hali)
  - `app/api/routes/profile.py` → `POST /api/profile` (manuel input al)
  - Decision Agent prompt'una `user_profile` bloğu ekle
  - Yeni verdict: `WAIT_48H`
  - Karar mantığı:
    - Bu ay tarama tutarları toplamı > shopping bütçesi → uyar
    - Saat 22-04 arası tarama → "gece alışverişi" flag
    - >1000 TL ürün + bütçe stresi → WAIT_48H
- Frontend:
  - `app/(app)/profile/page.tsx` → form (aylık gelir, shopping bütçesi, maaş günü)
  - Scan Detail sayfasında **Finansal Uyarı kartı** (verdict=WAIT_48H ise):
    - "Bu ürün güvenli, AMA bu ay shopping bütçeni %X aştın..."
    - "48 saat bekle, sonra tekrar tara"

**Demo etkisi:** Sunum slogan'ı: "Diğerleri 'güvenli mi?' sorar, biz 'sana göre doğru mu?' deriz."

**Test:** Profile doldur (düşük bütçe), pahalı ürün tara → WAIT_48H verdict + uyarı kartı görünüyor

---

### Görev #38 — Paylaşılabilir Rapor + OG Kartı
**Süre:** 4-5 saat | **Atomic**
- `app/scan/[id]/share/page.tsx` → public, auth gerektirmez
- Sadece skor + verdict + final_explanation gösterir (gizlilik için detaylar yok)
- Next.js OG image API ile dinamik görsel:
  - `app/api/og/[scanId]/route.tsx`
  - Skor + verdict + ürün başlığı içeren PNG
- "Twitter'da paylaş" butonu → tweet text + image link
- "WhatsApp'ta paylaş" butonu

**Test:** Bir scan share et → Twitter preview'da OG kartı görünüyor

---

### Görev #39 — Karşılaştırma Sayfası
**Süre:** 4-5 saat | **Atomic**
- `app/(app)/compare/page.tsx`
- Query params: `?scan1=X&scan2=Y`
- 2 ürünü yan yana göster:
  - Skor halkaları
  - 7 katman karşılaştırma tablosu (her satırda hangisi kazanıyor)
  - Reasoning steps yan yana
  - Tavsiye: "Şunu seç çünkü..."

**Test:** 2 farklı tarama → karşılaştır → tablo doğru, tavsiye anlamlı

---

### Görev #40 — Etik / Sürdürülebilirlik Skoru (8. Katman)
**Süre:** 3-4 saat | **Atomic**
- `backend/app/agents/ethics_agent.py`
- Ürün açıklamasından sürdürülebilirlik sinyalleri çıkar (Gemini Flash):
  - Geri dönüşüm
  - Üretim yeri (yerli mi)
  - İşçi koşulları (organik, fairtrade vb.)
  - Ambalaj
- Ek bir LayerResult olarak göster
- LangGraph workflow'a ekle
- Frontend'de 8. LayerCard

**Test:** Sürdürülebilirlik vurgulu ürün → yüksek etik skoru, generic ürün → düşük

---

### Görev #41 — Browser Extension (Chrome)
**Süre:** 6-8 saat | **Devir uyumlu**
- `browser-extension/` klasörü repo'da
- Manifest v3
- Trendyol/Hepsiburada/N11 sayfasında otomatik buton inject
- Tıkla → TrustLens'te yeni sekme aç + tarama başlat
- Sayfa içi tooltip: "TrustLens skoru: 34/100"
- Chrome Web Store'a yükleme zaman alır → repo'da .crx dosyası olarak göster

**Test:** Chrome'da yükle, Trendyol AirPods sayfasına git → buton görünüyor, tıkla → TrustLens'te tarama açılıyor

---

### Görev #42 — Telegram Bot
**Süre:** 4-5 saat | **Atomic**
- `backend/telegram_bot/main.py` (ayrı service)
- @TrustLensBot — `/scan <url>` komutu
- Backend API'sını çağırır, sonucu mesaj olarak döner
- Markdown formatında: skor + verdict + final_explanation + 7 katman özeti

**Test:** Telegram'dan bot'a URL gönder → 15 saniye içinde sonuç mesajı geliyor

---

### Görev #43 — Dark/Light Tema Toggle
**Süre:** 2-3 saat | **Atomic**
- Mevcut koyu tema default
- Light tema variant (Tailwind)
- Sidebar'da toggle, localStorage'da kaydet

**Test:** Toggle → tema anında değişiyor, refresh sonrası korunuyor

---

### Görev #44 — Türkçe / İngilizce Dil Seçimi
**Süre:** 4-5 saat | **Devir uyumlu**
- `next-i18next` veya `next-intl` entegrasyonu
- TR + EN için tüm UI metinleri
- Decision Agent prompt'u → user lang'a göre TR veya EN reasoning üret

**Test:** Dil değiştir → UI ve reasoning EN'e geçiyor

---

### Görev #45 — Skor Halkası SVG Export
**Süre:** 2 saat | **Atomic**
- "Sosyal medyada paylaş" → ScoreRing'i SVG/PNG olarak indirme
- HTML2Canvas veya Next.js OG ile

**Test:** Buton → PNG indiriliyor, ScoreRing görünümü doğru

---

### Görev #46 — Email Rapor (Haftalık Özet)
**Süre:** 4 saat | **Atomic**
- Supabase Edge Function veya basit cron
- Haftalık: kullanıcının taradığı ürünlerin özeti, tasarruf hesabı, en şüpheli ürün
- Resend.com veya Supabase email

**Test:** Manual trigger → email kutuna mail geliyor

---

## 🎁 FAZ 2 — Tam Finansal Dijital İkiz (Hackathon Sonrası)

Görev #47-50 gerçek Faz 2'ye doğru ilk adımlar. Hackathon'da yetiştirilebilirse jüri için ekstra "vizyon kanıtı":

### Görev #47 — Ekstre PDF Parse (Gemini Vision OCR)
**Süre:** 6-8 saat
- Banka ekstre PDF yükleme
- Gemini Vision ile OCR → işlemler JSON
- Kategori sınıflandırma (Gemini Flash)

### Görev #48 — Davranış Profili Hesabı
**Süre:** 4-5 saat
- BehaviorProfile gerçek hesabı (manuel input değil, ekstreden)
- Aylık ortalama, kategori dağılımı, dürtüsel skor

### Görev #49 — Pişmanlık Skoru (Embeddings)
**Süre:** 6-8 saat
- Kullanıcının iade ettiği/kullanmadığı ürünleri kayıt
- Yeni ürünle vector similarity (Gemini embeddings)
- Eşik üstüyse uyar

### Görev #50 — 48 Saat Geri Dönüş Push Notification
**Süre:** 3-4 saat
- Web push API (henüz mobil app yok)
- "48 saat önce TrustLens'te X ürününe baktın. Hâlâ istiyor musun?"

**Not:** Görev #47-50 gerçek Faz 2. Hackathon'da yetişmesi düşük olasılık. Görev #37 (Faz 2 Mini) zaten ana etkiyi sağlıyor.

---

# 📊 KALİTE KONTROL CHECKPOINT'LERİ

Her checkpoint'te tüm maddeler ✅ olmadan sonrakine geçilmez. Süre değil **kalite** ölçütü.

### CP-1 (Görev #5 sonu) — Altyapı Hazır
- [ ] GitHub repo açık, README var
- [ ] Vercel canlı URL açılıyor
- [ ] Railway canlı URL `/health` 200 dönüyor
- [ ] Supabase + Upstash bağlantıları çalışıyor
- [ ] Tüm env vars production'da set
- [ ] Push → otomatik deploy çalışıyor

### CP-2 (Görev #13 sonu) — Backend Çekirdek
- [ ] 4 katman (Review, Discount, Seller, Manipulation) ayrı ayrı doğru sonuç üretiyor
- [ ] `POST /api/scan` mock URL ile 4 katmanlı JSON dönüyor
- [ ] Hatalar logging'e düşüyor
- [ ] Gemini API çağrıları çalışıyor

### CP-3 (Görev #20 sonu) — Frontend Çekirdek
- [ ] Login/register canlıda çalışıyor
- [ ] Dashboard URL girilebilir
- [ ] ScoreRing animasyonlu çıkıyor
- [ ] LayerCard 7 katmanı render ediyor
- [ ] ReasoningPanel yazma efekti çalışıyor
- [ ] Mobile düzen bozuk değil

### CP-4 (Görev #31 sonu) — Tam Faz 1
- [ ] 7 katmanın hepsi backend'de çalışıyor
- [ ] LangGraph workflow tam akış
- [ ] Decision Agent reasoning üretiyor
- [ ] Trendyol scraper en az %50 başarı oranı
- [ ] Phishing endpoint çalışıyor + frontend sayfası
- [ ] History sayfası listeliyor
- [ ] Cache çalışıyor (aynı URL <1 saniye)

### CP-5 (Görev #36 sonu) — Demo-Ready
- [ ] Dilekçe PDF üretiliyor (Türkçe karakter doğru)
- [ ] 5 edge case kullanıcı dostu mesaj veriyor
- [ ] 4 viewport'ta mobile responsive
- [ ] 4 demo kartı landing'de çalışıyor (login'siz)
- [ ] README tam, repo PUBLIC
- [ ] Production hardening (HTTPS, RLS, key güvenliği)
- [ ] Sıfır bilinen kritik bug

### CP-6 (Görev #37 — Bonus Bitince) — Faz 2 Mini
- [ ] Profile sayfası bütçe input alıyor
- [ ] Decision Agent user_profile'ı kullanıyor
- [ ] WAIT_48H verdict çıkıyor
- [ ] Finansal Uyarı kartı görünüyor

---

# 🚨 ACİL DURUM PLANLARI

### Senaryo: Trendyol scraping anti-bot'a takıldı
**Çözüm:**
1. Hepsiburada dene
2. N11 dene
3. Hepsi başarısızsa: 4 demo URL'si pre-cache'lenmiş, jüri onları görür → demoyu mock veriyle yap
4. Sunumda: "Anti-bot bypass scope dışı, mimari modüler herhangi bir scraper'la çalışır"

### Senaryo: Gemini API quota'sı bitti
**Çözüm:**
1. Cache TTL'yi 7 güne çıkar
2. 4 demo URL pre-cache'lenmiş → 0 token harcar
3. Yedek: OpenAI gpt-4o-mini ile aynı promptlar (1 saatte değiştirilebilir)

### Senaryo: Vercel/Railway deploy bozuldu
**Çözüm:**
1. Logs'a bak, build hatasını AI'ya çözdür
2. Önceki çalışan commit'e revert et, sonra hatayı çöz
3. Son çare: localhost + ngrok ile public URL aç

### Senaryo: Türkçe karakter PDF'de bozuk
**Çözüm:**
1. ReportLab → DejaVu Sans veya Noto Sans font gömü
2. Çalışmazsa WeasyPrint'e geç
3. Çalışmazsa HTML→PDF (Playwright print) ile

### Senaryo: Devir sonrası AI kafası karıştı, yanlış yere kod ekledi
**Çözüm:**
1. `git reset --hard <son_iyi_commit>` ile geri dön
2. Sıradaki devir mesajını daha detaylı yaz
3. AI'ya: "Önce sadece şu dosyayı oku ve bana özetle, kod yazma" dedirt

### Senaryo: Decision Agent reasoning kalitesiz çıkıyor
**Çözüm:**
1. Sonnet 4.6 high ile prompt'u yeniden yaz (PROJECT.md Bölüm 6.8'i adım adım takip et)
2. Few-shot examples ekle prompt'a (3 mock senaryo için ideal output)
3. Gemini 2.5 Pro `thinking_budget` parametresini artır

---

# 📝 TASKS.md ŞABLONU (Repo Köküne)

```markdown
# TrustLens AI — Görev Kuyruğu

> Bu dosya yaşayan dokümandır. Her görev başlangıcı ve bitişinde güncelle.

## 🔄 AKTİF GÖREV
🔴 #00 — Henüz başlamadı | Çalışan: -

## ⏳ DEVİR BEKLİYOR
(boş)

## 📋 SIRADAKİ GÖREVLER
- [ ] #01 — Repo + GitHub + temel dosyalar
- [ ] #02 — Backend scaffold (FastAPI + uv)
- [ ] #03 — Frontend scaffold (Next.js + Tailwind)
- [ ] #04 — Pydantic Modeller + Klasör Yapısı
- [ ] #05 — Deploy: Vercel + Railway + Supabase + Upstash
- [ ] #06 — Mock Data 3 Senaryo
- [ ] #07 — Gemini Service Wrapper + Prompts İskeleti
- [ ] #08 — BaseAgent Abstract Class
- [ ] #09 — Katman 1: Review Agent
- [ ] #10 — Katman 4: Seller Agent
- [ ] #11 — Katman 2: Discount Agent + price_history Service
- [ ] #12 — Katman 3: Manipulation Agent
- [ ] #13 — POST /api/scan Endpoint (Mock İlk Versiyon)
- [ ] #14 — Landing Page
- [ ] #15 — Auth: Login + Register + Supabase
- [ ] #16 — Dashboard Sayfası
- [ ] #17 — ScoreRing Component
- [ ] #18 — LayerCard Component
- [ ] #19 — ReasoningPanel Component
- [ ] #20 — Scan Detail Sayfası
- [ ] #21 — Katman 5: Visual Agent
- [ ] #22 — Katman 6: CrossPlatform Agent
- [ ] #23 — Katman 7: Phishing Agent + Endpoint
- [ ] #24 — Katman 8: Decision Agent
- [ ] #25 — LangGraph Workflow
- [ ] #26 — Cache Mantığı + duration_ms
- [ ] #27 — Frontend ↔ Backend Tam Bağlantı
- [ ] #28 — Trendyol Scraper (Gerçek Playwright)
- [ ] #29 — Akakçe Fiyat Geçmişi (Gerçek Scraping)
- [ ] #30 — History Sayfası
- [ ] #31 — Phishing Sayfası (Frontend)
- [ ] #32 — Dilekçe PDF + Endpoint + Frontend Butonu
- [ ] #33 — Edge Case'ler + Hata Mesajları
- [ ] #34 — Mobile Responsive Son Kontrol
- [ ] #35 — 4 Demo URL Pre-cache + Landing Demo Kartları
- [ ] #36 — README + Production Hardening + Repo PUBLIC

## 🌟 BONUS GÖREVLER (Zaman Kalırsa)
- [ ] #37 — ⭐ Faz 2 Mini: Finansal Dijital İkiz Lite
- [ ] #38 — Paylaşılabilir Rapor + OG Kartı
- [ ] #39 — Karşılaştırma Sayfası
- [ ] #40 — Etik / Sürdürülebilirlik Skoru
- [ ] #41 — Browser Extension (Chrome)
- [ ] #42 — Telegram Bot
- [ ] #43 — Dark/Light Tema Toggle
- [ ] #44 — Türkçe / İngilizce Dil Seçimi
- [ ] #45 — Skor Halkası SVG Export
- [ ] #46 — Email Rapor

## 🎁 FAZ 2 (Hackathon Sonrası)
- [ ] #47 — Ekstre PDF Parse
- [ ] #48 — Davranış Profili Hesabı
- [ ] #49 — Pişmanlık Skoru (Embeddings)
- [ ] #50 — 48 Saat Push Notification

## ✅ TAMAMLANANLAR
(boş — başladıkça buraya taşı)

---
**Format:**
- Bir görevi alırken: SIRADAKİ → AKTİF + adını yaz
- Yarıda devir: AKTİF → DEVİR BEKLİYOR + WhatsApp'a mesaj
- Tamamlanınca: TAMAMLANANLAR'a taşı + tarih + isim
```

---

# 📞 WHATSAPP DEVİR MESAJI ŞABLONU

```
🔄 DEVİR

Görev: #XX — <başlık>
Durum: yarı kalmış

✅ YAPILAN:
- <madde 1>
- <madde 2>

🔄 KALAN:
- <madde 1>
- <madde 2>

📖 SPEC: PROJECT.md Bölüm <X.Y>
🔗 Son commit: <hash kısa>
⚠️ Notlar: <varsa dikkat edilmesi gereken bir şey>
```

---

# 📌 NOTLAR

1. **Süre kısıtı yok.** Her gece çalışılabilir. Ama **devir sonrası uyumak için en az 6 saat ara verin** — yorgun devir → bozuk kod → felaket.

2. **AI'ya hep şunu söyle:** *"Önce PROJECT.md'nin ilgili bölümünü oku, CLAUDE.md kodlama kurallarını oku, sonra başla."* Bu, tek araç değiştirilse bile bağlam tutarlı kalmasını sağlar.

3. **Her görevin başında AI'ya tahmini zamanı söyle.** "Bu görev için 4 saat ayırdım, daha hızlı bitir, kod kalitesi iyi olsun." → AI scope'u ona göre ayarlar.

4. **Demo öncesi 3 demo URL'sini önceden cache'leyin.** Bu zaten Görev #35'te. Sunum öncesi bir kez daha tarayın, cache taze olsun.

5. **Token israfı:** AI'ya gereksiz dosya okutmayın. "Sadece şu dosyayı oku" deyin, "tüm projeyi oku" demeyin.

6. **Faz 2 Mini (#37) hayati önemde.** Faz 1 bitince **muhakkak** bunu yapmaya çalışın. Sunum hikayesi bunsuz "iyi", bununla "muhteşem" olur.

7. **Sunum öncesi gece (Gün 9 sonu):** Ne kadar yorgunsanız da en az 1 prova yapın. Sahnede bir şey patlarsa nasıl toparlayacağınızı bilin.

> **Unutma:** Hackathon'da çalışan, cilalı, eksiksiz bir ürün → kazandırır. Yarım kalan iddialı bir ürün → "vizyonu güzelmiş" der jüri ve geçer.
