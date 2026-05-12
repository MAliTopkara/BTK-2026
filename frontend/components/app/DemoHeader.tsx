"use client";

import Link from "next/link";
import { LanguageToggle } from "@/components/ui/LanguageToggle";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

export function DemoHeader() {
  return (
    <header className="border-b border-[var(--border)] bg-[var(--surface)]/40 backdrop-blur-sm sticky top-0 z-40">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-2 font-mono text-[11px] tracking-[0.22em] uppercase text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
        >
          <span className="status-dot status-dot-ok live-pulse" />
          <span>TrustLens</span>
          <span className="text-[var(--muted-2)]">/</span>
          <span className="text-[var(--foreground)]">demo</span>
        </Link>

        {/* Right: toggles + CTA */}
        <div className="flex items-center gap-1">
          <div className="flex items-center border border-[var(--border-strong)]">
            <ThemeToggle />
            <span className="w-px h-5 bg-[var(--border-strong)]" />
            <LanguageToggle />
          </div>
          <Link
            href="/login"
            className="ml-3 font-mono text-[10px] tracking-[0.22em] uppercase text-black bg-[var(--accent)] hover:bg-[var(--accent-dim)] px-3 py-1.5 transition-colors hidden sm:inline-flex items-center gap-1.5"
          >
            <span>Giriş_Yap</span>
            <span className="font-sans">→</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
