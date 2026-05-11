import Link from "next/link";

export function ScanNotFound({ id }: { id: string }) {
  return (
    <div className="max-w-2xl py-12 lg:py-20">
      <div className="font-mono text-[10px] tracking-[0.32em] uppercase text-[var(--muted)] mb-8 flex items-center gap-3">
        <span className="h-px w-8 bg-[var(--red)]" />
        <span>404 / scan_not_found</span>
      </div>

      <h1 className="font-serif text-[clamp(2rem,4vw,3rem)] leading-[1.05] tracking-[-0.015em] mb-6">
        Bu tarama{" "}
        <span className="italic text-[var(--muted)]">oturumda</span> bulunamadı.
      </h1>

      <p className="text-[14px] text-[var(--muted)] leading-relaxed max-w-md mb-8">
        Hackathon sürümünde tarama sonuçları geçici olarak{" "}
        <span className="font-mono text-[var(--accent-dim)]">sessionStorage</span>
        &apos;da saklanıyor. Sayfa yenilendiğinde veya yeni bir tarayıcı oturumunda
        kaybolur. Kalıcı saklama TASK-26&apos;da geliyor.
      </p>

      <div className="border border-[var(--border-strong)] bg-[var(--surface)]/40 p-4 mb-10 font-mono text-[11px]">
        <div className="grid grid-cols-[100px_1fr] gap-y-2">
          <dt className="text-[var(--muted-2)] uppercase tracking-[0.2em] text-[10px]">
            scan_id
          </dt>
          <dd className="text-[var(--foreground)]/80 truncate">{id}</dd>
          <dt className="text-[var(--muted-2)] uppercase tracking-[0.2em] text-[10px]">
            cause
          </dt>
          <dd className="text-[var(--foreground)]/80">
            sessionStorage entry missing
          </dd>
        </div>
      </div>

      <Link
        href="/dashboard"
        className="group inline-flex items-center gap-3 bg-[var(--accent)] hover:bg-[var(--accent-dim)] text-black px-6 py-3 font-mono text-[11px] tracking-[0.24em] uppercase transition-colors"
      >
        <span>Yeni_tarama_başlat</span>
        <span className="font-sans transition-transform group-hover:translate-x-0.5">→</span>
      </Link>
    </div>
  );
}
