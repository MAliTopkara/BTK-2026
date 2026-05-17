"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";

import type { ReasoningStep, Verdict } from "@/lib/api";

// ───────────────────────────────────────────────────────────────────────────
// Visual tokens
// ───────────────────────────────────────────────────────────────────────────

const VERDICT_META: Record<
  Verdict,
  { tr: string; color: string; dot: string }
> = {
  BUY: { tr: "AL", color: "var(--accent)", dot: "status-dot-ok" },
  CAUTION: { tr: "DİKKATLİ OL", color: "var(--yellow)", dot: "status-dot-warn" },
  AVOID: { tr: "ALMA", color: "var(--red)", dot: "status-dot-risk" },
};

const TYPE_SPEED = 22; // ms per char
const PAUSE_BETWEEN_STEPS = 400; // ms

// ───────────────────────────────────────────────────────────────────────────
// Component
// ───────────────────────────────────────────────────────────────────────────

type Variant = "static" | "live" | "thinking";

type Props = {
  steps: ReasoningStep[];
  finalExplanation: string;
  verdict?: Verdict;
  overallScore?: number;
  durationMs?: number;
  model?: string;
  variant?: Variant;
};

export function ReasoningPanel({
  steps,
  finalExplanation,
  verdict,
  overallScore,
  durationMs,
  model = "gemini-2.5-pro",
  variant = "static",
}: Props) {
  const isThinking = variant === "thinking";
  const isLive = variant === "live";
  // Static modda steps default kapalı; live modda animasyon için açık başlamalı.
  const [stepsOpen, setStepsOpen] = useState(variant !== "static");

  // Compute cumulative start times for each step (live variant)
  const stepStartTimes = steps.reduce<number[]>((acc, step, i) => {
    if (i === 0) return [0];
    const prevDuration =
      steps[i - 1].content.length * TYPE_SPEED + PAUSE_BETWEEN_STEPS;
    return [...acc, acc[i - 1] + prevDuration];
  }, []);

  const finalStartMs = isLive
    ? stepStartTimes[steps.length - 1] +
      (steps[steps.length - 1]?.content.length ?? 0) * TYPE_SPEED +
      600
    : 0;

  return (
    <article className="corner-frame relative border border-[var(--border-strong)] bg-[var(--surface)]/40 overflow-hidden">
      <span className="c-tr" />
      <span className="c-bl" />

      {/* Diagnostic top strip */}
      <div className="flex items-center justify-between px-5 h-9 border-b border-[var(--border-strong)] bg-black/40 font-mono text-[10px] tracking-[0.22em] uppercase">
        <div className="flex items-center gap-3 text-[var(--muted)]">
          <span
            className={`status-dot ${isThinking ? "status-dot-warn live-pulse" : "status-dot-ok"}`}
          />
          <span className="text-[var(--foreground)]">Karar_Motoru</span>
          <span className="text-[var(--muted-2)]">·</span>
          <span className="hidden sm:inline">{model}</span>
          {isThinking && (
            <>
              <span className="text-[var(--muted-2)]">·</span>
              <span className="text-[var(--yellow)]">thinking</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-3 text-[var(--muted-2)] tabular-nums">
          {durationMs !== undefined && (
            <span>{(durationMs / 1000).toFixed(1)}s</span>
          )}
          {steps.length > 0 && <span>· {steps.length} adım</span>}
        </div>
      </div>

      {/* Thinking placeholder (only during live thinking mode) */}
      {isThinking && (
        <>
          <header className="px-6 lg:px-10 pt-8 lg:pt-12 pb-4">
            <div className="font-mono text-[10px] tracking-[0.32em] uppercase text-[var(--muted)] mb-5 flex items-center gap-3">
              <span className="h-px w-8 bg-[var(--accent)]" />
              <span>akıl_yürütme</span>
            </div>
            <h2 className="font-serif text-[clamp(1.6rem,3vw,2.4rem)] leading-[1.05] tracking-[-0.01em] text-[var(--foreground)] max-w-2xl">
              Yedi katmanı{" "}
              <span className="italic text-[var(--muted)]">tartıyor</span>
              <span className="cursor" />
            </h2>
          </header>

          <ol className="px-6 lg:px-10 py-8 space-y-7 lg:space-y-9">
            <ThinkingPlaceholder count={5} />
          </ol>
        </>
      )}

      {/* Final explanation callout — ÖNCE bu görünür (özet) */}
      {!isThinking && (
        <FinalCallout
          text={finalExplanation}
          verdict={verdict}
          startAtMs={isLive ? finalStartMs : 0}
          isLive={isLive}
        />
      )}

      {/* Reasoning steps — düşünce zinciri toggle altında */}
      {!isThinking && steps.length > 0 && (
        <div className="border-t border-[var(--border-strong)]">
          <button
            type="button"
            onClick={() => setStepsOpen((v) => !v)}
            className="w-full flex items-center justify-between px-6 lg:px-10 py-4 font-mono text-[10px] tracking-[0.22em] uppercase text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
            aria-expanded={stepsOpen}
          >
            <span className="flex items-center gap-2">
              <span className="text-[var(--accent)]">
                {stepsOpen ? "▾" : "▸"}
              </span>
              <span>
                {stepsOpen ? "düşünce zincirini gizle" : "düşünce zincirini gör"}
              </span>
            </span>
            <span className="text-[var(--muted-2)] tabular-nums">
              {steps.length} adım
            </span>
          </button>

          <AnimatePresence initial={false}>
            {stepsOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
                className="overflow-hidden border-t border-[var(--border)]"
              >
                <ol className="px-6 lg:px-10 py-8 space-y-7 lg:space-y-9">
                  {steps.map((step, i) => (
                    <StepRow
                      key={step.step}
                      step={step}
                      index={i}
                      variant={variant}
                      startAtMs={stepStartTimes[i] ?? 0}
                    />
                  ))}
                </ol>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Footer */}
      {!isThinking && (
        <footer className="border-t border-[var(--border-strong)] bg-black/40 px-5 h-11 flex items-center justify-between font-mono text-[10px] tracking-[0.22em] uppercase">
          <div className="flex items-center gap-3 text-[var(--muted-2)]">
            <span>Final</span>
            {verdict && (
              <>
                <span>·</span>
                <span
                  className="inline-flex items-center gap-1.5"
                  style={{ color: VERDICT_META[verdict].color }}
                >
                  <span className={`status-dot ${VERDICT_META[verdict].dot}`} />
                  {VERDICT_META[verdict].tr}
                </span>
              </>
            )}
            {overallScore !== undefined && (
              <>
                <span>·</span>
                <span
                  className="tabular-nums"
                  style={{ color: verdict ? VERDICT_META[verdict].color : "var(--foreground)" }}
                >
                  {overallScore}/100
                </span>
              </>
            )}
          </div>
          <span className="text-[var(--muted-2)] hidden sm:inline">
            chain_of_thought · explainable
          </span>
        </footer>
      )}
    </article>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// Step row
// ───────────────────────────────────────────────────────────────────────────

function StepRow({
  step,
  index,
  variant,
  startAtMs,
}: {
  step: ReasoningStep;
  index: number;
  variant: Variant;
  startAtMs: number;
}) {
  const displayed = useTypewriter(
    step.content,
    TYPE_SPEED,
    variant === "live",
    startAtMs,
  );
  const isLive = variant === "live";
  const typing = isLive && displayed.length < step.content.length;
  const started = !isLive || displayed.length > 0;

  return (
    <motion.li
      initial={{ opacity: 0, y: 8 }}
      animate={
        variant === "live"
          ? { opacity: started ? 1 : 0.15, y: 0 }
          : { opacity: 1, y: 0 }
      }
      transition={{
        duration: 0.45,
        delay: variant === "static" ? 0.2 + index * 0.18 : startAtMs / 1000,
        ease: [0.22, 1, 0.36, 1],
      }}
      className="grid grid-cols-[44px_1fr] sm:grid-cols-[60px_1fr] gap-4 sm:gap-6 lg:gap-8 items-start"
    >
      {/* Step number in margin */}
      <span
        className={`font-serif italic tabular-nums text-[2rem] sm:text-[2.6rem] lg:text-[3rem] leading-none transition-colors ${
          typing
            ? "text-[var(--accent)]"
            : started
              ? "text-[var(--muted)]"
              : "text-[var(--muted-2)]/40"
        }`}
      >
        {String(step.step).padStart(2, "0")}
      </span>

      <div className="pt-1 lg:pt-2">
        <p className="font-sans text-[14px] sm:text-[15px] lg:text-[17px] leading-relaxed text-[var(--foreground)]/90">
          {isLive ? (
            <>
              {displayed}
              {typing && <span className="cursor" />}
            </>
          ) : (
            step.content
          )}
        </p>
      </div>
    </motion.li>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// Final callout — with massive quote marks
// ───────────────────────────────────────────────────────────────────────────

function FinalCallout({
  text,
  verdict,
  startAtMs,
  isLive,
}: {
  text: string;
  verdict?: Verdict;
  startAtMs: number;
  isLive: boolean;
}) {
  const displayed = useTypewriter(text, TYPE_SPEED, isLive, startAtMs);
  const typing = isLive && displayed.length < text.length;
  const color = verdict ? VERDICT_META[verdict].color : "var(--accent)";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.6,
        delay: isLive ? startAtMs / 1000 : 0.4,
        ease: [0.22, 1, 0.36, 1],
      }}
      className="relative px-4 sm:px-6 lg:px-10 py-8 sm:py-10 lg:py-14"
    >
      {/* Giant opening quote */}
      <span
        aria-hidden
        className="absolute top-0 left-6 lg:left-12 font-serif italic leading-none pointer-events-none select-none"
        style={{
          fontSize: "10rem",
          color,
          opacity: 0.18,
        }}
      >
        &ldquo;
      </span>

      {/* Giant closing quote */}
      <span
        aria-hidden
        className="absolute bottom-0 right-6 lg:right-12 font-serif italic leading-none pointer-events-none select-none"
        style={{
          fontSize: "10rem",
          color,
          opacity: 0.18,
          transform: "translateY(45%)",
        }}
      >
        &rdquo;
      </span>

      <blockquote className="relative max-w-3xl mx-auto text-center">
        <p className="font-serif text-[clamp(1.2rem,2.2vw,1.7rem)] leading-relaxed text-[var(--foreground)] italic">
          {isLive ? (
            <>
              {displayed}
              {typing && <span className="cursor" />}
            </>
          ) : (
            text
          )}
        </p>
      </blockquote>
    </motion.div>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// Thinking placeholder — shimmer bars
// ───────────────────────────────────────────────────────────────────────────

function ThinkingPlaceholder({ count }: { count: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <li
          key={i}
          className="grid grid-cols-[44px_1fr] sm:grid-cols-[60px_1fr] gap-4 sm:gap-6 lg:gap-8 items-start"
        >
          <span className="font-serif italic tabular-nums text-[2rem] sm:text-[2.6rem] lg:text-[3rem] leading-none text-[var(--muted-2)]/40">
            {String(i + 1).padStart(2, "0")}
          </span>
          <div className="pt-2 lg:pt-3 space-y-2">
            <motion.div
              animate={{ opacity: [0.2, 0.5, 0.2] }}
              transition={{
                duration: 1.6,
                repeat: Infinity,
                ease: "easeInOut",
                delay: i * 0.15,
              }}
              className="h-3 bg-[var(--border-strong)] w-full"
            />
            <motion.div
              animate={{ opacity: [0.2, 0.5, 0.2] }}
              transition={{
                duration: 1.6,
                repeat: Infinity,
                ease: "easeInOut",
                delay: i * 0.15 + 0.05,
              }}
              className="h-3 bg-[var(--border-strong)] w-[80%]"
            />
          </div>
        </li>
      ))}
    </>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// Hooks
// ───────────────────────────────────────────────────────────────────────────

function useTypewriter(
  text: string,
  speedMs: number,
  enabled: boolean,
  startDelayMs: number,
): string {
  const [displayed, setDisplayed] = useState(enabled ? "" : text);

  useEffect(() => {
    if (!enabled) {
      setDisplayed(text);
      return;
    }

    setDisplayed("");
    let cancelled = false;

    const startTimer = setTimeout(() => {
      if (cancelled) return;
      let i = 0;
      const interval = setInterval(() => {
        if (cancelled) {
          clearInterval(interval);
          return;
        }
        i++;
        setDisplayed(text.slice(0, i));
        if (i >= text.length) {
          clearInterval(interval);
        }
      }, speedMs);
    }, startDelayMs);

    return () => {
      cancelled = true;
      clearTimeout(startTimer);
    };
  }, [text, speedMs, enabled, startDelayMs]);

  return displayed;
}
