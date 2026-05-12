"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { AnimatePresence, motion } from "framer-motion";

import { loadProfile } from "@/lib/behavior-profile";
import { SignOutButton } from "./SignOutButton";

type NavItem = {
  href: string;
  label: string;
  code: string;
  soon?: boolean;
};

const NAV: readonly NavItem[] = [
  { href: "/dashboard", label: "Tarama", code: "01" },
  { href: "/history", label: "Geçmiş", code: "02" },
  { href: "/phishing", label: "Phishing", code: "03" },
  { href: "/settings", label: "Ayarlar", code: "04" },
] as const;

type Props = {
  user: User;
  children: React.ReactNode;
};

export function AppShell({ user, children }: Props) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [hasProfile, setHasProfile] = useState<boolean | null>(null);

  // Pathname değiştiğinde de yeniden oku — settings'te kaydedilince güncellensin
  useEffect(() => {
    setHasProfile(loadProfile() !== null);
  }, [pathname]);

  const initial = (user.email ?? "?").slice(0, 1).toUpperCase();
  const shortEmail =
    user.email && user.email.length > 22
      ? `${user.email.slice(0, 19)}…`
      : user.email ?? "—";

  const activeItem = NAV.find((n) => pathname?.startsWith(n.href)) ?? NAV[0];
  const breadcrumb = activeItem.label.toLowerCase();

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--foreground)]">
      <div className="grid lg:grid-cols-[240px_1fr] min-h-screen">
        {/* ─────────── Sidebar (desktop) ─────────── */}
        <aside className="hidden lg:flex flex-col border-r border-[var(--border)] bg-[var(--surface)]/30 sticky top-0 h-screen">
          {/* Logo */}
          <div className="px-5 h-14 flex items-center justify-between border-b border-[var(--border)]">
            <Link
              href="/dashboard"
              className="flex items-center gap-2 font-mono text-[11px] tracking-[0.22em] uppercase text-[var(--foreground)]"
            >
              <span className="status-dot status-dot-ok live-pulse" />
              <span>TrustLens</span>
            </Link>
            <span className="font-mono text-[9px] tracking-[0.18em] uppercase text-[var(--muted-2)]">
              v0.1
            </span>
          </div>

          {/* Nav */}
          <nav className="flex-1 px-3 py-6 space-y-1">
            <div className="px-3 mb-3 font-mono text-[9px] tracking-[0.28em] uppercase text-[var(--muted-2)]">
              Menü
            </div>
            {NAV.map((item) => {
              const isActive = item.href === activeItem.href && !item.soon;
              const isDisabled = !!item.soon;

              const baseClasses =
                "group flex items-center gap-3 px-3 py-2 font-mono text-[11px] tracking-[0.18em] uppercase transition-colors border-l";
              const stateClasses = isActive
                ? "bg-[var(--accent)]/[0.07] text-[var(--accent)] border-[var(--accent)]"
                : isDisabled
                  ? "text-[var(--muted-2)] border-transparent cursor-not-allowed"
                  : "text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface)]/50 border-transparent";

              const showProfileDot =
                item.href === "/settings" && !isActive && hasProfile !== null;
              const content = (
                <>
                  <span className="text-[var(--muted-2)] tabular-nums w-6">
                    {item.code}
                  </span>
                  <span className="flex-1">{item.label}</span>
                  {isActive && <span className="status-dot status-dot-ok" />}
                  {showProfileDot && (
                    <span
                      className={`status-dot ${hasProfile ? "status-dot-ok" : "status-dot-warn"}`}
                      title={hasProfile ? "Profil kayıtlı" : "Profil eksik"}
                    />
                  )}
                  {isDisabled && (
                    <span className="text-[9px] tracking-[0.22em] text-[var(--muted-2)]/70">
                      yakında
                    </span>
                  )}
                </>
              );

              if (isDisabled) {
                return (
                  <div
                    key={item.href}
                    aria-disabled
                    className={`${baseClasses} ${stateClasses}`}
                  >
                    {content}
                  </div>
                );
              }

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`${baseClasses} ${stateClasses}`}
                >
                  {content}
                </Link>
              );
            })}
          </nav>

          {/* User card */}
          <div className="border-t border-[var(--border)] p-4 space-y-3">
            <div className="font-mono text-[9px] tracking-[0.28em] uppercase text-[var(--muted-2)] mb-2">
              Operatör
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 border border-[var(--accent)]/40 bg-[var(--accent)]/10 flex items-center justify-center font-mono text-[12px] text-[var(--accent)]">
                {initial}
              </div>
              <div className="min-w-0">
                <div className="font-mono text-[11px] text-[var(--foreground)] truncate">
                  {shortEmail}
                </div>
                <SignOutButton />
              </div>
            </div>
          </div>
        </aside>

        {/* ─────────── Mobile drawer overlay ─────────── */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <>
              {/* Backdrop */}
              <motion.div
                key="backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="lg:hidden fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
                onClick={() => setMobileMenuOpen(false)}
              />

              {/* Drawer */}
              <motion.aside
                key="drawer"
                initial={{ x: "-100%" }}
                animate={{ x: 0 }}
                exit={{ x: "-100%" }}
                transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                className="lg:hidden fixed inset-y-0 left-0 z-50 w-[280px] flex flex-col border-r border-[var(--border)] bg-[var(--surface)] shadow-2xl"
              >
                {/* Drawer header */}
                <div className="px-5 h-14 flex items-center justify-between border-b border-[var(--border)] shrink-0">
                  <Link
                    href="/dashboard"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-2 font-mono text-[11px] tracking-[0.22em] uppercase"
                  >
                    <span className="status-dot status-dot-ok live-pulse" />
                    <span>TrustLens</span>
                  </Link>
                  <button
                    type="button"
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-11 h-11 flex items-center justify-center text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
                    aria-label="Menüyü kapat"
                  >
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
                      <path d="M2 2L16 16M16 2L2 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                  </button>
                </div>

                {/* Drawer nav */}
                <nav className="flex-1 px-3 py-6 space-y-1 overflow-y-auto">
                  <div className="px-3 mb-3 font-mono text-[9px] tracking-[0.28em] uppercase text-[var(--muted-2)]">
                    Menü
                  </div>
                  {NAV.map((item) => {
                    const isActive = item.href === activeItem.href && !item.soon;
                    const isDisabled = !!item.soon;
                    const baseClasses =
                      "flex items-center gap-3 px-3 min-h-[44px] font-mono text-[11px] tracking-[0.18em] uppercase transition-colors border-l";
                    const stateClasses = isActive
                      ? "bg-[var(--accent)]/[0.07] text-[var(--accent)] border-[var(--accent)]"
                      : isDisabled
                        ? "text-[var(--muted-2)] border-transparent cursor-not-allowed"
                        : "text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface)]/50 border-transparent";

                    const content = (
                      <>
                        <span className="text-[var(--muted-2)] tabular-nums w-6">{item.code}</span>
                        <span className="flex-1">{item.label}</span>
                        {isActive && <span className="status-dot status-dot-ok" />}
                        {isDisabled && (
                          <span className="text-[9px] tracking-[0.22em] text-[var(--muted-2)]/70">yakında</span>
                        )}
                      </>
                    );

                    if (isDisabled) {
                      return (
                        <div key={item.href} aria-disabled className={`${baseClasses} ${stateClasses}`}>
                          {content}
                        </div>
                      );
                    }
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className={`${baseClasses} ${stateClasses}`}
                      >
                        {content}
                      </Link>
                    );
                  })}
                </nav>

                {/* Drawer user card */}
                <div className="border-t border-[var(--border)] p-4 shrink-0">
                  <div className="font-mono text-[9px] tracking-[0.28em] uppercase text-[var(--muted-2)] mb-3">
                    Operatör
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 border border-[var(--accent)]/40 bg-[var(--accent)]/10 flex items-center justify-center font-mono text-[12px] text-[var(--accent)] shrink-0">
                      {initial}
                    </div>
                    <div className="min-w-0">
                      <div className="font-mono text-[11px] text-[var(--foreground)] truncate">{shortEmail}</div>
                      <SignOutButton />
                    </div>
                  </div>
                </div>
              </motion.aside>
            </>
          )}
        </AnimatePresence>

        {/* ─────────── Main column ─────────── */}
        <div className="flex flex-col min-w-0">
          {/* Topbar */}
          <header className="border-b border-[var(--border)] bg-[var(--surface)]/40 backdrop-blur-sm sticky top-0 z-40">
            <div className="px-4 sm:px-6 h-14 flex items-center justify-between gap-3">
              {/* Mobile hamburger */}
              <button
                type="button"
                onClick={() => setMobileMenuOpen(true)}
                className="lg:hidden w-11 h-11 flex items-center justify-center text-[var(--muted)] hover:text-[var(--foreground)] transition-colors shrink-0 -ml-2"
                aria-label="Menüyü aç"
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
                  <path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </button>

              {/* Mobile logo */}
              <Link
                href="/dashboard"
                className="lg:hidden flex items-center gap-2 font-mono text-[11px] tracking-[0.22em] uppercase"
              >
                <span className="status-dot status-dot-ok live-pulse" />
                TrustLens
              </Link>

              {/* Breadcrumb (desktop) */}
              <div className="hidden lg:flex items-center gap-2 font-mono text-[10px] tracking-[0.22em] uppercase text-[var(--muted)]">
                <span>console</span>
                <span className="text-[var(--muted-2)]">/</span>
                <span className="text-[var(--foreground)]">{breadcrumb}</span>
              </div>

              {/* Right diagnostics */}
              <div className="flex items-center gap-4 sm:gap-5 font-mono text-[10px] tracking-[0.18em] uppercase text-[var(--muted)] ml-auto">
                <span className="hidden md:flex items-center gap-2">
                  <span className="status-dot status-dot-ok" />
                  api · operational
                </span>
                <a
                  href="https://github.com/MAliTopkara/BTK-2026"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-[var(--accent)] transition-colors"
                >
                  github_↗
                </a>
              </div>
            </div>
          </header>

          {/* Main content */}
          <main className="flex-1 p-4 sm:p-6 lg:p-10">{children}</main>
        </div>
      </div>
    </div>
  );
}
