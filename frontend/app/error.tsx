"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // TASK-27: production'da Sentry/PostHog'a gönderilir
    console.error("[trustlens] unhandled error", error);
  }, [error]);

  const digest = error.digest ?? "—";
  const message = error.message || "Beklenmeyen bir hata oluştu.";

  return (
    <main className="min-h-screen flex items-center justify-center px-6 py-16 bg-[var(--bg)]">
      <div className="w-full max-w-2xl space-y-10">
        {/* Diagnostic strip */}
        <div className="font-mono text-[10px] tracking-[0.32em] uppercase text-[var(--muted)] flex items-center gap-3">
          <span className="h-px w-8 bg-[var(--red)]" />
          <span>runtime_error · stack_trace</span>
        </div>

        {/* Title */}
        <header className="space-y-4">
          <h1 className="font-serif text-[clamp(2.2rem,5vw,3.6rem)] leading-[1.02] tracking-[-0.02em]">
            Bir şeyler{" "}
            <span className="italic text-[var(--red)]">ters gitti</span>.
          </h1>
          <p className="text-[14px] text-[var(--muted)] leading-relaxed max-w-lg">
            İstemci tarafında yakalanmamış bir hata oluştu. Tekrar denemeyi veya
            ana sayfaya dönmeyi seçebilirsin.
          </p>
        </header>

        {/* Error console */}
        <div className="corner-frame relative bg-[var(--surface)] border border-[var(--border-strong)] font-mono">
          <span className="c-tr" />
          <span className="c-bl" />

          <div className="flex items-center justify-between px-4 h-9 border-b border-[var(--border-strong)] bg-black/40 text-[10px] tracking-[0.22em] uppercase">
            <div className="flex items-center gap-2.5 text-[var(--red)]">
              <span className="status-dot status-dot-risk" />
              <span>ERROR</span>
            </div>
            <span className="text-[var(--muted-2)]">digest · {digest}</span>
          </div>

          <pre className="px-4 py-4 text-[12px] text-[var(--foreground)]/80 leading-relaxed whitespace-pre-wrap break-words">
            {message}
          </pre>
        </div>

        {/* Actions */}
        <div className="grid sm:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => reset()}
            className="group bg-[var(--accent)] hover:bg-[var(--accent-dim)] text-black px-5 py-4 font-mono text-[11px] tracking-[0.24em] uppercase transition-colors flex items-center justify-between"
          >
            <span className="flex items-center gap-3">
              <span className="text-black/70">{">"}</span>
              <span>Tekrar_dene</span>
            </span>
            <span className="font-sans transition-transform group-hover:translate-x-0.5">
              ↻
            </span>
          </button>

          <Link
            href="/"
            className="group border border-[var(--border-strong)] hover:border-[var(--accent)] bg-black/30 px-5 py-4 font-mono text-[11px] tracking-[0.24em] uppercase text-[var(--foreground)]/85 transition-colors flex items-center justify-between"
          >
            <span className="flex items-center gap-3">
              <span className="text-[var(--muted)]">{">"}</span>
              <span>Ana_sayfa</span>
            </span>
            <span className="font-sans text-[var(--muted-2)] group-hover:text-[var(--accent)] group-hover:translate-x-0.5 transition-all">
              →
            </span>
          </Link>
        </div>
      </div>
    </main>
  );
}
