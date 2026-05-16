type Scenario = {
  id: string;
  title: string;
  platform: string;
  url: string;
  score: number;
  verdict: { code: "AVOID" | "CAUTION" | "BUY"; label: string; tr: string };
  duration: string;
  findings: { layer: string; status: "RISK" | "WARN" | "OK"; finding: string }[];
  demoPath: string;
};

const scenarios: Scenario[] = [
  {
    id: "airpods_fake",
    title: "Apple AirPods Pro 2. Nesil",
    platform: "trendyol.com",
    url: "/apple-airpods-pro-2nd-gen",
    score: 34,
    verdict: { code: "AVOID", label: "AVOID", tr: "ALMA" },
    duration: "7.4s",
    demoPath: "/demo/airpods_fake",
    findings: [
      { layer: "Sahte İndirim", status: "RISK", finding: "3.299 → 4.999 TL pump tespit edildi" },
      { layer: "Sahte Yorum", status: "RISK", finding: "30/50 jenerik · 12 saatte kümelenmiş" },
      { layer: "Dark Pattern", status: "RISK", finding: "fake_urgency · fake_social_proof" },
    ],
  },
  {
    id: "laptop_suspicious",
    title: "Xiaomi RedmiBook Pro 15",
    platform: "hepsiburada.com",
    url: "/xiaomi-redmibook-pro-15",
    score: 58,
    verdict: { code: "CAUTION", label: "CAUTION", tr: "DİKKATLİ OL" },
    duration: "8.1s",
    demoPath: "/demo/laptop_suspicious",
    findings: [
      { layer: "Sahte İndirim", status: "WARN", finding: "+%11 hafif pump, sonra kademeli düşüş" },
      { layer: "Satıcı", status: "WARN", finding: "Yeni hesap, doğrulanmamış" },
      { layer: "Görsel", status: "WARN", finding: "Stok foto · logo tutarsızlığı" },
    ],
  },
  {
    id: "watch_genuine",
    title: "Casio G-Shock GA-2100-1AER",
    platform: "trendyol.com",
    url: "/casio-g-shock-ga-2100",
    score: 87,
    verdict: { code: "BUY", label: "BUY", tr: "AL" },
    duration: "6.9s",
    demoPath: "/demo/watch_genuine",
    findings: [
      { layer: "Sahte İndirim", status: "OK", finding: "Gerçek %11 indirim, fiyat stabil" },
      { layer: "Sahte Yorum", status: "OK", finding: "Yorumlar özgün, farklı tarihler" },
      { layer: "Satıcı", status: "OK", finding: "Doğrulanmış mağaza · 4.8 · 200+ değerlendirme" },
    ],
  },
  {
    id: "phishing_sms",
    title: "Sahte Apple Promosyonu (SMS)",
    platform: "apple-tr-promo.shop",
    url: "/airpods-kampanya?utm=sms",
    score: 8,
    verdict: { code: "AVOID", label: "AVOID", tr: "ALMA" },
    duration: "5.8s",
    demoPath: "/demo/phishing_sms",
    findings: [
      { layer: "Phishing", status: "RISK", finding: "Brand impersonation · 4 günlük domain · WHOIS privacy" },
      { layer: "Sahte İndirim", status: "RISK", finding: "AirPods 49 TL — imkansız fiyat" },
      { layer: "Dark Pattern", status: "RISK", finding: "Sahte çekiliş + 'son 2 saat' baskısı" },
    ],
  },
];

const verdictStyles = {
  AVOID: {
    ringStroke: "#ff4d4d",
    text: "text-[var(--red)]",
    border: "border-[var(--red)]/40",
    bg: "bg-[var(--red)]/[0.06]",
    dot: "status-dot-risk",
  },
  CAUTION: {
    ringStroke: "#ffcc33",
    text: "text-[var(--yellow)]",
    border: "border-[var(--yellow)]/40",
    bg: "bg-[var(--yellow)]/[0.05]",
    dot: "status-dot-warn",
  },
  BUY: {
    ringStroke: "#00ff88",
    text: "text-[var(--accent)]",
    border: "border-[var(--accent)]/40",
    bg: "bg-[var(--accent)]/[0.04]",
    dot: "status-dot-ok",
  },
};

type CachedProduct = {
  title: string;
  platform: "Trendyol" | "Amazon TR";
  score: number;
  verdict: "BUY" | "CAUTION" | "AVOID";
  url: string;
};

const cachedProducts: CachedProduct[] = [
  {
    title: "Apple iPhone 15 256GB Mavi",
    platform: "Trendyol",
    score: 86,
    verdict: "BUY",
    url: "https://www.trendyol.com/apple/iphone-15-256-gb-mavi-p-762254862?boutiqueId=689770&merchantId=968",
  },
  {
    title: "JBL Tune 520BT Kablosuz Kulaklık",
    platform: "Trendyol",
    score: 86,
    verdict: "BUY",
    url: "https://www.trendyol.com/jbl/tune-520bt-multi-connect-wireless-blue-p-702008926?boutiqueId=61&merchantId=624588",
  },
  {
    title: "Vestel 32\" HD Smart TV",
    platform: "Trendyol",
    score: 86,
    verdict: "BUY",
    url: "https://www.trendyol.com/vestel/32ht9150-32-inc-hd-smart-tv-p-1032347897?boutiqueId=61&merchantId=289170",
  },
  {
    title: "SEG 40\" Smart TiVo TV",
    platform: "Trendyol",
    score: 86,
    verdict: "BUY",
    url: "https://www.trendyol.com/seg/40srb900-40-smart-tivo-tv-p-901540714?boutiqueId=61&merchantId=154954",
  },
  {
    title: "Coverzone 18W Şarj Kılıfı",
    platform: "Amazon TR",
    score: 65,
    verdict: "CAUTION",
    url: "https://www.amazon.com.tr/Coverzone-18W-Uyumlu-%C5%9Earj-K%C4%B1l%C4%B1f%C4%B1/dp/B0GP16RLHS/",
  },
];

function MiniScoreRing({ score, color }: { score: number; color: string }) {
  const r = 18;
  const c = 2 * Math.PI * r;
  const offset = c - (score / 100) * c;
  return (
    <svg viewBox="0 0 48 48" className="w-12 h-12 -rotate-90 shrink-0">
      <circle cx="24" cy="24" r={r} fill="none" stroke="var(--border-strong)" strokeWidth="3" />
      <circle
        cx="24"
        cy="24"
        r={r}
        fill="none"
        stroke={color}
        strokeWidth="3"
        strokeDasharray={c}
        strokeDashoffset={offset}
        strokeLinecap="round"
      />
    </svg>
  );
}

const statusColors = {
  RISK: "text-[var(--red)]",
  WARN: "text-[var(--yellow)]",
  OK: "text-[var(--accent)]",
};

function ScoreRing({ score, color }: { score: number; color: string }) {
  const r = 38;
  const c = 2 * Math.PI * r;
  const offset = c - (score / 100) * c;
  return (
    <svg viewBox="0 0 100 100" className="w-24 h-24 -rotate-90">
      <circle
        cx="50"
        cy="50"
        r={r}
        fill="none"
        stroke="var(--border-strong)"
        strokeWidth="3"
      />
      <circle
        cx="50"
        cy="50"
        r={r}
        fill="none"
        stroke={color}
        strokeWidth="3"
        strokeDasharray={c}
        strokeDashoffset={offset}
        strokeLinecap="round"
      />
    </svg>
  );
}

export function DemoScenarios() {
  return (
    <section className="relative border-b border-[var(--border)] py-24 lg:py-32">
      <div className="max-w-[1400px] mx-auto px-6">
        <div className="grid lg:grid-cols-12 gap-8 mb-16 items-end">
          <div className="lg:col-span-7">
            <div className="font-mono text-[10px] tracking-[0.32em] uppercase text-[var(--muted)] mb-6 flex items-center gap-3">
              <span className="h-px w-8 bg-[var(--accent)]" />
              <span>04 / Örnek_Çıktılar</span>
            </div>
            <h2 className="font-serif text-[clamp(2.2rem,4.5vw,3.8rem)] leading-[0.98] tracking-[-0.015em] text-[var(--foreground)]">
              Dört senaryo,{" "}
              <span className="italic text-[var(--muted)]">dört farklı</span>{" "}
              karar.
            </h2>
          </div>
          <div className="lg:col-span-5">
            <p className="text-[14px] leading-relaxed text-[var(--muted)] max-w-md">
              Aşağıdaki tarama sonuçları{" "}
              <span className="text-[var(--foreground)]">
                pre-cache edilmiş gerçek pipeline çıktılarıdır
              </span>
              . Karta tıkla, 8 saniyelik analizi izle — login gerekmez.
            </p>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 gap-px bg-[var(--border-strong)] border border-[var(--border-strong)]">
          {scenarios.map((s) => {
            const v = verdictStyles[s.verdict.code];
            return (
              <a
                key={s.id}
                href={s.demoPath}
                className={`relative ${v.bg} p-6 lg:p-7 flex flex-col group cursor-pointer hover:bg-opacity-80 transition-colors`}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-6">
                  <div className="font-mono text-[9px] tracking-[0.22em] uppercase text-[var(--muted-2)]">
                    Tarama_{s.id}
                  </div>
                  <div className="font-mono text-[9px] tracking-[0.18em] uppercase text-[var(--muted-2)]">
                    LAT {s.duration}
                  </div>
                </div>

                {/* Score + Verdict */}
                <div className="flex items-center gap-5 mb-6">
                  <div className="relative shrink-0">
                    <ScoreRing score={s.score} color={v.ringStroke} />
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span
                        className={`font-serif italic text-3xl ${v.text} tabular-nums leading-none`}
                      >
                        {s.score}
                      </span>
                      <span className="font-mono text-[8px] tracking-[0.2em] uppercase text-[var(--muted-2)] mt-0.5">
                        / 100
                      </span>
                    </div>
                  </div>

                  <div>
                    <div
                      className={`inline-flex items-center gap-2 border ${v.border} bg-black/30 px-2.5 py-1 font-mono text-[10px] tracking-[0.22em] uppercase ${v.text}`}
                    >
                      <span className={`status-dot ${v.dot}`} />
                      {s.verdict.tr}
                    </div>
                    <div className="font-mono text-[10px] tracking-[0.16em] uppercase text-[var(--muted-2)] mt-2">
                      {s.verdict.label}
                    </div>
                  </div>
                </div>

                {/* Title */}
                <h3 className="font-serif italic text-[22px] leading-tight text-[var(--foreground)] mb-1.5">
                  {s.title}
                </h3>
                <div className="font-mono text-[11px] text-[var(--muted)] mb-6 truncate">
                  {s.platform}
                  <span className="text-[var(--muted-2)]">{s.url}</span>
                </div>

                {/* Findings */}
                <div className="space-y-3 border-t border-[var(--border)] pt-4 mt-auto">
                  {s.findings.map((f, i) => (
                    <div key={i} className="font-mono text-[11px] flex items-start gap-2.5">
                      <span
                        className={`shrink-0 tracking-[0.18em] uppercase ${statusColors[f.status]}`}
                      >
                        [{f.status}]
                      </span>
                      <span className="text-[var(--foreground)]/80 leading-relaxed">
                        {f.finding}
                      </span>
                    </div>
                  ))}
                </div>

                {/* CTA */}
                <div className={`mt-5 font-mono text-[10px] tracking-[0.22em] uppercase ${v.text} flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity`}>
                  <span className={`status-dot ${v.dot}`} />
                  Detaylı analizi gör →
                </div>
              </a>
            );
          })}
        </div>

        <div className="mt-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 font-mono text-[10px] tracking-[0.22em] uppercase text-[var(--muted)]">
          <span>4 senaryo · 28 layer çıktısı · 28.2s toplam · login gereksiz</span>
          <a
            href="/dashboard"
            className="text-[var(--accent)] hover:text-[var(--foreground)] transition-colors inline-flex items-center gap-2"
          >
            Kendi linkinle dene
            <span className="font-sans">→</span>
          </a>
        </div>

        {/* ── Cached Real URLs ── */}
        <div className="mt-20 border-t border-[var(--border)] pt-16">
          <div className="grid lg:grid-cols-12 gap-8 mb-10 items-end">
            <div className="lg:col-span-7">
              <div className="font-mono text-[10px] tracking-[0.32em] uppercase text-[var(--muted)] mb-5 flex items-center gap-3">
                <span className="h-px w-8 bg-[var(--accent)]" />
                <span>05 / Gerçek_Taramalar</span>
              </div>
              <h2 className="font-serif text-[clamp(1.8rem,3.5vw,3rem)] leading-[1.0] tracking-[-0.015em] text-[var(--foreground)]">
                Gerçek ürünler,{" "}
                <span className="italic text-[var(--muted)]">cache&apos;lenmiş sonuçlar.</span>
              </h2>
            </div>
            <div className="lg:col-span-5">
              <p className="text-[13px] leading-relaxed text-[var(--muted)] max-w-sm">
                Aşağıdaki URL&apos;ler önceden tarandı ve cache&apos;lendi.
                Karta tıkla → dashboard&apos;da URL dolup{" "}
                <span className="text-[var(--foreground)]">&lt;1 sn</span> içinde sonuç gelir.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {cachedProducts.map((p) => {
              const v = verdictStyles[p.verdict];
              const dashboardHref = `/dashboard?url=${encodeURIComponent(p.url)}`;
              return (
                <a
                  key={p.url}
                  href={dashboardHref}
                  className={`group corner-frame relative ${v.bg} border ${v.border} p-5 flex items-center gap-4 hover:opacity-90 transition-opacity cursor-pointer`}
                >
                  <span className="c-tr" />
                  <span className="c-bl" />

                  {/* Mini score ring */}
                  <div className="relative shrink-0">
                    <MiniScoreRing score={p.score} color={v.ringStroke} />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className={`font-serif italic text-[13px] tabular-nums ${v.text}`}>
                        {p.score}
                      </span>
                    </div>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span
                        className={`inline-flex items-center gap-1.5 border ${v.border} px-2 py-0.5 font-mono text-[9px] tracking-[0.2em] uppercase ${v.text}`}
                      >
                        <span className={`status-dot ${v.dot}`} />
                        {p.verdict === "BUY" ? "AL" : p.verdict === "CAUTION" ? "DİKKATLİ OL" : "ALMA"}
                      </span>
                      <span className="font-mono text-[9px] tracking-[0.18em] uppercase text-[var(--muted-2)]">
                        {p.platform}
                      </span>
                    </div>
                    <p className="font-serif italic text-[15px] leading-tight text-[var(--foreground)] truncate">
                      {p.title}
                    </p>
                  </div>

                  {/* Arrow */}
                  <span className={`${v.text} font-sans text-[14px] shrink-0 opacity-0 group-hover:opacity-100 transition-opacity`}>
                    →
                  </span>
                </a>
              );
            })}
          </div>

          <div className="mt-6 font-mono text-[10px] tracking-[0.22em] uppercase text-[var(--muted-2)]">
            5 ürün · 4 Trendyol · 1 Amazon TR · cache hit &lt;1s · giriş gereksiz
          </div>
        </div>
      </div>
    </section>
  );
}
