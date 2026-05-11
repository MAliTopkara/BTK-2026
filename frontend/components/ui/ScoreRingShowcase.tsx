"use client";

import { useState } from "react";

import { ScoreRing, type ScoreRingSize, type Verdict } from "./ScoreRing";

const VERDICT_SAMPLES: { verdict: Verdict; score: number; label: string }[] = [
  { verdict: "AVOID", score: 34, label: "ALMA — sahte indirim + bot yorum" },
  { verdict: "CAUTION", score: 58, label: "DİKKATLİ — yeni satıcı, hafif pump" },
  { verdict: "BUY", score: 87, label: "AL — gerçek indirim, doğrulanmış" },
];

const SIZES: { size: ScoreRingSize; label: string; px: number; usage: string }[] = [
  { size: "sm", label: "SM", px: 64, usage: "Liste satırı, history kartı" },
  { size: "md", label: "MD", px: 96, usage: "Compact card, demo chip" },
  { size: "lg", label: "LG", px: 160, usage: "Inline result, dashboard preview" },
  { size: "xl", label: "XL", px: 240, usage: "Scan detail — verdict moment" },
];

export function ScoreRingShowcase() {
  const [seed, setSeed] = useState(0);

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--foreground)]">
      {/* Top diagnostic bar */}
      <div className="border-b border-[var(--border)] bg-[var(--surface)]/40 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-[1400px] mx-auto px-6 h-10 flex items-center justify-between font-mono text-[10px] tracking-[0.18em] uppercase">
          <div className="flex items-center gap-6 text-[var(--muted)]">
            <span className="flex items-center gap-2 text-[var(--foreground)]">
              <span className="status-dot status-dot-warn live-pulse" />
              dev / score-ring
            </span>
            <span className="hidden sm:inline text-[var(--muted-2)]">
              v0.1.0 · QA preview
            </span>
          </div>

          <button
            onClick={() => setSeed((s) => s + 1)}
            className="font-mono text-[10px] tracking-[0.22em] uppercase text-[var(--accent)] hover:text-[var(--foreground)] transition-colors"
          >
            replay_animation ↻
          </button>
        </div>
      </div>

      <main className="max-w-[1400px] mx-auto px-6 py-12 lg:py-16 space-y-20">
        {/* Hero */}
        <header className="space-y-4">
          <div className="font-mono text-[10px] tracking-[0.32em] uppercase text-[var(--muted)] flex items-center gap-3">
            <span className="h-px w-8 bg-[var(--accent)]" />
            <span>component · ScoreRing</span>
          </div>
          <h1 className="font-serif text-[clamp(2.4rem,5vw,4rem)] leading-[0.95] tracking-[-0.02em]">
            Verdict, <span className="italic text-[var(--accent)]">tek bir</span>{" "}
            okumada.
          </h1>
          <p className="max-w-2xl text-[14px] leading-relaxed text-[var(--muted)]">
            Triple-arc precision instrument. Spring-animated counter, verdict-tier
            renk, tick mark kalibrasyon ölçeği, XL boyutta orbital dekorasyon ve
            glow halo. Framer Motion v12 · SVG · TypeScript.
          </p>
        </header>

        {/* SIZE × VERDICT MATRIX */}
        <section className="space-y-12" key={seed}>
          {SIZES.map(({ size, label, px, usage }) => (
            <div key={size}>
              <div className="flex items-baseline justify-between mb-8 pb-4 border-b border-[var(--border)]">
                <div className="flex items-baseline gap-5">
                  <h2 className="font-serif italic text-[2.4rem] leading-none text-[var(--foreground)]">
                    {label}
                  </h2>
                  <span className="font-mono text-[11px] tracking-[0.22em] uppercase text-[var(--muted-2)]">
                    {px}px
                  </span>
                </div>
                <span className="font-mono text-[10px] tracking-[0.22em] uppercase text-[var(--muted)] max-w-xs text-right">
                  {usage}
                </span>
              </div>

              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {VERDICT_SAMPLES.map((sample, i) => (
                  <div
                    key={sample.verdict}
                    className="corner-frame relative bg-[var(--surface)]/30 border border-[var(--border)] p-8 flex flex-col items-center justify-center min-h-[280px]"
                  >
                    <span className="c-tr" />
                    <span className="c-bl" />

                    <ScoreRing
                      score={sample.score}
                      verdict={sample.verdict}
                      size={size}
                      showPill
                      delay={i * 150}
                    />

                    <div className="mt-6 text-center max-w-[200px]">
                      <div className="font-mono text-[10px] tracking-[0.22em] uppercase text-[var(--muted-2)]">
                        score · {sample.score}
                      </div>
                      <div className="font-sans text-[11px] text-[var(--muted)] mt-1 leading-relaxed">
                        {sample.label}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </section>

        {/* THINKING MODE */}
        <section>
          <div className="flex items-baseline justify-between mb-8 pb-4 border-b border-[var(--border)]">
            <div className="flex items-baseline gap-5">
              <h2 className="font-serif italic text-[2.4rem] leading-none text-[var(--foreground)]">
                Thinking
              </h2>
              <span className="font-mono text-[11px] tracking-[0.22em] uppercase text-[var(--muted-2)]">
                pending state
              </span>
            </div>
            <span className="font-mono text-[10px] tracking-[0.22em] uppercase text-[var(--muted)] max-w-xs text-right">
              Scan başladığında, henüz skor yokken
            </span>
          </div>

          <div className="corner-frame relative bg-[var(--surface)]/30 border border-[var(--border)] p-12 flex flex-wrap items-end justify-center gap-12">
            <span className="c-tr" />
            <span className="c-bl" />
            {SIZES.map(({ size }) => (
              <div key={size} className="flex flex-col items-center gap-3">
                <ScoreRing
                  score={0}
                  verdict="BUY"
                  size={size}
                  thinking
                />
                <span className="font-mono text-[10px] tracking-[0.22em] uppercase text-[var(--muted-2)]">
                  {size}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* Color/contrast reference */}
        <section className="border-t border-[var(--border)] pt-12">
          <div className="font-mono text-[10px] tracking-[0.28em] uppercase text-[var(--muted-2)] mb-6">
            Token reference
          </div>
          <div className="grid sm:grid-cols-3 gap-3 font-mono text-[11px]">
            {[
              { v: "BUY · AL", color: "var(--accent)", hex: "#00ff88", note: "skor ≥ 70" },
              { v: "CAUTION · DİKKATLİ", color: "var(--yellow)", hex: "#ffcc33", note: "skor 40-69" },
              { v: "AVOID · ALMA", color: "var(--red)", hex: "#ff4d4d", note: "skor < 40" },
            ].map((t) => (
              <div
                key={t.v}
                className="border border-[var(--border-strong)] p-4 bg-[var(--surface)]/40"
              >
                <div
                  className="h-8 mb-3"
                  style={{ background: t.color }}
                />
                <div className="text-[var(--foreground)] mb-1">{t.v}</div>
                <div className="text-[var(--muted-2)] text-[10px] tracking-[0.18em] uppercase flex items-center justify-between">
                  <span>{t.hex}</span>
                  <span>{t.note}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
