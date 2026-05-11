export function Footer() {
  return (
    <footer className="relative">
      {/* Big editorial CTA strip */}
      <section className="relative border-b border-[var(--border-strong)] overflow-hidden">
        <div className="absolute inset-0 grid-bg pointer-events-none opacity-50" />
        <div className="relative max-w-[1400px] mx-auto px-6 py-20 lg:py-28 grid lg:grid-cols-12 gap-8 items-end">
          <div className="lg:col-span-8">
            <div className="font-mono text-[10px] tracking-[0.32em] uppercase text-[var(--muted)] mb-6 flex items-center gap-3">
              <span className="h-px w-8 bg-[var(--accent)]" />
              <span>05 / Çağrı</span>
            </div>
            <h3 className="font-serif text-[clamp(2rem,5vw,4.2rem)] leading-[0.98] tracking-[-0.015em] text-[var(--foreground)]">
              Bir sonraki sepetinden{" "}
              <span className="italic text-[var(--accent)]">önce</span>,
              <br />
              TrustLens&apos;ten geçir.
            </h3>
          </div>
          <div className="lg:col-span-4 flex lg:justify-end">
            <a
              href="/dashboard"
              className="group inline-flex items-center gap-3 bg-[var(--accent)] hover:bg-[var(--accent-dim)] text-black px-7 py-4 font-mono text-[11px] tracking-[0.22em] uppercase transition-colors"
            >
              <span>Tarama_başlat</span>
              <span className="font-sans transition-transform group-hover:translate-x-0.5">→</span>
            </a>
          </div>
        </div>
      </section>

      {/* Diagnostic footer */}
      <div className="bg-black">
        <div className="max-w-[1400px] mx-auto px-6 py-10 grid grid-cols-2 lg:grid-cols-12 gap-8 font-mono text-[10px] tracking-[0.18em] uppercase">
          <div className="col-span-2 lg:col-span-4">
            <div className="flex items-center gap-2 text-[var(--foreground)] mb-3">
              <span className="status-dot status-dot-ok live-pulse" />
              <span className="tracking-[0.22em]">TrustLens_AI</span>
            </div>
            <p className="text-[var(--muted)] leading-relaxed normal-case tracking-normal text-[12px] font-sans max-w-xs">
              BTK Akademi Hackathon 2026 için geliştirilmiş açık kaynak
              e-ticaret güven asistanı.
            </p>
          </div>

          <div className="lg:col-span-2 lg:col-start-6">
            <div className="text-[var(--muted-2)] mb-3">Bağlantılar</div>
            <ul className="space-y-2 text-[var(--foreground)]">
              <li>
                <a
                  href="https://github.com/MAliTopkara/BTK-2026"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-[var(--accent)] transition-colors"
                >
                  github_↗
                </a>
              </li>
              <li>
                <a href="/dashboard" className="hover:text-[var(--accent)] transition-colors">
                  dashboard
                </a>
              </li>
              <li className="text-[var(--muted-2)] cursor-not-allowed">
                phishing_tarayıcı
                <span className="ml-2 text-[9px] tracking-[0.22em] text-[var(--muted-2)]/70">
                  yakında
                </span>
              </li>
            </ul>
          </div>

          <div className="lg:col-span-2">
            <div className="text-[var(--muted-2)] mb-3">Stack</div>
            <ul className="space-y-2 text-[var(--foreground)]/80">
              <li>FastAPI · LangGraph</li>
              <li>Gemini 2.5 Pro/Flash</li>
              <li>Next.js · Tailwind</li>
              <li>Supabase · Upstash</li>
            </ul>
          </div>

          <div className="lg:col-span-2">
            <div className="text-[var(--muted-2)] mb-3">Diagnostic</div>
            <ul className="space-y-2 text-[var(--foreground)]/80">
              <li>v0.1.0 · main</li>
              <li>region · eu-central</li>
              <li className="flex items-center gap-2">
                <span className="status-dot status-dot-ok" />
                operational
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-[var(--border)]">
          <div className="max-w-[1400px] mx-auto px-6 h-12 flex items-center justify-between font-mono text-[9px] tracking-[0.22em] uppercase text-[var(--muted-2)]">
            <span>© 2026 · MAliTopkara / MehdiSndg / enesbildirir</span>
            <span className="hidden sm:inline">Build_a1b3c · 11.05.2026</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
