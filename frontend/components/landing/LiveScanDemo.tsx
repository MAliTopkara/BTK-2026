const layers = [
  { id: "01", name: "Sahte Yorum Tespiti", status: "RISK", score: "24", delay: "1.4s" },
  { id: "02", name: "Sahte İndirim", status: "RISK", score: "30", delay: "2.0s" },
  { id: "03", name: "Manipülatif Tasarım", status: "RISK", score: "20", delay: "2.6s" },
  { id: "04", name: "Satıcı Profili", status: "WARN", score: "45", delay: "3.2s" },
  { id: "05", name: "Görsel Doğrulama", status: "WARN", score: "55", delay: "3.8s" },
  { id: "06", name: "Çapraz Platform", status: "OK", score: "78", delay: "4.4s" },
  { id: "07", name: "Phishing Tarama", status: "INFO", score: "—", delay: "5.0s" },
] as const;

const statusStyles: Record<string, { dot: string; text: string }> = {
  RISK: { dot: "status-dot-risk", text: "text-[var(--red)]" },
  WARN: { dot: "status-dot-warn", text: "text-[var(--yellow)]" },
  OK: { dot: "status-dot-ok", text: "text-[var(--accent)]" },
  INFO: { dot: "status-dot-info", text: "text-[var(--muted-2)]" },
};

export function LiveScanDemo() {
  return (
    <div className="corner-frame relative bg-[var(--surface)] border border-[var(--border-strong)] font-mono text-[12px]">
      <span className="c-tr" />
      <span className="c-bl" />

      {/* Title bar */}
      <div className="flex items-center justify-between px-4 h-9 border-b border-[var(--border-strong)] bg-black/40">
        <div className="flex items-center gap-2.5 text-[10px] tracking-[0.22em] uppercase text-[var(--muted)]">
          <span className="status-dot status-dot-ok live-pulse" />
          <span>Live_Scan / Demo_001</span>
        </div>
        <div className="flex items-center gap-3 text-[10px] tracking-[0.18em] uppercase text-[var(--muted-2)]">
          <span className="hidden sm:inline">LAT 6.8s</span>
          <span>TR / TRY</span>
        </div>
      </div>

      {/* URL + status header */}
      <div className="p-4 border-b border-[var(--border)] space-y-2.5">
        <div className="flex items-baseline gap-4">
          <span className="text-[10px] tracking-[0.2em] uppercase text-[var(--muted-2)] w-14 shrink-0">
            URL
          </span>
          <span className="text-[var(--foreground)] truncate">
            <span className="type-url text-[var(--accent)]">
              https://www.trendyol.com/apple-airpods-pro-2nd-gen
            </span>
            <span className="cursor" />
          </span>
        </div>

        <div className="flex items-center gap-4">
          <span className="text-[10px] tracking-[0.2em] uppercase text-[var(--muted-2)] w-14 shrink-0">
            Status
          </span>
          <span className="flex-1 h-2 border border-[var(--border-strong)] overflow-hidden relative">
            <span className="absolute inset-y-0 left-0 bg-[var(--accent)] progress-fill" />
            <span className="absolute inset-0 stripes-active opacity-50" />
          </span>
          <span className="text-[10px] tracking-[0.18em] uppercase text-[var(--accent)]">
            ANALYZING
          </span>
        </div>
      </div>

      {/* Layer table */}
      <div className="px-4 py-3">
        <div className="grid grid-cols-[24px_1fr_64px_44px] gap-3 pb-2 mb-1 border-b border-[var(--border)] text-[9px] tracking-[0.22em] uppercase text-[var(--muted-2)]">
          <span>#</span>
          <span>Agent</span>
          <span className="text-right">Status</span>
          <span className="text-right">Score</span>
        </div>

        {layers.map((l) => {
          const s = statusStyles[l.status];
          return (
            <div
              key={l.id}
              className="layer-reveal grid grid-cols-[24px_1fr_64px_44px] gap-3 py-[7px] items-center border-b border-[var(--border)]/60 last:border-b-0"
              style={{ animationDelay: l.delay }}
            >
              <span className="text-[var(--muted-2)] text-[10px]">{l.id}</span>
              <span className="text-[var(--foreground)] text-[11.5px]">
                {l.name}
              </span>
              <span className={`text-right text-[10px] tracking-[0.16em] uppercase ${s.text}`}>
                <span className={`status-dot ${s.dot} mr-1.5`} />
                {l.status}
              </span>
              <span className={`text-right tabular-nums ${s.text}`}>
                {l.score}
              </span>
            </div>
          );
        })}
      </div>

      {/* Verdict footer */}
      <div className="border-t border-[var(--border-strong)] bg-black/40 px-4 py-4 grid grid-cols-2 gap-4 items-end">
        <div>
          <div className="text-[9px] tracking-[0.22em] uppercase text-[var(--muted-2)] mb-1">
            Genel Skor
          </div>
          <div className="flex items-baseline gap-2 verdict-reveal">
            <span className="font-serif italic text-[44px] leading-none text-[var(--red)] tabular-nums">
              34
            </span>
            <span className="text-[var(--muted)] text-[12px]">/100</span>
          </div>
        </div>
        <div className="text-right">
          <div className="text-[9px] tracking-[0.22em] uppercase text-[var(--muted-2)] mb-1">
            Karar
          </div>
          <div className="verdict-reveal inline-flex items-center gap-2 border border-[var(--red)]/60 bg-[var(--red)]/10 px-3 py-1.5">
            <span className="status-dot status-dot-risk" />
            <span className="text-[var(--red)] text-[12px] tracking-[0.22em] uppercase font-medium">
              ALMA
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
