"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";

import type { ScanResult, Verdict } from "@/lib/api";

const VERDICT_TR: Record<Verdict, string> = {
  BUY: "AL",
  CAUTION: "DİKKATLİ OL",
  AVOID: "ALMA",
};

const VERDICT_EMOJI: Record<Verdict, string> = {
  BUY: "✓",
  CAUTION: "◆",
  AVOID: "✕",
};

const STATUS_GLYPH: Record<string, string> = {
  RISK: "▲",
  WARN: "◆",
  OK: "●",
  INFO: "◌",
};

// URL anahtar kelimesi → demo scenario eşleşmesi (paylaşılabilir public link)
const URL_TO_DEMO: { keyword: string; scenario: string }[] = [
  { keyword: "airpods", scenario: "airpods_fake" },
  { keyword: "apple", scenario: "airpods_fake" },
  { keyword: "casio", scenario: "watch_genuine" },
  { keyword: "g-shock", scenario: "watch_genuine" },
  { keyword: "xiaomi", scenario: "laptop_suspicious" },
  { keyword: "redmi", scenario: "laptop_suspicious" },
  { keyword: "laptop", scenario: "laptop_suspicious" },
  { keyword: "phishing", scenario: "phishing_sms" },
  { keyword: "sms", scenario: "phishing_sms" },
];

type Props = {
  scan: ScanResult;
  open: boolean;
  onClose: () => void;
};

export function ShareSheet({ scan, open, onClose }: Props) {
  const [copied, setCopied] = useState<"text" | "link" | null>(null);
  const [shareSupported, setShareSupported] = useState(false);

  useEffect(() => {
    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      setShareSupported(true);
    }
  }, []);

  // Auto-clear copied feedback
  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(null), 2000);
    return () => clearTimeout(t);
  }, [copied]);

  // Esc ile kapat
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const matchedDemo = matchToDemo(scan.url);
  const publicLink =
    typeof window !== "undefined" && matchedDemo
      ? `${window.location.origin}/demo/${matchedDemo}`
      : null;
  const fallbackLink =
    typeof window !== "undefined"
      ? `${window.location.origin}/dashboard`
      : "trustlens.ai/dashboard";

  const summary = buildSummary(scan, publicLink ?? fallbackLink);

  async function handleNativeShare() {
    try {
      await navigator.share({
        title: "TrustLens AI tarama sonucu",
        text: summary,
        url: publicLink ?? undefined,
      });
      onClose();
    } catch {
      // user cancelled or unsupported — sessizce geç
    }
  }

  async function copyText(text: string, kind: "text" | "link") {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(kind);
    } catch {
      // ignore
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
            onClick={onClose}
            aria-hidden
          />

          {/* Sheet */}
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Paylaş"
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-x-4 bottom-4 lg:inset-auto lg:left-1/2 lg:top-1/2 lg:-translate-x-1/2 lg:-translate-y-1/2 lg:max-w-2xl lg:w-full z-50"
          >
            <div className="corner-frame relative bg-[var(--surface)] border border-[var(--accent)]/40 font-mono">
              <span className="c-tr" />
              <span className="c-bl" />

              {/* Header */}
              <div className="flex items-center justify-between px-4 h-9 border-b border-[var(--accent)]/30 bg-black/40">
                <div className="flex items-center gap-2.5 text-[10px] tracking-[0.22em] uppercase text-[var(--muted)]">
                  <span className="status-dot status-dot-ok live-pulse" />
                  <span className="text-[var(--foreground)]">PAYLAŞ_RAPORU</span>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="text-[var(--muted)] hover:text-[var(--foreground)] text-[10px] tracking-[0.22em] uppercase transition-colors"
                  aria-label="Kapat (Esc)"
                >
                  esc · kapat ×
                </button>
              </div>

              {/* Body */}
              <div className="p-5 lg:p-6 space-y-5 max-h-[80vh] overflow-y-auto">
                {/* Public link section */}
                {publicLink ? (
                  <div className="space-y-2">
                    <div className="font-mono text-[9px] tracking-[0.22em] uppercase text-[var(--muted-2)]">
                      Public link · /demo/{matchedDemo}
                    </div>
                    <div className="flex items-stretch gap-2">
                      <code className="flex-1 px-3 py-2.5 bg-black/40 border border-[var(--border-strong)] text-[12px] text-[var(--accent)] truncate">
                        {publicLink}
                      </code>
                      <button
                        type="button"
                        onClick={() => copyText(publicLink, "link")}
                        className="px-4 py-2.5 bg-[var(--accent)] hover:opacity-90 text-black text-[10px] tracking-[0.22em] uppercase transition-opacity shrink-0"
                      >
                        {copied === "link" ? "kopyalandı ✓" : "linki_kopyala"}
                      </button>
                    </div>
                    <p className="text-[10px] text-[var(--muted-2)] tracking-[0.18em] uppercase">
                      OG kart önizleme
                      <span className="normal-case tracking-normal text-[11px] font-sans text-[var(--muted)] ml-2">
                        Twitter / WhatsApp / LinkedIn paylaşımında otomatik kart oluşur.
                      </span>
                    </p>
                  </div>
                ) : (
                  <div className="border border-dashed border-[var(--border-strong)] bg-black/20 p-4 text-[12px] text-[var(--muted)] leading-relaxed">
                    <span className="font-mono text-[10px] tracking-[0.22em] uppercase text-[var(--yellow)]">
                      özel tarama
                    </span>
                    <p className="mt-1 font-sans">
                      Kişisel taramalar yalnızca tarayıcında saklanır — başkasıyla
                      paylaşmak için aşağıdaki metni kopyala.
                    </p>
                  </div>
                )}

                {/* Summary text preview */}
                <div className="space-y-2">
                  <div className="font-mono text-[9px] tracking-[0.22em] uppercase text-[var(--muted-2)]">
                    Paylaşım metni
                  </div>
                  <pre
                    className="whitespace-pre-wrap font-mono text-[12px] text-[var(--foreground)]/85 bg-black/40 border border-[var(--border-strong)] p-4 leading-relaxed"
                    style={{ fontFamily: "var(--font-mono), monospace" }}
                  >
                    {summary}
                  </pre>

                  <button
                    type="button"
                    onClick={() => copyText(summary, "text")}
                    className="w-full px-4 py-3 border border-[var(--border-strong)] hover:border-[var(--foreground)] text-[10px] tracking-[0.22em] uppercase text-[var(--foreground)] transition-colors flex items-center justify-between"
                  >
                    <span className="flex items-center gap-2">
                      <span className="text-[var(--accent)]">{">"}</span>
                      <span>{copied === "text" ? "metin kopyalandı ✓" : "metni_kopyala"}</span>
                    </span>
                    <span className="text-[var(--muted-2)] text-[9px]">
                      {summary.length} karakter
                    </span>
                  </button>
                </div>

                {/* Native share */}
                {shareSupported && (
                  <button
                    type="button"
                    onClick={handleNativeShare}
                    className="w-full bg-[var(--accent)] hover:bg-[var(--accent-dim)] text-black px-5 py-3.5 font-mono text-[11px] tracking-[0.24em] uppercase transition-colors flex items-center justify-between"
                  >
                    <span className="flex items-center gap-3">
                      <span className="text-black/70">{">"}</span>
                      <span>Cihazla_paylaş</span>
                    </span>
                    <span className="font-sans">↗</span>
                  </button>
                )}
              </div>

              {/* Diagnostic footer */}
              <div className="border-t border-[var(--accent)]/30 bg-black/40 px-4 py-2.5 flex items-center justify-between font-mono text-[9px] tracking-[0.22em] uppercase text-[var(--muted-2)]">
                <span>scan_id · {scan.scan_id.slice(0, 8)}</span>
                <span>{scan.verdict} · {scan.overall_score}/100</span>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// helpers
// ─────────────────────────────────────────────────────────────────────────

function matchToDemo(url: string): string | null {
  const lower = url.toLowerCase();
  for (const m of URL_TO_DEMO) {
    if (lower.includes(m.keyword)) return m.scenario;
  }
  return null;
}

function buildSummary(scan: ScanResult, link: string): string {
  const verdict = scan.verdict as Verdict;
  const tr = VERDICT_TR[verdict];
  const emoji = VERDICT_EMOJI[verdict];

  const title = (scan.product?.title ?? "Bilinmeyen ürün").slice(0, 80);
  const platform = (scan.product?.platform ?? "").toUpperCase();

  // En önemli 3 bulgu (RISK önce)
  const findings = Object.values(scan.layer_results)
    .filter((l) => l && l.status !== "INFO" && l.status !== "OK")
    .sort((a, b) => statusPriority(a.status) - statusPriority(b.status))
    .slice(0, 3)
    .map((l) => {
      const glyph = STATUS_GLYPH[l.status] ?? "·";
      return `${glyph} ${l.name}: ${truncate(l.finding, 90)}`;
    });

  const lines: string[] = [
    `🔍 TrustLens AI · Tarama Sonucu`,
    ``,
    `${title}`,
    `${platform}`,
    ``,
    `${emoji} ${tr} · ${scan.overall_score}/100`,
    ``,
  ];

  if (findings.length > 0) {
    lines.push(`Bulgular:`);
    for (const f of findings) lines.push(f);
    lines.push(``);
  }

  lines.push(`Kendin de tara: ${link}`);

  return lines.join("\n");
}

function statusPriority(s: string): number {
  return s === "RISK" ? 0 : s === "WARN" ? 1 : 2;
}

function truncate(s: string, max: number): string {
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}
