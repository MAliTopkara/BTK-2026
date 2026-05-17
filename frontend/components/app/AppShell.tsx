"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import type { User } from "@supabase/supabase-js";
import { AnimatePresence, motion } from "framer-motion";

import { useI18n } from "@/lib/i18n-context";
import { SignOutButton } from "./SignOutButton";
import { LanguageToggle } from "@/components/ui/LanguageToggle";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

import type { TranslationKey } from "@/lib/i18n";

type NavItem = {
  href: string;
  labelKey: TranslationKey;
  code: string;
  soon?: boolean;
};

const NAV: readonly NavItem[] = [
  { href: "/dashboard", labelKey: "nav.scan", code: "01" },
  { href: "/history", labelKey: "nav.history", code: "02" },
  { href: "/compare", labelKey: "nav.compare", code: "03" },
  { href: "/phishing", labelKey: "nav.phishing", code: "04" },
  { href: "/settings", labelKey: "nav.settings", code: "05" },
] as const;

type Props = {
  user: User;
  children: React.ReactNode;
};

export function AppShell({ user, children }: Props) {
  const pathname = usePathname();
  const { t } = useI18n();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const initial = (user.email ?? "?").slice(0, 1).toUpperCase();
  const shortEmail =
    user.email && user.email.length > 22
      ? `${user.email.slice(0, 19)}…`
      : user.email ?? "—";

  const activeItem = NAV.find((n) => pathname?.startsWith(n.href)) ?? NAV[0];
  const breadcrumb = t(activeItem.labelKey).toLowerCase();

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
              {t("nav.menu")}
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

              const content = (
                <>
                  <span className="text-[var(--muted-2)] tabular-nums w-6">
                    {item.code}
                  </span>
                  <span className="flex-1">{t(item.labelKey)}</span>
                  {isActive && <span className="status-dot status-dot-ok" />}
                  {isDisabled && (
                    <span className="text-[9px] tracking-[0.22em] text-[var(--muted-2)]/70">
                      {t("nav.soon")}
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

          {/* Theme + Language toggle */}
          <div className="border-t border-[var(--border)] px-1 py-2 space-y-0.5">
            <ThemeToggle />
            <LanguageToggle />
          </div>

          {/* User card */}
          <div className="border-t border-[var(--border)] p-4 space-y-3">
            <div className="font-mono text-[9px] tracking-[0.28em] uppercase text-[var(--muted-2)] mb-2">
              {t("nav.operator")}
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
                    aria-label={t("nav.menu_close")}
                  >
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
                      <path d="M2 2L16 16M16 2L2 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                  </button>
                </div>

                {/* Drawer nav */}
                <nav className="flex-1 px-3 py-6 space-y-1 overflow-y-auto">
                  <div className="px-3 mb-3 font-mono text-[9px] tracking-[0.28em] uppercase text-[var(--muted-2)]">
                    {t("nav.menu")}
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
                        <span className="flex-1">{t(item.labelKey)}</span>
                        {isActive && <span className="status-dot status-dot-ok" />}
                        {isDisabled && (
                          <span className="text-[9px] tracking-[0.22em] text-[var(--muted-2)]/70">{t("nav.soon")}</span>
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

                {/* Drawer theme + language toggle */}
                <div className="border-t border-[var(--border)] px-1 py-2 shrink-0 space-y-0.5">
                  <ThemeToggle />
                  <LanguageToggle />
                </div>

                {/* Drawer user card */}
                <div className="border-t border-[var(--border)] p-4 shrink-0">
                  <div className="font-mono text-[9px] tracking-[0.28em] uppercase text-[var(--muted-2)] mb-3">
                    {t("nav.operator")}
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
                aria-label={t("nav.menu_open")}
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
                  {t("topbar.api_status")}
                </span>
                <a
                  href="https://github.com/MAliTopkara/BTK-2026"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-[var(--accent)] transition-colors"
                >
                  {t("topbar.github")}
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
