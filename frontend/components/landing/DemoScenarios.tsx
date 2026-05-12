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
    url: "/trendyol.com/apple-airpods-pro-2nd-gen",
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
    url: "/hepsiburada.com/xiaomi-redmibook-pro-15",
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
    url: "/trendyol.com/casio-g-shock-ga-2100",
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
              Üç senaryo,{" "}
              <span className="italic text-[var(--muted)]">üç farklı</span>{" "}
              karar.
            </h2>
          </div>
          <div className="lg:col-span-5">
            <p className="text-[14px] leading-relaxed text-[var(--muted)] max-w-md">
              Aşağıdaki tarama sonuçları, mock veri seti üzerinde çalışan
              ajanların gerçek çıktılarıdır — pre-cache edilmiş demo değil,{" "}
              <span className="text-[var(--foreground)]">canlı pipeline</span>.
            </p>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-px bg-[var(--border-strong)] border border-[var(--border-strong)]">
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
          <span>3 senaryo · 24 layer çıktısı · 22.4s toplam · login gereksiz</span>
          <a
            href="/dashboard"
            className="text-[var(--accent)] hover:text-[var(--foreground)] transition-colors inline-flex items-center gap-2"
          >
            Kendi linkinle dene
            <span className="font-sans">→</span>
          </a>
        </div>
      </div>
    </section>
  );
}
