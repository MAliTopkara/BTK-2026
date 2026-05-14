# TrustLens AI — Manuel UI Test Promptu (Görsel İnceleme AI'ı İçin)

> Bu prompt başka bir AI'ya (görsel arayüz inceleme yeteneği olan) verilecektir.
> AI, Vercel'deki canlı uygulamayı (veya lokal `pnpm dev`) ekran görüntüleri/etkileşim üzerinden inceleyip rapor verecek.
> Çıktıları TrustLens geliştirme ekibine geri gönderilecek; ekip bulgulara göre düzeltme yapacak.

---

## 🎯 Görev

Sen **TrustLens AI** adında bir Türk e-ticaret güven asistanı web uygulamasını gözden geçiren bir UX/QA uzmanısın. Uygulama, kullanıcının yapıştırdığı bir Trendyol/Hepsiburada ürün linkini 7 katmanlı AI denetiminden geçirip "güven skoru" üretiyor.

**Hedef:** Aşağıdaki sayfaları ve akışları **kullanıcı gözüyle** test et. Her bulguyu bir checklist maddesi olarak rapor et: **(a)** problemin tarif edildiği bir cümle, **(b)** etkilenen sayfa/bileşen + ekran genişliği, **(c)** önem (BLOCKER / MAJOR / MINOR / NIT), **(d)** önerilen düzeltme. Çalışan kısımları da kısaca onaylayarak listele — neyin doğru çalıştığını bilmek de değerli.

**Hiçbir Türkçe çevirisi olmayan İngilizce metin, koyu temada zor okunan kontrast, kırık layout, eksik loading state, gereksiz scroll, fare ile tıklanamayan buton, klavye ile erişilemeyen form, mobile'da taşan grid — hepsi bulgudur.**

---

## 🌐 Test ortamı

- **Canlı frontend:** `https://btk-2026.vercel.app`
- **Canlı backend:** `https://btk-2026-production.up.railway.app` (API, sadece bilgi amaçlı)
- **Stil dili:** Koyu tema (default), neon yeşil accent (#00ff88), Instrument Serif (serif başlıklar) + JetBrains Mono (kod/etiketler) + Inter (gövde).
- **Diller:** Türkçe (default) ve İngilizce — sağ üstte dil seçici.
- **Tema:** Dark default, Light toggle — sağ üstte / ayarlarda.

---

## 📐 Test edilecek viewport'lar

Her sayfada şu 4 genişlikte aç:
1. **iPhone SE — 375 × 667**
2. **iPhone 14 Pro — 390 × 844**
3. **iPad — 768 × 1024**
4. **Desktop — 1440 × 900**

Mobile'da **scroll ihlali**, **touch target < 44px**, **horizontal scroll**, **CSS overflow** varsa flag et.

---

## 🗺️ Test edilecek sayfalar ve akışlar

### 1) `/` — Landing Page (auth gerektirmez)

**Bileşenler:** `DiagnosticBar` (üst banner), `Hero`, `LayerGrid` (7 katmanın görsel anlatımı), `ReasoningSection`, `DemoScenarios` (3 kart), `Footer`.

**Kontrol et:**
- [ ] Hero'daki başlık ve CTA butonu mobilde taşmıyor mu?
- [ ] 7 katman gridi tüm viewport'larda düzgün mü? Tek sütuna düşüyor mu mobilde?
- [ ] 3 demo kart tıklanınca `/demo/airpods_fake`, `/demo/laptop_suspicious`, `/demo/watch_genuine` sayfalarına gidiyor mu?
- [ ] Login/Register butonları sağ üstte var mı?
- [ ] Tema toggle ve dil toggle çalışıyor mu? Sayfa refresh sonrası seçim korunuyor mu?
- [ ] Footer'da takım üyeleri ve GitHub linki var mı? Linkler doğru mu?
- [ ] Sayfa kayarken scroll-triggered animasyon var mı, performansı bozuyor mu?

### 2) `/demo/airpods_fake`, `/demo/laptop_suspicious`, `/demo/watch_genuine` (auth gerektirmez)

**Beklenen:** 3 farklı senaryo için **önceden cache'lenmiş** sonuç. AirPods → AVOID (kırmızı), Xiaomi laptop → CAUTION (sarı), Casio saat → BUY (yeşil).

**Kontrol et:**
- [ ] ScoreRing animasyonu 0'dan başlayıp final skora animate ediyor mu? Renk verdict'le uyumlu mu?
- [ ] 7 LayerCard render ediliyor mu? Her birinin status'u (RISK/WARN/OK/INFO) doğru ikon + renk ile mi?
- [ ] LayerCard tıklanınca details collapse aç/kapa çalışıyor mu?
- [ ] ReasoningPanel typewriter efekti çalışıyor mu? Türkçe karakterler düzgün render mi (ş, ç, ğ, ü, ö, ı, İ)?
- [ ] Alternative (daha iyi öneri) kartı varsa görünüyor mu?
- [ ] "Dilekçe Hazırla" butonu var mı? Tıklayınca modal açılıyor mu?
- [ ] "Karşılaştır" ve "Paylaş" butonları çalışıyor mu?
- [ ] EthicsPanel ve FinancialFitPanel görünüyor mu (varsa)?
- [ ] Mobil viewport'ta tüm bu bileşenler okunabilir mi?

### 3) `/login` ve `/register`

**Kontrol et:**
- [ ] Form alanları: e-posta, şifre (register'da: ad-soyad da). Etiketler Türkçe mi?
- [ ] Klavye ile (Tab) tüm alanlar gezilebiliyor mu? Enter ile submit oluyor mu?
- [ ] Hatalı e-posta/zayıf şifre validation mesajları geliyor mu?
- [ ] Google OAuth butonu var mı? Tıklayınca Supabase OAuth akışı açılıyor mu?
- [ ] "Şifremi unuttum" linki var mı? Çalışıyor mu?
- [ ] Login → /dashboard yönlendirmesi çalışıyor mu?
- [ ] Logout → /login dönüşü ve session temizleniyor mu?
- [ ] Refresh sonrası session korunuyor mu?

### 4) `/dashboard` — Tarama Başlat (auth gerektirir)

**Kontrol et:**
- [ ] URL input alanı var mı? Placeholder Trendyol/Hepsiburada URL örneği veriyor mu?
- [ ] "Tara" butonu disabled state: boş input ya da geçersiz format için pasif mi?
- [ ] Geçersiz URL girilince (örn. `abc`, `http://google.com`) anlamlı bir Türkçe hata mesajı geliyor mu (toast veya inline)?
- [ ] Desteklenmeyen platform (örn. `https://www.amazon.com.tr/...`) için "Bu site şu an desteklenmiyor" tarzında özel mesaj geliyor mu?
- [ ] Geçerli bir Trendyol URL'i girince loading state başlıyor mu? 7 katman yan yana "QUEUED" → "ANALYZING" → final status'a geçiyor mu?
- [ ] Tarama 8-15 saniye içinde tamamlanıyor mu? Tamamlanınca otomatik scan detail görünüyor mu (yeni sayfa veya inline)?
- [ ] Son taramalar listesi (Recent Scans) görünüyor mu? Bir tanesine tıklayınca o taramaya gidiyor mu?
- [ ] Demo URL'lerine "Hızlı Dene" linkleri var mı?
- [ ] Mobile'da launcher input alanı ve buton parmakla rahat tıklanabilir mi?

### 5) `/scan/[id]` — Tarama Detayı

**Kontrol et:**
- [ ] Bu sayfanın `/demo/*` ile aynı layout'u var mı? Yoksa fark net mi?
- [ ] Tarama bulunamazsa `ScanNotFound` bileşeni anlamlı bir mesaj veriyor mu?
- [ ] PetitionModal: kullanıcı bilgileri (ad-soyad, TC, adres, telefon) formu doğru valide ediliyor mu? TC kimlik 11 hane mi kontrol ediyor?
- [ ] PDF indirme çalışıyor mu? İndirilen PDF'de Türkçe karakter düzgün render mi?
- [ ] ShareSheet: Twitter/WhatsApp paylaşım linkleri doğru URL'ye yönlendiriyor mu?
- [ ] OG image (paylaşıldığında preview) görseli render oluyor mu?

### 6) `/history` — Tarama Geçmişi

**Kontrol et:**
- [ ] Kullanıcının önceki taramaları listeleniyor mu? (Backend şu an persist etmiyor olabilir — sessionStorage cache kullanılıyor.)
- [ ] Filtre: verdict bazlı (AVOID/CAUTION/BUY) seçici var mı? Çalışıyor mu?
- [ ] Pagination veya infinite scroll var mı?
- [ ] Bir taramaya tıklayınca /scan/[id]'ye gidiyor mu?
- [ ] "Sil" butonu çalışıyor mu? Confirm dialog soruyor mu?
- [ ] Boş state: hiç tarama yoksa "Henüz tarama yok, ilkini başlat" tarzında bir mesaj var mı?

### 7) `/compare` — Karşılaştırma

**Kontrol et:**
- [ ] Query param ile (örn. `?scan1=X&scan2=Y`) 2 tarama yan yana karşılaştırıyor mu?
- [ ] ScoreRing'ler yan yana mı? Renkler doğru mu?
- [ ] 7 katman satır satır karşılaştırma tablosu var mı? Hangisinin daha iyi olduğu işaretleniyor mu?
- [ ] Mobile'da tablo yatay scroll oluyor mu, yoksa kart kart düşüyor mu?
- [ ] Eksik tarama varsa boş state mesajı doğru mu?

### 8) `/phishing` — SMS/E-posta Görsel Taraması

**Kontrol et:**
- [ ] Drag-drop alanı var mı? Mouse ile sürükleyip bırakma çalışıyor mu?
- [ ] "Dosya seç" butonu çalışıyor mu? Sadece görsel (jpeg/png/webp) kabul ediyor mu?
- [ ] >10 MB dosya yüklenince anlamlı hata mesajı veriyor mu?
- [ ] Yükleme sonrası loading state var mı? Sonuç ekranı: phishing skor + tespit edilen URL'ler tablosu + verdict?
- [ ] Türkçe karakterli OCR çıktısı düzgün gösteriliyor mu?
- [ ] "Yeni tara" butonu state'i temizleyip baştan başlatıyor mu?

### 9) `/settings` — Ayarlar

**Kontrol et:**
- [ ] Profil bilgileri (ad-soyad, e-posta) görünüyor mu? Düzenlenebilir mi?
- [ ] Tema toggle (Dark/Light) burada da çalışıyor mu?
- [ ] Dil seçimi (TR/EN) çalışıyor mu? Tüm sayfa metinleri değişiyor mu yoksa bazı yerler hardcoded TR kalıyor mu? (Bilinen: EthicsPanel ve FinancialFitPanel kısmen hardcoded TR olabilir.)
- [ ] Davranış profili (aylık gelir, shopping bütçesi, maaş günü) input formu var mı?
- [ ] Logout butonu var mı? Bir tık ile çıkış oluyor mu?
- [ ] "Hesabımı sil" gibi destructive bir aksiyon varsa confirm soruyor mu?

---

## ⚙️ Cross-cutting kontroller

### Erişilebilirlik (a11y)
- [ ] Tüm interaktif elementler klavye ile odaklanabiliyor mu? Focus halkası görünür mü?
- [ ] Form alanlarında `<label>` ile ilişkilendirme var mı?
- [ ] Renk kontrastı WCAG AA seviyesinde mi (özellikle koyu temada gri-üstüne-gri yazılar)?
- [ ] Görseller için `alt` atributu var mı?
- [ ] Toast notification screen reader tarafından okunuyor mu (`role="status"` veya `aria-live`)?

### Performans hissi
- [ ] İlk paint <2 saniye mi?
- [ ] ScoreRing animasyonu 60fps gibi akıcı mı?
- [ ] Sayfa geçişlerinde layout shift (CLS) var mı?
- [ ] Resimler lazy-load mu?

### Hata / Edge durumlar
- [ ] Backend kapalıyken (örn. dev'de localhost:8000 down) frontend ne diyor? "Bağlantı yok, tekrar dene" tarzı?
- [ ] Network yavaşken tarama 30sn+ sürerse iptal/timeout var mı?
- [ ] Yetkisiz erişim (auth gerektiren sayfaya logout iken gidince) login'e yönlendiriyor mu, "geri dön" parametresiyle?
- [ ] 404 sayfası özel mi yoksa Next.js default mı? Tema ile uyumlu mu?

### i18n tutarlılığı
- [ ] Dil EN'e geçince TÜM kullanıcı metinleri İngilizce mi? Hangi bileşenler hardcoded TR kalmış?
- [ ] Tarih formatı dile göre değişiyor mu (TR: 14 Mayıs 2026, EN: May 14, 2026)?
- [ ] Para birimi gösterimi: 1.234,56 TL (TR) vs ₺1,234.56 (EN)?
- [ ] AI çıktısı (reasoning steps, final_explanation) seçilen dilde mi geliyor?

---

## 📤 Çıktı formatı (RAPOR YAZARKEN BUNU KULLAN)

Her bulgu için aşağıdaki yapıyı kullan:

```
### [BLOCKER|MAJOR|MINOR|NIT] - <sayfa>: <kısa başlık>
**Sayfa/bileşen:** /dashboard → ScanLauncher
**Viewport:** 375×667 (iPhone SE)
**Gözlem:** "Tara" butonu input alanını tamamen örtüyor, parmakla input'a dokunulamıyor.
**Beklenen:** Buton input'un altına düşmeli ya da en az 12px boşluk olmalı.
**Ekran görüntüsü:** [varsa ekle]
**Öneri:** ScanLauncher'da mobile için `flex-col gap-3` kullanılmalı; mevcut `flex-row` 360-400px arası taşıyor.
```

**Rapor başlığı:** `TrustLens AI — UI İnceleme Raporu — <tarih>`
**Rapor giriş paragrafı:** Hangi sayfaları test ettin, hangilerini atladın, genel izlenim.
**Bulgu listesi:** BLOCKER → MAJOR → MINOR → NIT sırasında, her sayfa için ayrı bölüm.
**Sonuç:** "Şu N adet bulgu var, M tanesi BLOCKER. Genel olarak [iyi/orta/kötü] durumda."

### Önem skalası
- **BLOCKER:** Sunum / jüri demosu sırasında utandırır, ürün ana akışı çalışmıyor.
- **MAJOR:** Görünür bug, profesyonellik algısını düşürür.
- **MINOR:** Kullanıcının fark edebileceği ama akışı tıkamayan tutarsızlık.
- **NIT:** Cila / estetik; kalan zaman varsa düzelt.

---

## 🚫 Kapsam dışı (bu testte bunlara bakma)

- Backend logic doğruluğu (AI skor değerleri, agent kararları) — başka test alanı.
- Performance metric'leri (Lighthouse, WebPageTest) — sadece **hisset**, ölçme.
- Lokalizasyon kapsam dışı: Almanca, Arapça vb. — sadece TR ve EN.
- Browser uyumluluğu detayı: Chrome ve Safari mobile yeterli, IE/Edge legacy yok.

---

**Hazırsan başla. Hata bulduğun her ekran için ekran görüntüsü iste/ek.** Raporun sonuçlandığında, ekibe gönderilebilir tek bir Markdown dosya olarak ver.
