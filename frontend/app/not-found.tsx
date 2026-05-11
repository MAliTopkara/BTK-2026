import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--foreground)] flex items-center px-6">
      <div className="max-w-2xl mx-auto w-full py-16 lg:py-24">
        <div className="font-mono text-[10px] tracking-[0.32em] uppercase text-[var(--muted)] mb-10 flex items-center gap-3">
          <span className="h-px w-8 bg-[var(--red)]" />
          <span>404 / route_not_found</span>
        </div>

        <h1 className="font-serif text-[clamp(2.4rem,5vw,4rem)] leading-[0.98] tracking-[-0.02em] mb-6">
          Aradığın sayfa{" "}
          <span className="italic text-[var(--muted)]">burada</span> değil.
        </h1>

        <p className="text-[14px] text-[var(--muted)] leading-relaxed max-w-md mb-10">
          Link kırık olabilir veya bu rota henüz yapılmamış olabilir. Geçmiş,
          Phishing ve Ayarlar sayfaları yakında geliyor.
        </p>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/"
            className="group inline-flex items-center gap-3 bg-[var(--accent)] hover:bg-[var(--accent-dim)] text-black px-6 py-3 font-mono text-[11px] tracking-[0.24em] uppercase transition-colors"
          >
            <span>Ana_sayfa</span>
            <span className="font-sans transition-transform group-hover:translate-x-0.5">
              →
            </span>
          </Link>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-3 border border-[var(--border-strong)] hover:border-[var(--foreground)] text-[var(--foreground)] px-6 py-3 font-mono text-[11px] tracking-[0.24em] uppercase transition-colors"
          >
            <span>Dashboard</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
