export function DiagnosticBar() {
  return (
    <div className="border-b border-[var(--border)] bg-[var(--surface)]/40 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-[1400px] mx-auto px-6 h-10 flex items-center justify-between font-mono text-[10px] tracking-[0.18em] uppercase">
        <div className="flex items-center gap-6 text-[var(--muted)]">
          <span className="flex items-center gap-2 text-[var(--foreground)]">
            <span className="status-dot status-dot-ok live-pulse" />
            TrustLens_AI
          </span>
          <span className="hidden sm:inline text-[var(--muted-2)]">v0.1.0</span>
          <span className="hidden md:inline text-[var(--muted-2)]">BTK_Akademi_2026</span>
        </div>

        <div className="flex items-center gap-6 text-[var(--muted)]">
          <span className="hidden md:inline">7 katman · paralel</span>
          <span className="hidden sm:inline">Gemini_2.5_Pro</span>
          <a
            href="https://github.com/MAliTopkara/BTK-2026"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--foreground)] hover:text-[var(--accent)] transition-colors"
          >
            github_↗
          </a>
        </div>
      </div>
    </div>
  );
}
