import { LiveScanDemo } from "./LiveScanDemo";

export function Hero() {
  return (
    <section className="relative border-b border-[var(--border)] overflow-hidden">
      <div className="absolute inset-0 grid-bg pointer-events-none" />
      <div className="absolute inset-0 console-glow pointer-events-none" />

      <div className="relative max-w-[1400px] mx-auto px-6 pt-20 pb-24 lg:pt-28 lg:pb-32 grid lg:grid-cols-12 gap-12 lg:gap-16 items-start">
        {/* Left: Editorial copy */}
        <div className="lg:col-span-6 lg:pt-6">
          <div className="font-mono text-[10px] tracking-[0.32em] uppercase text-[var(--muted)] mb-10 flex items-center gap-3">
            <span className="h-px w-8 bg-[var(--accent)]" />
            <span>01 / Hipotez</span>
          </div>

          <h1 className="font-serif text-[clamp(2rem,7vw,6.5rem)] leading-[0.92] tracking-[-0.02em] text-[var(--foreground)] break-words">
            Bu ürün{" "}
            <span className="italic text-[var(--muted)]">gerçekten</span>
            <br />
            güvenilir{" "}
            <span className="text-[var(--accent)] italic">mi?</span>
          </h1>

          <div className="mt-10 max-w-md space-y-5">
            <p className="text-[15px] leading-relaxed text-[var(--foreground)]/85">
              TrustLens, herhangi bir e-ticaret bağlantısını{" "}
              <span className="font-mono text-[13px] text-[var(--accent)]">8 saniyede</span>{" "}
              7 katmanlı bir adli analizden geçirir.
            </p>
            <p className="text-[13px] leading-relaxed text-[var(--muted)]">
              Sahte yorumu, pompalanmış indirimi, dark pattern&apos;ı, şüpheli
              satıcıyı, AI üretimi görseli — hepsini ayrı ayrı çıkarır. Kararı
              gizlemez, zincirini açıklar.
            </p>
          </div>

          <div className="mt-12 flex flex-wrap items-center gap-3">
            <a
              href="/dashboard"
              className="group inline-flex items-center gap-3 bg-[var(--accent)] hover:bg-[var(--accent-dim)] text-black px-6 py-3 font-mono text-[11px] tracking-[0.22em] uppercase transition-colors"
            >
              <span>Demo&apos;yu_çalıştır</span>
              <span className="font-sans transition-transform group-hover:translate-x-0.5">→</span>
            </a>
            <a
              href="#layers"
              className="inline-flex items-center gap-3 border border-[var(--border-strong)] hover:border-[var(--foreground)] text-[var(--foreground)] px-6 py-3 font-mono text-[11px] tracking-[0.22em] uppercase transition-colors"
            >
              <span>Nasıl_çalışır</span>
            </a>
          </div>

          {/* Stats strip */}
          <div className="mt-16 pt-6 border-t border-[var(--border)] grid grid-cols-3 gap-4 max-w-md">
            {[
              { v: "7+1", l: "katman" },
              { v: "≈8s", l: "ortalama" },
              { v: "100%", l: "şeffaf" },
            ].map((s) => (
              <div key={s.l}>
                <div className="font-serif italic text-3xl text-[var(--foreground)] tabular-nums">
                  {s.v}
                </div>
                <div className="font-mono text-[10px] tracking-[0.2em] uppercase text-[var(--muted-2)] mt-1">
                  {s.l}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Live scan demo */}
        <div className="lg:col-span-6 lg:sticky lg:top-20">
          <div className="mb-4 flex items-center justify-between font-mono text-[10px] tracking-[0.22em] uppercase text-[var(--muted-2)]">
            <span>Canlı_demo</span>
            <span className="flex items-center gap-2">
              <span className="status-dot status-dot-ok live-pulse" />
              8s loop
            </span>
          </div>
          <LiveScanDemo />
          <p className="mt-4 font-mono text-[10px] tracking-[0.18em] uppercase text-[var(--muted-2)] leading-relaxed">
            Bu ekran, mock airpods_fake senaryosunun gerçek çıktısıdır —
            <br className="hidden sm:block" />
            Gemini 2.5 Flash + TF-IDF burst pattern + 90 günlük Akakçe.
          </p>
        </div>
      </div>
    </section>
  );
}
