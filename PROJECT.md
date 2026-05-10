# TrustLens AI — Project Specification

> **Bu doküman, Claude Code (veya başka bir AI coding agent) içindir.**
> Projenin tüm teknik detaylarını, mimarisini, modüllerini ve karar gerekçelerini içerir.
> Her geliştirme oturumuna başlamadan önce bu dosyayı yeniden oku.

---

## 📌 1. Proje Özeti

**İsim:** TrustLens AI
**Kategori:** BTK Akademi Hackathon 2026 — E-Ticaret
**Amaç:** Kullanıcının paylaştığı bir e-ticaret ürün bağlantısını veya şüpheli mesajı 7 katmanlı yapay zeka denetiminden geçirip "güven skoru" üreten web uygulaması.

**Tek cümlede değer:** "Bu ürün güvenilir mi?" sorusunu 8 saniyede, açıklanabilir gerekçelerle cevaplayan AI asistanı.

**Ana farklılaştırıcı:**
- Şeffaf akıl yürütme (Gemini 2.5 Thinking ile)
- Tüketici Hakem Heyeti dilekçe otomasyonu
- Türkiye'ye özel phishing SMS taraması (USOM entegrasyonu)
- 7 paralel agent (LangGraph orkestrasyonu)

**Faz 1 (Hackathon):** Bu doküman.
**Faz 2 (Hackathon sonrası):** Finansal Dijital İkiz entegrasyonu — bkz. Bölüm 11.

---

## 📌 2. Teknoloji Yığını

### Backend
- **Dil:** Python 3.11+
- **Framework:** FastAPI (async)
- **AI Orkestrasyon:** LangGraph + LangChain
- **AI Modelleri:**
  - `gemini-2.5-pro` → Karar motoru, son rapor üretimi
  - `gemini-2.5-flash` → Yorum analizi, metin sınıflandırma
  - `gemini-2.5-flash` (vision modu) → Görsel/SMS OCR
- **Web Scraping:** Playwright (async) + BeautifulSoup
- **Cache:** Redis (fiyat geçmişi, scraping önbellek)
- **DB:** Supabase (PostgreSQL) — kullanıcı, tarama geçmişi, raporlar
- **Auth:** Supabase Auth (e-posta + Google OAuth)
- **PDF üretimi:** ReportLab veya WeasyPrint

### Frontend
- **Framework:** Next.js 14 (App Router) + TypeScript
- **Stil:** Tailwind CSS + custom CSS (mevcut HTML demo'yu referans al)
- **State:** Zustand (basit, hafif)
- **Animasyon:** Framer Motion (skor halkası, sayfa geçişleri)
- **Form:** React Hook Form + Zod validation
- **API:** Native fetch + Server Actions (Next.js 14)

### Deploy
- **Frontend:** Vercel (ücretsiz katman)
- **Backend:** Railway veya Render (ücretsiz katman)
- **DB + Auth:** Supabase (ücretsiz katman)
- **Redis:** Upstash (ücretsiz katman)

### Geliştirme Ortamı
- **Repo yapısı:** Monorepo (frontend + backend tek repo'da, ayrı klasörlerde)
- **Paket yönetimi:** Backend için `uv` (hızlı), Frontend için `pnpm`
- **Linter:** Ruff (Python) + ESLint (TS)
- **Test:** pytest (backend) — minimum kritik path testleri

---

## 📌 3. Klasör Yapısı

```
trustlens-ai/
├── README.md
├── PROJECT.md              # Bu dosya
├── PLAN.md                 # Geliştirme planı
├── .env.example            # Tüm gerekli env değişkenleri
│
├── backend/
│   ├── pyproject.toml
│   ├── app/
│   │   ├── main.py                    # FastAPI app
│   │   ├── config.py                  # Settings (env vars)
│   │   ├── api/
│   │   │   ├── routes/
│   │   │   │   ├── scan.py            # POST /scan endpoint
│   │   │   │   ├── auth.py            # Auth endpoints
│   │   │   │   ├── history.py         # Tarama geçmişi
│   │   │   │   └── petition.py        # Dilekçe üretimi
│   │   │   └── dependencies.py        # Auth, DB session
│   │   ├── agents/                    # 7 katmanlı agent sistemi
│   │   │   ├── base.py                # BaseAgent abstract class
│   │   │   ├── review_agent.py        # Layer 1
│   │   │   ├── discount_agent.py      # Layer 2
│   │   │   ├── manipulation_agent.py  # Layer 3
│   │   │   ├── seller_agent.py        # Layer 4
│   │   │   ├── visual_agent.py        # Layer 5
│   │   │   ├── crossplatform_agent.py # Layer 6
│   │   │   ├── phishing_agent.py      # Layer 7
│   │   │   └── decision_agent.py      # Final reasoner (Gemini 2.5 Pro)
│   │   ├── orchestrator/
│   │   │   ├── graph.py               # LangGraph workflow
│   │   │   └── state.py               # ScanState TypedDict
│   │   ├── scrapers/
│   │   │   ├── base.py
│   │   │   ├── trendyol.py
│   │   │   ├── hepsiburada.py
│   │   │   └── n11.py
│   │   ├── services/
│   │   │   ├── gemini.py              # Gemini API wrapper
│   │   │   ├── cache.py               # Redis wrapper
│   │   │   ├── price_history.py       # Akakçe scraping + cache
│   │   │   └── pdf_generator.py       # Dilekçe PDF
│   │   ├── models/                    # Pydantic models
│   │   │   ├── scan.py                # ScanRequest, ScanResult
│   │   │   ├── product.py
│   │   │   └── user.py
│   │   └── utils/
│   │       ├── logger.py
│   │       └── prompts.py             # Tüm Gemini promptları
│   └── tests/
│       └── test_agents.py
│
├── frontend/
│   ├── package.json
│   ├── next.config.js
│   ├── tailwind.config.ts
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx                   # Landing page
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx
│   │   │   └── register/page.tsx
│   │   ├── (app)/
│   │   │   ├── layout.tsx             # Sidebar layout
│   │   │   ├── dashboard/page.tsx     # Hızlı tarama + son rapor
│   │   │   ├── scan/[id]/page.tsx     # Detaylı rapor sayfası
│   │   │   ├── history/page.tsx       # Tüm geçmiş
│   │   │   └── phishing/page.tsx      # SMS/email tarama
│   │   └── api/
│   │       └── ... (gerekirse)
│   ├── components/
│   │   ├── ui/                        # Buton, input, card vb.
│   │   ├── ScoreRing.tsx              # Skor halkası animasyonu
│   │   ├── LayerCard.tsx              # 7 katman gösterimi
│   │   ├── ReasoningPanel.tsx         # Thinking summaries
│   │   └── Sidebar.tsx
│   ├── lib/
│   │   ├── api.ts                     # Backend client
│   │   ├── supabase.ts                # Auth client
│   │   └── store.ts                   # Zustand store
│   └── styles/
│       └── globals.css
│
└── docs/
    ├── PROMPTS.md                     # Tüm Gemini promptları (referans)
    └── API.md                         # API kontrat dokümanı
```

---

## 📌 4. Veri Akışı (End-to-End)

```
1. Kullanıcı frontend'de URL yapıştırır → "Tara" butonuna basar
2. Frontend → POST /api/scan { url } → Backend
3. Backend:
   a. URL'yi parse eder, hangi platform olduğunu tespit eder
   b. Scraper çalışır → ProductData objesi üretir
   c. LangGraph workflow başlatılır:
      - ProductData state'e konur
      - 7 agent paralel çalışır (asyncio.gather)
      - Her agent kendi sinyalini state'e ekler
   d. DecisionAgent (Gemini 2.5 Pro) tüm sinyalleri okur
   e. Final ScanResult üretilir (JSON)
   f. DB'ye kaydedilir
4. Backend → JSON response → Frontend
5. Frontend → Skor halkası animasyonu, layer kartları, reasoning paneli
```

**Hedef süre:** End-to-end 8-12 saniye.
**Cache stratejisi:** Aynı URL son 24 saat içinde tarandıysa cache'den döner.

---

## 📌 5. Veri Modelleri (Pydantic)

### ProductData (scraping çıktısı)
```python
class ProductData(BaseModel):
    url: str
    platform: Literal["trendyol", "hepsiburada", "n11", "amazon_tr", "unknown"]
    title: str
    price_current: float
    price_original: Optional[float]
    discount_pct: Optional[float]
    images: list[str]                    # CDN URL'leri
    description: str
    seller: SellerData
    reviews: list[ReviewData]
    review_count_total: int
    rating_avg: float
    urgency_indicators: list[str]        # "Son 2 ürün", "1000 kişi izliyor" vb.
    raw_html: Optional[str]              # Yedek
    scraped_at: datetime
```

### SellerData
```python
class SellerData(BaseModel):
    name: str
    age_days: Optional[int]
    total_products: Optional[int]
    rating: Optional[float]
    rating_count: Optional[int]
    is_verified: bool = False
```

### ReviewData
```python
class ReviewData(BaseModel):
    text: str
    rating: int
    author_name: Optional[str]
    date: Optional[datetime]
    has_image: bool = False
    image_url: Optional[str] = None
    verified_purchase: bool = False
```

### ScanResult (final çıktı)
```python
class ScanResult(BaseModel):
    scan_id: UUID
    url: str
    product: ProductData
    overall_score: int                   # 0-100
    verdict: Literal["BUY", "CAUTION", "AVOID"]
    layer_results: dict[str, LayerResult]  # 7 katman sonucu
    reasoning_steps: list[ReasoningStep]   # Thinking summary
    final_explanation: str               # Karar gerekçesi (TR, samimi ton)
    alternative: Optional[Alternative]    # Daha iyi seçenek varsa
    duration_ms: int                     # Tarama süresi
    created_at: datetime

class LayerResult(BaseModel):
    layer_id: str                        # "review", "discount", vb.
    name: str
    status: Literal["RISK", "WARN", "OK", "INFO"]
    score: int                           # 0-100, bu katmanın skoru
    finding: str                         # "247 yorumdan 89'u şüpheli (%36)"
    details: dict                        # Katmana özel ek veri
    confidence: float                    # 0-1, AI'nın güven seviyesi

class ReasoningStep(BaseModel):
    step: int
    content: str                         # "Önce fiyat geçmişini kontrol ettim..."
    highlights: list[Highlight]          # Renkli vurgular için

class Alternative(BaseModel):
    platform: str
    seller_name: str
    price: float
    savings: float
    rating: float
    url: str
```

---

## 📌 6. 7 KATMANLI MİMARİ — DETAYLI

Her katman aynı `BaseAgent` arayüzünü implement eder:

```python
class BaseAgent(ABC):
    @abstractmethod
    async def analyze(self, product: ProductData, state: ScanState) -> LayerResult:
        ...
```

### 🔍 Katman 1 — Sahte Yorum Dedektörü (`review_agent.py`)

**Amaç:** Yorumlardaki bot/AI üretimi içeriği tespit et.

**Girdi:** `product.reviews: list[ReviewData]` (en az 20 yorum, yoksa skip)

**Algoritma:**
1. **Dilbilimsel benzerlik:**
   - Tüm yorumların TF-IDF vektörlerini hesapla (sklearn)
   - Cosine similarity matrisi çıkar
   - Eşik 0.85 üstü olan çiftleri "şüpheli benzer" işaretle
2. **Zamansal yoğunluk:**
   - Yorum tarihlerini buckets'a böl (günlük)
   - Standart sapmadan 2x üstü gün varsa "burst" işaretle
3. **Jenerik ifade tespiti (Gemini 2.5 Flash):**
   ```
   PROMPT: "Aşağıda {N} yorum var. Her biri için:
   - 0 (özgün, detaylı, deneyim içeren)
   - 1 (jenerik, klişe, içeriksiz)
   olarak puanla. Sadece JSON döndür: {results: [0,1,0,1,...]}"
   ```
4. **Skor hesabı:**
   ```python
   suspicious_count = (
     0.4 * benzer_yorum_orani +
     0.3 * burst_orani +
     0.3 * jenerik_orani
   ) * total_reviews
   suspicious_pct = suspicious_count / total_reviews
   layer_score = max(0, 100 - suspicious_pct * 100)
   ```

**Çıktı:**
```json
{
  "layer_id": "review",
  "name": "Sahte Yorum Tespiti",
  "status": "RISK" if suspicious_pct > 0.3 else "WARN" if > 0.15 else "OK",
  "score": layer_score,
  "finding": f"{total} yorumdan {suspicious_count}'u şüpheli (%{pct})",
  "details": {
    "total_reviews": total,
    "suspicious_count": suspicious_count,
    "burst_dates": [...],
    "similarity_clusters": [...]
  },
  "confidence": 0.85
}
```

**Notlar:**
- Yorum sayısı 20'den azsa: status="INFO", score=null, finding="Analiz için yetersiz yorum"
- Görseli olan yorumlar varsa Vision ile yorum-görsel uyum kontrolü yapılabilir (bonus)

---

### 💰 Katman 2 — Sahte İndirim Tespiti (`discount_agent.py`)

**Amaç:** "Önce yükselt sonra indirim" taktiğini tespit et.

**Girdi:** `product.url`, `product.price_current`, `product.price_original`

**Algoritma:**
1. Akakçe / Cimri'den son 90 günlük fiyat geçmişini çek (Redis'e cache'le)
2. Eğer mevcut "indirim öncesi" fiyat son 30 günde hiç görülmemişse → **sahte indirim**
3. Eğer fiyat "indirim öncesi" iddiasından önce <14 gün içinde yükselmişse → **şüpheli**
4. Eğer fiyat 30+ gündür sabit ama "indirim" iddiası varsa → **sahte**

**Skor:**
- Gerçek indirim → 100
- Şüpheli (kısmen yapay) → 50
- Sahte indirim → 10

**Çıktı:**
```json
{
  "layer_id": "discount",
  "name": "Sahte İndirim",
  "status": "RISK",
  "score": 10,
  "finding": "'İndirim öncesi' fiyat 12 gündür değişmemiş — sahte indirim",
  "details": {
    "price_history": [...],          // Son 90 gün
    "claimed_original": 4999,
    "actual_max_30d": 1899,
    "real_discount_pct": 0
  }
}
```

**Fallback:** Akakçe/Cimri verisi yoksa → status="INFO", "Fiyat geçmişi bulunamadı"

---

### 🎯 Katman 3 — Manipülatif Tasarım (`manipulation_agent.py`)

**Amaç:** Dark patterns'i (yapay aciliyet, sosyal kanıt manipülasyonu) tespit et.

**Girdi:** `product.urgency_indicators`, `product.raw_html` (kısaltılmış)

**Algoritma:** Gemini 2.5 Flash promptu:

```
Sen bir UX etiği uzmanısın. Aşağıdaki ürün sayfası verisi içerisinde
manipülatif tasarım kalıplarını (dark patterns) tespit et:

1. Sahte aciliyet (fake urgency): "Son X ürün", "X dakika sonra bitiyor"
2. Sahte sosyal kanıt: "X kişi izliyor", "X kişi bunu aldı"
3. Onay utandırma (confirmshaming): reddetme butonlarındaki manipülatif dil
4. Gizli maliyet sinyalleri
5. Ön seçim (preselection): otomatik abonelik, sigorta vb.

VERİ:
{urgency_indicators}
{html_excerpt}

JSON çıktı:
{
  "patterns_found": [
    {"type": "fake_urgency", "evidence": "Son 2 ürün kaldı!", "severity": "high"}
  ],
  "manipulation_score": 0-100   (0 = çok manipülatif, 100 = temiz)
}
```

**Çıktı:**
```json
{
  "layer_id": "manipulation",
  "name": "Manipülatif Tasarım",
  "status": "WARN" if patterns_found else "OK",
  "score": manipulation_score,
  "finding": f"{len(patterns)} dark pattern tespit edildi" or "Manipülatif unsur yok",
  "details": {"patterns": [...]}
}
```

---

### 🏪 Katman 4 — Satıcı Profili (`seller_agent.py`)

**Amaç:** Satıcının güvenilirliğini ölç.

**Girdi:** `product.seller`

**Algoritma (rule-based, Gemini'siz):**
```python
score = 100

# Yaş
if seller.age_days < 30: score -= 30
elif seller.age_days < 90: score -= 15
elif seller.age_days < 180: score -= 5

# Ürün sayısı
if seller.total_products < 10: score -= 20
elif seller.total_products < 50: score -= 10

# Puan
if seller.rating and seller.rating < 4.0: score -= 25
elif seller.rating and seller.rating < 4.5: score -= 10

# Yorum sayısı tutarlılığı
if seller.rating_count and seller.rating_count < 50:
    score -= 15  # Az yorumla yüksek puan şüpheli

# Resmi/yetkili satıcı
if seller.is_verified: score += 20

score = max(0, min(100, score))
```

**Çıktı:**
```json
{
  "layer_id": "seller",
  "name": "Satıcı Profili",
  "status": ...,
  "score": score,
  "finding": f"{seller.age_days // 30} aylık satıcı, {seller.total_products} ürün",
  "details": {...}
}
```

---

### 🖼️ Katman 5 — Görsel Doğrulama (`visual_agent.py`)

**Amaç:** Stok fotoğraf, replika ürün, logo manipülasyonunu tespit et.

**Girdi:** `product.images` (ilk 3 görsel)

**Algoritma:**
1. **Reverse image search (basit yaklaşım):** Görsellerin perceptual hash'ini hesapla (`imagehash` lib). DB'de daha önce görülen hash'lerle karşılaştır.
2. **Gemini Vision analizi:**
   ```
   PROMPT: "Bu ürün görselini analiz et:
   - Marka/logo görünür mü? Tutarlı mı?
   - Fotoğraf profesyonel ürün fotoğrafı mı yoksa amatör mü?
   - AI tarafından üretilmiş işaretler var mı? (sentetik doku, anatomi hataları)
   - Ürün replika izlenimi veriyor mu?

   JSON çıktı:
   {
     'authenticity_score': 0-100,
     'is_stock_photo': bool,
     'logo_consistency': 'good'|'suspicious'|'inconsistent',
     'ai_generated_likelihood': 0-1,
     'flags': [...]
   }"
   ```

**Çıktı:** Standart `LayerResult` formatında.

**Performans notu:** 3'ten fazla görsel yüklenmesin (token maliyeti).

---

### 🌐 Katman 6 — Çapraz Platform (`crossplatform_agent.py`)

**Amaç:** Aynı ürünün diğer platformlarda fiyat/güvenilirlik kıyaslaması.

**Girdi:** `product.title`, `product.price_current`, `product.platform`

**Algoritma:**
1. Ürün başlığından "core" anahtar kelimeleri çıkar (Gemini Flash):
   ```
   "Apple AirPods Pro 2. Nesil USB-C Tip-C Şarj Kutulu Orijinal" →
   "Apple AirPods Pro 2"
   ```
2. Bu sorguyu diğer 3 platformda Playwright ile arat
3. İlk 3 sonucu al, fiyat + satıcı + puan topla
4. Mevcut ürünle karşılaştır:
   - Fiyat farkı %5'ten fazlaysa
   - Diğerinin satıcısı daha güvenilirse
   → Alternatif öner

**Çıktı:**
```json
{
  "layer_id": "crossplatform",
  "name": "Çapraz Platform",
  "status": "OK" if no_better_alt else "INFO",
  "score": 100,                       // Bu katman risk değil, fırsat sunar
  "finding": "Hepsiburada'da %15 daha ucuz ve daha güvenilir alternatif var",
  "details": {
    "alternatives": [...]
  }
}
```

**Bu katmanın özel davranışı:** Negatif skor üretmez. Sadece bilgi/fırsat verir. `Alternative` objesi `ScanResult.alternative` alanına da yazılır.

---

### 🛡️ Katman 7 — Phishing Tarama (`phishing_agent.py`)

**Amaç:** Şüpheli SMS/e-posta içeriğini analiz et.

**Bu katman sadece kullanıcı bir görsel yüklediğinde aktif olur** — normal ürün taramasında çalışmaz. Ayrı bir endpoint: `POST /api/scan/phishing`.

**Girdi:** `image_file` (SMS/email screenshot)

**Algoritma:**
1. Gemini Vision ile OCR — metin çıkar
2. URL'leri regex ile çek
3. Her URL için:
   - PhishTank API sorgu
   - USOM açık veri listesinde arama
   - WHOIS sorgusu (domain yaşı)
4. Metin analizi (Gemini Flash):
   ```
   "Bu SMS dolandırıcılık kalıplarına uyuyor mu?
   - Acil eylem talebi
   - Sahte kurumsal kimlik (kargo, banka, icra)
   - Kısaltılmış URL
   - Yazım hataları

   Çıktı: phishing_score 0-100, flags[], explanation"
   ```

**Çıktı:** `LayerResult` ama `details` zenginleştirilmiş:
```json
{
  "extracted_text": "Kargonuz teslim edilemedi...",
  "urls_found": ["kargotakip-hr.com/odeme"],
  "url_checks": [
    {"url": "...", "in_phishtank": true, "domain_age_days": 4}
  ],
  "verdict": "PHISHING_CONFIRMED"
}
```

---

### 🧠 Karar Motoru (`decision_agent.py`)

**Amaç:** 7 katman çıktısını birleştirip insan dilinde karar üretmek.

**Girdi:** Tüm `LayerResult`'lar

**Algoritma:**

1. **Ağırlıklı skor hesabı:**
```python
weights = {
    "review": 0.20,
    "discount": 0.20,
    "manipulation": 0.10,
    "seller": 0.15,
    "visual": 0.20,
    "crossplatform": 0.05,    # Düşük çünkü pozitif sinyal
    "phishing": 0.10
}
overall_score = sum(layer.score * weights[layer.layer_id] for layer in layers)
```

2. **Verdict belirleme:**
- score >= 70: BUY
- 40-69: CAUTION
- < 40: AVOID

3. **Gemini 2.5 Pro reasoning:**
```
Sen bir e-ticaret güvenlik uzmanısın. Aşağıdaki 7 katman analizi sonucunu
kullanıcıya samimi ve açıklayıcı bir Türkçe ile özetle.

KATMAN SONUÇLARI:
{layer_results_json}

GENEL SKOR: {overall_score}/100
VERDICT: {verdict}

GÖREV:
1. 4-6 adımlık akıl yürütme zinciri yaz (her adım 1 cümle).
2. Her adımda hangi sinyalden bahsettiğini açık tut.
3. Final cümle: "Bu yüzden ALMA/BEKLE/AL diyorum, çünkü..."

Çıktı JSON:
{
  "reasoning_steps": [
    {"step": 1, "content": "Önce fiyat geçmişine baktım..."},
    ...
  ],
  "final_explanation": "Bu ürünü almamanızı öneriyoruz çünkü..."
}
```

**Önemli:** Bu prompt'ta Gemini'nin "thinking" özelliği aktif edilirse, frontend'de görüntülenecek `reasoning_steps` doğal olarak üretilir.

---

## 📌 7. LangGraph Workflow

```python
from langgraph.graph import StateGraph
from typing import TypedDict, Annotated

class ScanState(TypedDict):
    url: str
    product: ProductData | None
    layer_results: dict[str, LayerResult]
    final_result: ScanResult | None
    errors: list[str]

def build_graph():
    workflow = StateGraph(ScanState)

    workflow.add_node("scrape", scrape_node)
    workflow.add_node("analyze_parallel", analyze_parallel_node)
    workflow.add_node("decide", decide_node)

    workflow.set_entry_point("scrape")
    workflow.add_edge("scrape", "analyze_parallel")
    workflow.add_edge("analyze_parallel", "decide")
    workflow.set_finish_point("decide")

    return workflow.compile()

async def analyze_parallel_node(state: ScanState):
    """6 agent paralel çalışır (phishing hariç)."""
    agents = [
        ReviewAgent(),
        DiscountAgent(),
        ManipulationAgent(),
        SellerAgent(),
        VisualAgent(),
        CrossPlatformAgent()
    ]
    results = await asyncio.gather(*[
        agent.analyze(state["product"], state) for agent in agents
    ])
    return {
        "layer_results": {r.layer_id: r for r in results}
    }
```

---

## 📌 8. API Kontratı

### `POST /api/scan`
```json
// Request
{
  "url": "https://www.trendyol.com/...",
  "force_refresh": false
}

// Response (success)
{
  "scan_id": "uuid",
  "overall_score": 34,
  "verdict": "AVOID",
  "product": {...},
  "layer_results": {
    "review": {...},
    "discount": {...},
    ...
  },
  "reasoning_steps": [...],
  "final_explanation": "...",
  "alternative": {...},
  "duration_ms": 8200
}
```

### `POST /api/scan/phishing`
- multipart/form-data, image upload

### `GET /api/history?limit=20`
- Kullanıcının son taramaları

### `POST /api/petition/{scan_id}`
- Tüketici Hakem Heyeti dilekçesini PDF olarak üret

---

## 📌 9. Frontend Sayfaları

Mevcut HTML demo (`TrustLens_AI_Demo.html`) tasarım referansıdır. Next.js'e port edilirken:

1. **Landing Page (`/`):** HTML demo'daki landing aynen — Tailwind ile rebuild
2. **Login (`/login`):** HTML demo'daki login aynen
3. **Dashboard (`/dashboard`):** Hızlı tarama + son rapor
4. **Scan Detail (`/scan/[id]`):** Detaylı 7 katman raporu + thinking + alternatif
5. **History (`/history`):** Tüm geçmiş, filtreleme
6. **Phishing Scan (`/phishing`):** Görsel yükleme + sonuç

**Tasarım dilini koru:** Koyu tema, neon yeşil accent, Instrument Serif + JetBrains Mono.

---

## 📌 10. Ekstra Özellikler (Faz 1 İçinde Bonus)

Bu özellikleri ana 7 katmandan SONRA ekle. Temel akış çalışmadan girişme.

### Bonus 1: Dilekçe Otomasyonu
- Endpoint: `POST /api/petition/{scan_id}`
- Tarama sonucu + kullanıcı bilgileri → ReportLab ile PDF
- Şablon: TÜBİS formatına yakın
- Örnek metin Gemini ile üretilir

### Bonus 2: Thinking Summaries Görselleştirmesi
- Gemini 2.5 Pro response'undan reasoning steps'leri al
- Frontend'de animasyonlu olarak adım adım göster
- (Mevcut HTML demo'da örneği var)

### Bonus 3: Etik Puanı (skip edilebilir)
- Ürün açıklamasından sürdürülebilirlik sinyalleri çıkar
- Ek bir skor olarak göster
- Hackathon zaman izin verirse

---

## 📌 11. Faz 2: Finansal Dijital İkiz

> Bu kısım hackathon SONRASI içindir. Ana yarışma için Faz 1 yeterli.

### Genel Bakış
Faz 2, kullanıcının harcama davranışlarını öğrenen bir "Finansal Dijital İkiz" modülü ekler. Bu modül, ürün güvenilir olsa bile kullanıcıya **"sana göre doğru karar mı?"** sorusunun cevabını verir.

### Yeni Modüller

#### Modül 1: Ekstre Yükleme + Parse
- Kullanıcı banka ekstre PDF'ini yükler
- Gemini Vision ile parse → işlemler JSON olur
- Kategori sınıflandırma (Gemini Flash)

#### Modül 2: Davranış Profili
```python
class BehaviorProfile(BaseModel):
    user_id: UUID
    monthly_income: Optional[float]
    salary_day: Optional[int]
    spending_categories: dict[str, float]    # {"food": 0.35, ...}
    impulsive_score: float                   # 0-10
    night_shopping_ratio: float
    post_payday_spike: bool
    recent_regret_purchases: list[UUID]
    current_balance_estimate: float
    days_until_salary: int
    updated_at: datetime
```

#### Modül 3: Karar Motoruna Entegrasyon
Faz 1'deki `decision_agent.py`'ye yeni bir input eklenir: `user_profile`. Prompt güncellenir:

```
Sadece ürünün güvenliğini değil, KULLANICININ FİNANSAL DURUMUNU da değerlendir:
- Maaş gününe X gün var, bakiye Y TL
- Geçmişte benzer Z ürün satın alıp kullanmadı
- Saat 23:00 — gece alışverişi paterni var
- Bu ay shopping kategorisi bütçesini %180 aştı

Eğer ürün güvenli AMA finansal durum riskli ise:
verdict = "WAIT_48H" yap, gerekçeyi açıkla.
```

#### Modül 4: 48 Saat Kuralı
- Yüksek tutarlı + dürtüsel skor yüksek → bekleme önerisi
- 48 saat sonra push notification: "Hâlâ istiyor musun?"

#### Modül 5: Pişmanlık Skoru
- Kullanıcının iade ettiği veya kullanmadığı ürünleri kayıt al
- Yeni ürünle vector similarity (embeddings)
- Eşik üstüyse uyar: "Geçmişte buna benzer şey aldın ve kullanmadın"

### Veri Kaynağı (Faz 2)
1. **Faz 2.1:** Manuel ekstre PDF yükleme (gizlilik dostu)
2. **Faz 2.2:** BKM ÖHVPS 2.0 ile Açık Bankacılık entegrasyonu
3. **Faz 2.3:** Banka API'leri (resmi, lisanslı)

### Yeni Frontend Sayfaları (Faz 2)
- `/finance/upload` — Ekstre yükleme
- `/finance/twin` — Dijital ikiz dashboard (harcama, eğilim, uyarılar)
- `/finance/regret` — Pişmanlık geçmişi

---

## 📌 12. Hata Yönetimi & Edge Cases

- **Scraping başarısız:** layer_results tüm INFO statüsünde döner, overall_score=null, kullanıcıya "Bu site şu an analiz edilemiyor" mesajı
- **Gemini API gecikmesi/hatası:** 30sn timeout, 2x retry, sonra fail
- **Cache hit:** Aynı URL son 24 saatte tarandıysa cache'den hızlı döner (ama "cached_at" alanı eklenir)
- **Rate limiting:** Kullanıcı başına dakikada 5 tarama (ücretsiz tier)
- **Scraping etiği:** robots.txt'ye uyum, 1sn min delay, user-agent açıklayıcı

---

## 📌 13. Test Stratejisi (Hackathon Minimumu)

Tam coverage hedefi yok. Sadece kritik path:

1. `test_review_agent.py` — Bilinen sahte yorum dataset'i ile
2. `test_discount_agent.py` — Mock fiyat geçmişi ile
3. `test_orchestrator.py` — Mock ProductData ile end-to-end
4. **Manuel demo testi:** 3 farklı persona için tam akış (sunum öncesi)

---

## 📌 14. Demo Senaryoları (Sunum Günü)

Hazır olması gereken 3 demo URL'i (ekran kaydı yedeği ile):

1. **Yüksek riskli ürün** (Trendyol, sahte indirim + sahte yorum)
2. **Orta riskli ürün** (yeni satıcı, görsel şüpheli)
3. **Güvenli ürün** (yetkili bayi, gerçek yorumlar)
4. **Phishing SMS** (kargotakip-hr.com gibi sahte domain)

Her senaryo için: URL, beklenen skor, beklenen verdict listesi `docs/demo-scenarios.md`'ye kaydedilmeli.

---

## 📌 15. Kritik Notlar

- **Gemini API key:** `.env` dosyasında, asla commit etme
- **Supabase keys:** Service role key sadece backend'de
- **Demo veri:** Gerçek scraping çalışmıyorsa, yedek olarak `mock_data/` klasöründe hazır JSON'lar olsun (sunum kurtarıcı)
- **Sunum öncesi:** Tüm 3 senaryoyu en az 5 kez test et
- **Türkçe karakter:** Tüm UI'da, prompt çıktılarında, PDF'de düzgün render ediliyor mu kontrol et
