"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";

import type { LayerResult, LayerStatus } from "@/lib/api";

// ───────────────────────────────────────────────────────────────────────────
// Layer metadata (kod, method, EN ad) — backend'de yok, frontend'de map
// ───────────────────────────────────────────────────────────────────────────

export const LAYER_META: Record<
  string,
  { code: string; method: string; nameEn: string }
> = {
  review: {
    code: "01",
    method: "TF-IDF + BURST + GEMINI",
    nameEn: "Review Authenticity",
  },
  discount: {
    code: "02",
    method: "AKAKÇE 90D + PUMP DETECTION",
    nameEn: "Discount Verification",
  },
  manipulation: {
    code: "03",
    method: "URGENCY SIGNALS + GEMINI",
    nameEn: "Dark Pattern Detection",
  },
  seller: {
    code: "04",
    method: "RULE-BASED SCORING",
    nameEn: "Seller Reputation",
  },
  visual: {
    code: "05",
    method: "GEMINI VISION + PHASH",
    nameEn: "Visual Verification",
  },
  crossplatform: {
    code: "06",
    method: "MULTI-MERCHANT QUERY",
    nameEn: "Cross-Platform Search",
  },
  phishing: {
    code: "07",
    method: "OCR + USOM + PHISHTANK",
    nameEn: "Phishing Scanner",
  },
};

// ───────────────────────────────────────────────────────────────────────────
// Status visual tokens
// ───────────────────────────────────────────────────────────────────────────

type StatusToken = {
  label: string;
  text: string;
  border: string;
  bgTint: string;
  accentBar: string;
  dot: string;
  glow: string;
};

const STATUS_TOKENS: Record<LayerStatus, StatusToken> = {
  RISK: {
    label: "RISK",
    text: "text-[var(--red)]",
    border: "border-[var(--red)]/35",
    bgTint: "bg-[var(--red)]/[0.04]",
    accentBar: "bg-[var(--red)]",
    dot: "status-dot-risk",
    glow: "shadow-[inset_3px_0_0_var(--red)]",
  },
  WARN: {
    label: "WARN",
    text: "text-[var(--yellow)]",
    border: "border-[var(--yellow)]/35",
    bgTint: "bg-[var(--yellow)]/[0.03]",
    accentBar: "bg-[var(--yellow)]",
    dot: "status-dot-warn",
    glow: "shadow-[inset_3px_0_0_var(--yellow)]",
  },
  OK: {
    label: "OK",
    text: "text-[var(--accent)]",
    border: "border-[var(--accent)]/30",
    bgTint: "bg-[var(--accent)]/[0.03]",
    accentBar: "bg-[var(--accent)]",
    dot: "status-dot-ok",
    glow: "shadow-[inset_3px_0_0_var(--accent)]",
  },
  INFO: {
    label: "INFO",
    text: "text-[var(--muted)]",
    border: "border-[var(--border-strong)]",
    bgTint: "bg-[var(--surface)]/30",
    accentBar: "bg-[var(--muted-2)]",
    dot: "status-dot-info",
    glow: "shadow-[inset_3px_0_0_var(--muted-2)]",
  },
};

// ───────────────────────────────────────────────────────────────────────────
// Component
// ───────────────────────────────────────────────────────────────────────────

type Variant = "compact" | "default" | "expanded";

type Props = {
  result: LayerResult;
  variant?: Variant;
  delay?: number;
};

export function LayerCard({ result, variant = "default", delay = 0 }: Props) {
  const meta = LAYER_META[result.layer_id] ?? {
    code: "??",
    method: "UNKNOWN",
    nameEn: result.name,
  };
  const tone = STATUS_TOKENS[result.status];
  const detailEntries = Object.entries(result.details ?? {});
  const [expanded, setExpanded] = useState(variant === "expanded");

  // ─────────── Compact variant ───────────
  if (variant === "compact") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: delay / 1000 }}
        className={`relative flex items-center gap-3 px-4 py-2.5 border ${tone.border} ${tone.bgTint} font-mono text-[12px] ${tone.glow}`}
      >
        <span className="text-[var(--muted-2)] tabular-nums w-7 shrink-0">
          {meta.code}
        </span>
        <span className={`${tone.text} text-[10px] tracking-[0.22em] uppercase w-14 shrink-0 inline-flex items-center gap-1.5`}>
          <span className={`status-dot ${tone.dot}`} />
          {tone.label}
        </span>
        <span className="font-serif italic text-[15px] text-[var(--foreground)] flex-1 truncate not-italic-on-mobile">
          {result.name}
        </span>
        <span className={`tabular-nums text-[13px] ${tone.text} shrink-0`}>
          {result.score ?? "—"}
          <span className="text-[var(--muted-2)] text-[10px] ml-0.5">/100</span>
        </span>
      </motion.div>
    );
  }

  // ─────────── Default / Expanded ───────────
  return (
    <motion.article
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: delay / 1000, ease: [0.22, 1, 0.36, 1] }}
      className={`group relative border ${tone.border} ${tone.bgTint} ${tone.glow} font-mono`}
    >
      {/* Top diagnostic strip */}
      <div className="flex items-center justify-between px-4 h-8 border-b border-[var(--border)] bg-black/30">
        <div className="flex items-center gap-3 text-[10px] tracking-[0.22em] uppercase text-[var(--muted)]">
          <span className="text-[var(--muted-2)] tabular-nums">
            KATMAN_{meta.code}
          </span>
          <span className="text-[var(--muted-2)]">·</span>
          <span className="text-[var(--accent-dim)] hidden sm:inline">
            {meta.method}
          </span>
        </div>

        <div className={`inline-flex items-center gap-1.5 text-[10px] tracking-[0.22em] uppercase ${tone.text}`}>
          <span className={`status-dot ${tone.dot}`} />
          {tone.label}
        </div>
      </div>

      {/* Body */}
      <div className="p-5">
        {/* Title row */}
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="min-w-0">
            <h3 className="font-serif italic text-[22px] leading-tight text-[var(--foreground)] mb-1">
              {result.name}
            </h3>
            <div className="font-mono text-[10px] tracking-[0.18em] uppercase text-[var(--muted-2)]">
              {meta.nameEn}
            </div>
          </div>

          <div className="text-right shrink-0">
            <div
              className={`font-serif italic tabular-nums leading-none text-[44px] ${tone.text}`}
            >
              {result.score ?? "—"}
            </div>
            <div className="font-mono text-[9px] tracking-[0.22em] uppercase text-[var(--muted-2)] mt-1">
              / 100
            </div>
          </div>
        </div>

        {/* Finding */}
        <p className="font-sans text-[13.5px] leading-relaxed text-[var(--foreground)]/85 mb-5 border-l-2 border-[var(--border-strong)] pl-3 group-hover:border-[var(--accent-dim)] transition-colors">
          {result.finding}
        </p>

        {/* Confidence */}
        <div className="flex items-center gap-3 mb-1">
          <span className="font-mono text-[9px] tracking-[0.22em] uppercase text-[var(--muted-2)] w-20 shrink-0">
            confidence
          </span>
          <div className="flex-1 h-1 bg-[var(--border-strong)] overflow-hidden relative">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${(result.confidence ?? 0) * 100}%` }}
              transition={{ duration: 0.7, delay: delay / 1000 + 0.2, ease: "easeOut" }}
              className={tone.accentBar.replace("bg-", "h-full bg-")}
            />
          </div>
          <span className="font-mono text-[10px] text-[var(--muted)] tabular-nums w-10 text-right">
            {Math.round((result.confidence ?? 0) * 100)}%
          </span>
        </div>

        {/* Detail toggle / panel */}
        {detailEntries.length > 0 && (
          <>
            <div className="border-t border-[var(--border)] mt-5 -mx-5" />

            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="w-full flex items-center justify-between -mx-5 px-5 py-3 mt-0 text-[10px] tracking-[0.22em] uppercase text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
              aria-expanded={expanded}
            >
              <span className="flex items-center gap-2">
                <span className="text-[var(--accent)]">
                  {expanded ? "▾" : "▸"}
                </span>
                <span>{expanded ? "detayları gizle" : "detayları göster"}</span>
              </span>
              <span className="text-[var(--muted-2)] tabular-nums">
                {detailEntries.length} field
              </span>
            </button>

            <AnimatePresence initial={false}>
              {expanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
                  className="overflow-hidden -mx-5 border-t border-[var(--border)]"
                >
                  <dl className="px-5 py-4 grid grid-cols-[140px_1fr] gap-x-4 gap-y-2 text-[11px]">
                    {detailEntries.map(([k, v]) => (
                      <DetailRow key={k} label={k} value={v} />
                    ))}
                  </dl>
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}
      </div>
    </motion.article>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// Detail row — typed value rendering
// ───────────────────────────────────────────────────────────────────────────

function DetailRow({ label, value }: { label: string; value: unknown }) {
  return (
    <>
      <dt className="font-mono text-[var(--muted-2)] tracking-[0.1em] uppercase truncate">
        {label}
      </dt>
      <dd className="font-mono text-[var(--foreground)]/85 break-words">
        {renderValue(value)}
      </dd>
    </>
  );
}

function renderValue(v: unknown): React.ReactNode {
  if (v === null || v === undefined) {
    return <span className="text-[var(--muted-2)]">null</span>;
  }
  if (typeof v === "boolean") {
    return (
      <span className={v ? "text-[var(--yellow)]" : "text-[var(--muted)]"}>
        {String(v)}
      </span>
    );
  }
  if (typeof v === "number") {
    return (
      <span className="text-[var(--foreground)] tabular-nums">
        {Number.isInteger(v) ? v.toLocaleString("tr-TR") : v.toFixed(2)}
      </span>
    );
  }
  if (typeof v === "string") {
    return (
      <span className="text-[var(--foreground)]">
        <span className="text-[var(--muted-2)]">&ldquo;</span>
        {v.length > 200 ? `${v.slice(0, 200)}…` : v}
        <span className="text-[var(--muted-2)]">&rdquo;</span>
      </span>
    );
  }
  if (Array.isArray(v)) {
    if (v.length === 0)
      return <span className="text-[var(--muted-2)]">[ ]</span>;
    if (v.length > 6) {
      return (
        <span className="text-[var(--muted)]">
          [{v.slice(0, 4).map(short).join(", ")}{" "}
          <span className="text-[var(--accent-dim)]">+{v.length - 4}</span>]
        </span>
      );
    }
    return (
      <span className="text-[var(--muted)]">
        [{v.map(short).join(", ")}]
      </span>
    );
  }
  if (typeof v === "object") {
    const keys = Object.keys(v as object);
    return (
      <span className="text-[var(--muted)]">
        {`{ `}
        {keys
          .slice(0, 3)
          .map((k) => `${k}: ${short((v as Record<string, unknown>)[k])}`)
          .join(", ")}
        {keys.length > 3 ? ` +${keys.length - 3}` : ""}
        {` }`}
      </span>
    );
  }
  return <span>{String(v)}</span>;
}

function short(v: unknown): string {
  if (v === null || v === undefined) return "null";
  if (typeof v === "string") return v.length > 24 ? `"${v.slice(0, 24)}…"` : `"${v}"`;
  if (typeof v === "number") return String(v);
  if (typeof v === "boolean") return String(v);
  if (Array.isArray(v)) return `[${v.length}]`;
  return "{…}";
}
