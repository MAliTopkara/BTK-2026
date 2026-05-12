"use client";

import { motion } from "framer-motion";
import { useState } from "react";

import type { ProductData } from "@/lib/api";
import {
  type EthicsDimension,
  type EthicsResult,
  type EthicsTier,
  computeEthicsScore,
} from "@/lib/ethics-score";

type Props = {
  product: ProductData;
};

const TIER_TOKENS: Record<
  EthicsTier,
  { color: string; dot: string; label: string }
> = {
  ethical: {
    color: "var(--olive)",
    dot: "status-dot-ok",
    label: "Etik",
  },
  acceptable: {
    color: "var(--yellow)",
    dot: "status-dot-warn",
    label: "Kabul Edilebilir",
  },
  questionable: {
    color: "var(--red)",
    dot: "status-dot-risk",
    label: "Sorgulanabilir",
  },
};

export function EthicsPanel({ product }: Props) {
  const result = computeEthicsScore(product);
  const tier = TIER_TOKENS[result.tier];
  const [expanded, setExpanded] = useState(false);

  return (
    <section className="relative">
      <header className="grid lg:grid-cols-12 gap-6 items-end mb-8">
        <div className="lg:col-span-7">
          <div className="font-mono text-[10px] tracking-[0.32em] uppercase text-[var(--muted)] mb-5 flex items-center gap-3">
            <span className="h-px w-8" style={{ background: "var(--olive)" }} />
            <span>03.B / Etik_Skor</span>
            <span
              className="ml-2 border px-1.5 py-0.5 text-[8px] tracking-[0.3em] uppercase"
              style={{
                borderColor: "var(--olive)",
                color: "var(--olive)",
              }}
            >
              beta
            </span>
          </div>
          <h2 className="font-serif text-[clamp(1.8rem,3.5vw,2.6rem)] leading-[1.05] tracking-[-0.015em]">
            Bu satıcı{" "}
            <span className="italic" style={{ color: "var(--olive)" }}>
              etik
            </span>{" "}
            mi?
          </h2>
        </div>
        <div className="lg:col-span-5">
          <p className="text-[13px] text-[var(--muted)] leading-relaxed max-w-md">
            Satıcı güvenilirliği, şeffaflık, tüketici hakları ve sürdürülebilirlik
            boyutlarında heuristic analiz. Backend bağımsız — istemci tarafında hesaplanır.
          </p>
        </div>
      </header>

      {/* Main panel */}
      <div className="corner-frame relative bg-[var(--surface)] border border-[var(--olive)]/40 font-mono">
        <span className="c-tr" style={{ borderColor: "var(--olive)" }} />
        <span className="c-bl" style={{ borderColor: "var(--olive)" }} />

        {/* Header strip */}
        <div className="flex items-center justify-between px-4 h-9 border-b border-[var(--olive)]/30 bg-black/40">
          <div className="flex items-center gap-2.5 text-[10px] tracking-[0.22em] uppercase text-[var(--muted)]">
            <span
              className="status-dot"
              style={{
                background: "var(--olive)",
                boxShadow: "0 0 8px rgba(168, 176, 64, 0.45)",
              }}
            />
            <span className="text-[var(--foreground)]">ETİK_RAPORU</span>
          </div>
          <span className="text-[10px] tracking-[0.18em] uppercase text-[var(--muted-2)]">
            heuristic · client
          </span>
        </div>

        {/* Score + tier */}
        <div className="p-6 lg:p-8">
          <div className="flex items-center gap-6 mb-6">
            <div className="flex items-baseline gap-2">
              <span
                className="font-serif italic text-[52px] leading-none tabular-nums"
                style={{ color: tier.color }}
              >
                {result.overall}
              </span>
              <span className="text-[14px] text-[var(--muted-2)]">/100</span>
            </div>

            <span
              className="inline-flex items-center gap-2 border px-3 py-1.5"
              style={{
                borderColor: tier.color,
                backgroundColor: "rgba(0, 0, 0, 0.4)",
              }}
            >
              <span className={`status-dot ${tier.dot}`} />
              <span
                className="text-[11px] tracking-[0.22em] uppercase"
                style={{ color: tier.color }}
              >
                {tier.label}
              </span>
            </span>
          </div>

          {/* Dimension bars */}
          <div className="space-y-4">
            {result.dimensions.map((dim) => (
              <DimensionRow key={dim.id} dim={dim} />
            ))}
          </div>

          {/* Expand toggle */}
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="mt-6 flex items-center gap-2 text-[10px] tracking-[0.22em] uppercase transition-colors hover:text-[var(--foreground)]"
            style={{ color: "var(--olive)" }}
          >
            <span>{expanded ? "▾" : "▸"}</span>
            <span>{expanded ? "detayları_gizle" : "detayları_göster"}</span>
          </button>

          {/* Expanded detail */}
          {expanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="mt-5 space-y-3 border-t border-[var(--olive)]/20 pt-5"
            >
              {result.dimensions.map((dim) => (
                <div key={dim.id} className="flex items-start gap-3">
                  <span
                    className="shrink-0 mt-1 w-1.5 h-1.5 rounded-full"
                    style={{ background: dimColor(dim.score) }}
                  />
                  <div>
                    <span className="text-[10px] tracking-[0.22em] uppercase text-[var(--muted-2)]">
                      {dim.label}
                    </span>
                    <p className="font-sans text-[12px] text-[var(--foreground)]/80 mt-0.5">
                      {dim.finding}
                    </p>
                  </div>
                </div>
              ))}
            </motion.div>
          )}
        </div>

        {/* Summary footer */}
        <div className="border-t border-[var(--olive)]/30 bg-black/30 px-4 py-3 font-sans text-[12px] text-[var(--foreground)]/80 leading-relaxed">
          <span className="font-mono text-[10px] tracking-[0.22em] uppercase text-[var(--muted-2)] mr-2">
            {">"}
          </span>
          {result.summary_tr}
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function DimensionRow({ dim }: { dim: EthicsDimension }) {
  const pct = Math.round((dim.score / dim.maxScore) * 100);
  const color = dimColor(dim.score);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[10px] tracking-[0.22em] uppercase text-[var(--muted)]">
          {dim.label}
        </span>
        <span
          className="text-[11px] tabular-nums tracking-[0.18em]"
          style={{ color }}
        >
          {dim.score}/{dim.maxScore}
        </span>
      </div>
      <div className="relative h-2 bg-[var(--border-strong)] overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.7, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          className="h-full"
          style={{ background: color }}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function dimColor(score: number): string {
  if (score >= 70) return "var(--olive)";
  if (score >= 40) return "var(--yellow)";
  return "var(--red)";
}
