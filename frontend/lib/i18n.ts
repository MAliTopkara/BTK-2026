export type Locale = "tr" | "en";

const STORAGE_KEY = "trustlens-locale";

export function getStoredLocale(): Locale | null {
  if (typeof window === "undefined") return null;
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "tr" || stored === "en") return stored;
  return null;
}

export function getActiveLocale(): Locale {
  return getStoredLocale() ?? "tr";
}

export function setLocale(locale: Locale): void {
  localStorage.setItem(STORAGE_KEY, locale);
  document.documentElement.lang = locale;
}

export type TranslationKey = keyof typeof translations.tr;

export const translations = {
  tr: {
    // Navigation
    "nav.scan": "Tarama",
    "nav.history": "Geçmiş",
    "nav.compare": "Karşılaştır",
    "nav.phishing": "Phishing",
    "nav.settings": "Ayarlar",
    "nav.menu": "Menü",
    "nav.operator": "Operatör",
    "nav.soon": "yakında",

    // Dashboard
    "dashboard.title": "Hızlı tarama",
    "dashboard.subtitle": "Ürün linkini yapıştır, 7 katmanlı AI analizi başlasın.",
    "dashboard.input_placeholder": "https://www.trendyol.com/... ürün linki",
    "dashboard.scan_btn": "Tara",
    "dashboard.scanning": "Taranıyor…",
    "dashboard.recent": "Son taramalar",
    "dashboard.no_recent": "Henüz tarama yapılmadı.",
    "dashboard.demo_title": "Demo senaryoları",
    "dashboard.demo_sub": "Hızlı test için hazır URL'ler",

    // Scan Detail
    "scan.eyebrow": "tarama",
    "scan.low_data_title": "Yetersiz veri ile sınırlı analiz",
    "scan.low_data_body": "Bu ürün için kullanıcı yorumu bulunamadı. Yorum katmanı atlandı, karar diğer katmanlardan gelen sinyallere dayanıyor — güveni tek başına doğrulamak için yeterli değil.",
    "scan.price": "fiyat",
    "scan.seller": "satıcı",
    "scan.verified": "✓ doğrulanmış",
    "scan.rating": "puan",
    "scan.duration": "süre",
    "scan.time": "zaman",
    "scan.layers_title": "kanıt",
    "scan.layers_sub": "Her katman bağımsız çalıştı, kendi skorunu üretti. Statüye göre RISK ilk.",
    "scan.actions": "Aksiyonlar",
    "scan.petition": "Dilekçe oluştur",
    "scan.petition_sub": "Tüketici Hakem Heyeti · PDF",
    "scan.history_link": "Geçmişe git",
    "scan.history_sub": "Tüm taramalarını gör",
    "scan.compare_link": "Karşılaştır",
    "scan.compare_sub": "Başka bir tarama veya demo ile yan yana",
    "scan.share": "Paylaş",
    "scan.share_sub": "Link + OG kart + paylaşım metni",
    "scan.new_scan": "Yeni_tarama",
    "scan.cached": "cached",
    "scan.ago_just_now": "az önce",
    "scan.ago_min": "dk önce",
    "scan.ago_hour": "saat önce",
    "scan.ago_day": "gün önce",
    "scan.reviews": "değerlendirme",

    // Verdicts
    "verdict.BUY": "AL",
    "verdict.CAUTION": "DİKKATLİ OL",
    "verdict.AVOID": "ALMA",

    // Status
    "status.risk": "risk",
    "status.warn": "warn",
    "status.ok": "ok",
    "status.info": "info",

    // Financial Fit
    "fit.section": "Cüzdan_Perspektifi",
    "fit.title_part1": "Bu satın alım",
    "fit.title_part2": "cüzdanına",
    "fit.title_part3": "uyuyor mu?",
    "fit.sub": "Trust skoru ürünün güvenilirliğidir. Bu bölüm finansal profiline göre ayrı bir okuma yapar — kararı sen verirsin.",
    "fit.report": "CÜZDAN_RAPORU",
    "fit.source": "local · profilinden",
    "fit.budget_of": "bütçenin",
    "fit.comfortable": "Bütçeye uygun",
    "fit.significant": "Bütçenin önemli kısmı",
    "fit.stretch": "Bütçeyi geriyor",
    "fit.no_profile_title": "Finansal profilin yok.",
    "fit.no_profile_body": "Aylık gelir + bütçe + maaş günü bilgini bir kez doldur. Her tarama sonucunda \"bu satın alım cüzdanına uyuyor mu?\" analizi de göreceksin. Veriler sadece tarayıcında saklanır.",
    "fit.create_profile": "Profil_oluştur",
    "fit.48h_rule": "48 saat kuralı",
    "fit.48h_body": "Bu satın alımı iki gün ertele. Pişman olma ihtimali yüksek satın alımlarda 48 saat bekleme, dürtüsel karardan ölçülü karara geçmenin en bilinen yöntemidir.",

    // Ethics
    "ethics.section": "Etik_Skor",
    "ethics.beta": "beta",
    "ethics.title_part1": "Bu satıcı",
    "ethics.title_part2": "etik",
    "ethics.title_part3": "mi?",
    "ethics.sub": "Satıcı güvenilirliği, şeffaflık, tüketici hakları ve sürdürülebilirlik boyutlarında heuristic analiz. Backend bağımsız — istemci tarafında hesaplanır.",
    "ethics.report": "ETİK_RAPORU",
    "ethics.source": "heuristic · client",
    "ethics.tier_ethical": "Etik",
    "ethics.tier_acceptable": "Kabul Edilebilir",
    "ethics.tier_questionable": "Sorgulabilir",
    "ethics.show_details": "detayları_göster",
    "ethics.hide_details": "detayları_gizle",

    // History
    "history.title": "Tarama geçmişi",
    "history.empty": "Henüz tarama yapılmadı.",
    "history.filter_all": "Tümü",

    // Compare
    "compare.section": "KARŞILAŞTIRMA · seçim",
    "compare.title_part1": "İki tarama",
    "compare.title_part2": "seç",
    "compare.pick_demo": "demo senaryoları",
    "compare.pick_recent": "son taramaların",
    "compare.start": "Karşılaştırmayı_başlat",
    "compare.select_two": "iki tarama seç",
    "compare.side_a_empty": "a tarafı boş",
    "compare.side_b_empty": "b tarafı boş",
    "compare.same_selected": "ikisi aynı — farklı seç",

    // Phishing
    "phishing.title": "Phishing taraması",
    "phishing.sub": "Şüpheli SMS veya e-posta screenshot'ını yükle.",
    "phishing.drop": "Görseli buraya sürükle veya tıkla",
    "phishing.scanning": "Görsel analiz ediliyor…",

    // Settings
    "settings.title": "Ayarlar",
    "settings.profile_title": "Finansal Profil",
    "settings.income": "Aylık gelir (₺)",
    "settings.budget": "Alışveriş bütçesi (₺)",
    "settings.payday": "Maaş günü",
    "settings.save": "Kaydet",

    // Theme
    "theme.light": "light_mode",
    "theme.dark": "dark_mode",

    // Language
    "lang.tr": "Türkçe",
    "lang.en": "English",
    "lang.switch": "dil",

    // Topbar
    "topbar.api_status": "api · operational",
    "topbar.github": "github_↗",

    // Alternative
    "alt.section": "alternatif_öneri · daha_iyi_seçenek",
    "alt.tag": "BETTER_DEAL",
    "alt.text_part1": "Aynı ürün",
    "alt.text_part2": "daha ucuza var",
    "alt.savings": "tasarruf",
    "alt.go": "Karşılaştırmaya_git",
    "alt.price_label": "alternatif fiyat",

    // General
    "general.loading": "yükleniyor…",
    "general.error": "Bir hata oluştu",
    "general.retry": "Tekrar dene",
    "general.close": "Kapat",
  },

  en: {
    // Navigation
    "nav.scan": "Scan",
    "nav.history": "History",
    "nav.compare": "Compare",
    "nav.phishing": "Phishing",
    "nav.settings": "Settings",
    "nav.menu": "Menu",
    "nav.operator": "Operator",
    "nav.soon": "soon",

    // Dashboard
    "dashboard.title": "Quick scan",
    "dashboard.subtitle": "Paste a product link, let the 7-layer AI analysis begin.",
    "dashboard.input_placeholder": "https://www.trendyol.com/... product link",
    "dashboard.scan_btn": "Scan",
    "dashboard.scanning": "Scanning…",
    "dashboard.recent": "Recent scans",
    "dashboard.no_recent": "No scans yet.",
    "dashboard.demo_title": "Demo scenarios",
    "dashboard.demo_sub": "Ready URLs for quick testing",

    // Scan Detail
    "scan.eyebrow": "scan",
    "scan.low_data_title": "Limited analysis with insufficient data",
    "scan.low_data_body": "No user reviews found for this product. Review layer was skipped, the decision relies on signals from other layers — not enough to verify trust on its own.",
    "scan.price": "price",
    "scan.seller": "seller",
    "scan.verified": "✓ verified",
    "scan.rating": "rating",
    "scan.duration": "duration",
    "scan.time": "time",
    "scan.layers_title": "evidence",
    "scan.layers_sub": "Each layer ran independently and produced its own score. Sorted by status, RISK first.",
    "scan.actions": "Actions",
    "scan.petition": "Generate petition",
    "scan.petition_sub": "Consumer Arbitration Board · PDF",
    "scan.history_link": "Go to history",
    "scan.history_sub": "See all your scans",
    "scan.compare_link": "Compare",
    "scan.compare_sub": "Side by side with another scan or demo",
    "scan.share": "Share",
    "scan.share_sub": "Link + OG card + share text",
    "scan.new_scan": "New_scan",
    "scan.cached": "cached",
    "scan.ago_just_now": "just now",
    "scan.ago_min": "min ago",
    "scan.ago_hour": "hours ago",
    "scan.ago_day": "days ago",
    "scan.reviews": "reviews",

    // Verdicts
    "verdict.BUY": "BUY",
    "verdict.CAUTION": "CAUTION",
    "verdict.AVOID": "AVOID",

    // Status
    "status.risk": "risk",
    "status.warn": "warn",
    "status.ok": "ok",
    "status.info": "info",

    // Financial Fit
    "fit.section": "Wallet_Perspective",
    "fit.title_part1": "Does this purchase",
    "fit.title_part2": "fit",
    "fit.title_part3": "your wallet?",
    "fit.sub": "Trust score is the product's reliability. This section provides a separate reading based on your financial profile — the decision is yours.",
    "fit.report": "WALLET_REPORT",
    "fit.source": "local · from profile",
    "fit.budget_of": "of budget",
    "fit.comfortable": "Comfortable",
    "fit.significant": "Significant portion",
    "fit.stretch": "Stretching budget",
    "fit.no_profile_title": "No financial profile.",
    "fit.no_profile_body": "Fill in your monthly income + budget + payday once. You'll see a \"does this purchase fit your wallet?\" analysis with every scan. Data is stored only in your browser.",
    "fit.create_profile": "Create_profile",
    "fit.48h_rule": "48-hour rule",
    "fit.48h_body": "Delay this purchase for two days. For high-regret-risk purchases, waiting 48 hours is the most proven method to shift from impulsive to measured decisions.",

    // Ethics
    "ethics.section": "Ethics_Score",
    "ethics.beta": "beta",
    "ethics.title_part1": "Is this seller",
    "ethics.title_part2": "ethical",
    "ethics.title_part3": "?",
    "ethics.sub": "Heuristic analysis across seller reliability, transparency, consumer rights, and sustainability. Backend-independent — computed client-side.",
    "ethics.report": "ETHICS_REPORT",
    "ethics.source": "heuristic · client",
    "ethics.tier_ethical": "Ethical",
    "ethics.tier_acceptable": "Acceptable",
    "ethics.tier_questionable": "Questionable",
    "ethics.show_details": "show_details",
    "ethics.hide_details": "hide_details",

    // History
    "history.title": "Scan history",
    "history.empty": "No scans yet.",
    "history.filter_all": "All",

    // Compare
    "compare.section": "COMPARISON · selection",
    "compare.title_part1": "Select two",
    "compare.title_part2": "scans",
    "compare.pick_demo": "demo scenarios",
    "compare.pick_recent": "your recent scans",
    "compare.start": "Start_comparison",
    "compare.select_two": "select two scans",
    "compare.side_a_empty": "side A empty",
    "compare.side_b_empty": "side B empty",
    "compare.same_selected": "both are the same — pick different",

    // Phishing
    "phishing.title": "Phishing scan",
    "phishing.sub": "Upload a suspicious SMS or email screenshot.",
    "phishing.drop": "Drop image here or click to browse",
    "phishing.scanning": "Analyzing image…",

    // Settings
    "settings.title": "Settings",
    "settings.profile_title": "Financial Profile",
    "settings.income": "Monthly income (₺)",
    "settings.budget": "Shopping budget (₺)",
    "settings.payday": "Payday",
    "settings.save": "Save",

    // Theme
    "theme.light": "light_mode",
    "theme.dark": "dark_mode",

    // Language
    "lang.tr": "Türkçe",
    "lang.en": "English",
    "lang.switch": "lang",

    // Topbar
    "topbar.api_status": "api · operational",
    "topbar.github": "github_↗",

    // Alternative
    "alt.section": "alternative · better_deal",
    "alt.tag": "BETTER_DEAL",
    "alt.text_part1": "Same product",
    "alt.text_part2": "cheaper elsewhere",
    "alt.savings": "savings",
    "alt.go": "Go_to_comparison",
    "alt.price_label": "alternative price",

    // General
    "general.loading": "loading…",
    "general.error": "An error occurred",
    "general.retry": "Retry",
    "general.close": "Close",
  },
} as const;

export function t(key: TranslationKey, locale: Locale): string {
  return translations[locale][key] ?? translations.tr[key] ?? key;
}
