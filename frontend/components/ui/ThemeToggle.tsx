"use client";

import { useEffect, useState } from "react";
import { type Theme, getActiveTheme, toggleTheme, initTheme } from "@/lib/theme";

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("dark");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setTheme(initTheme());
    setMounted(true);
  }, []);

  if (!mounted) return null;

  function handleToggle() {
    const next = toggleTheme();
    setTheme(next);
  }

  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={handleToggle}
      className="group flex items-center gap-2.5 w-full px-3 py-2 font-mono text-[10px] tracking-[0.22em] uppercase transition-colors text-[var(--muted)] hover:text-[var(--foreground)]"
      aria-label={isDark ? "Açık temaya geç" : "Koyu temaya geç"}
    >
      <span className="relative w-4 h-4 flex items-center justify-center shrink-0">
        {/* Sun icon */}
        <svg
          width="14"
          height="14"
          viewBox="0 0 14 14"
          fill="none"
          className={`absolute inset-0 m-auto transition-all duration-200 ${
            isDark ? "opacity-0 rotate-[-90deg] scale-50" : "opacity-100 rotate-0 scale-100"
          }`}
        >
          <circle cx="7" cy="7" r="2.5" stroke="currentColor" strokeWidth="1.2" />
          <path
            d="M7 1v1.5M7 11.5V13M1 7h1.5M11.5 7H13M2.76 2.76l1.06 1.06M10.18 10.18l1.06 1.06M11.24 2.76l-1.06 1.06M3.82 10.18l-1.06 1.06"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinecap="round"
          />
        </svg>
        {/* Moon icon */}
        <svg
          width="14"
          height="14"
          viewBox="0 0 14 14"
          fill="none"
          className={`absolute inset-0 m-auto transition-all duration-200 ${
            isDark ? "opacity-100 rotate-0 scale-100" : "opacity-0 rotate-90 scale-50"
          }`}
        >
          <path
            d="M12 8.5A5.5 5.5 0 015.5 2c0-.28.02-.56.06-.83A6 6 0 1012.83 8.94c-.27.04-.55.06-.83.06z"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      <span className="flex-1 text-left">
        {isDark ? "light_mode" : "dark_mode"}
      </span>
      <span className="text-[var(--muted-2)] text-[9px]">
        {isDark ? "☀" : "☾"}
      </span>
    </button>
  );
}
