"use client";

import { useI18n } from "@/lib/i18n-context";

export function LanguageToggle() {
  const { locale, setLocale, t } = useI18n();

  function handleToggle() {
    setLocale(locale === "tr" ? "en" : "tr");
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      className="group flex items-center gap-2.5 w-full px-3 py-2 font-mono text-[10px] tracking-[0.22em] uppercase transition-colors text-[var(--muted)] hover:text-[var(--foreground)]"
      aria-label={locale === "tr" ? "Switch to English" : "Türkçe'ye geç"}
    >
      <span className="relative w-4 h-4 flex items-center justify-center shrink-0 font-mono text-[10px] leading-none text-[var(--muted-2)]">
        {locale === "tr" ? "TR" : "EN"}
      </span>
      <span className="flex-1 text-left">
        {locale === "tr" ? "english" : "türkçe"}
      </span>
      <span className="text-[var(--muted-2)] text-[9px]">
        {locale === "tr" ? "EN" : "TR"}
      </span>
    </button>
  );
}
