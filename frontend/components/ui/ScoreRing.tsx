"use client";

import {
  motion,
  useMotionValue,
  useMotionValueEvent,
  useSpring,
  type Transition,
} from "framer-motion";
import { useEffect, useState } from "react";

// ───────────────────────────────────────────────────────────────────────────
// Types
// ───────────────────────────────────────────────────────────────────────────

export type Verdict = "BUY" | "CAUTION" | "AVOID";
export type ScoreRingSize = "sm" | "md" | "lg" | "xl";

type Props = {
  score: number; // 0-100
  verdict: Verdict;
  size?: ScoreRingSize;
  thinking?: boolean;
  showPill?: boolean;
  label?: string;
  delay?: number; // start delay in ms
};

// ───────────────────────────────────────────────────────────────────────────
// Visual tokens
// ───────────────────────────────────────────────────────────────────────────

const SIZE_PX: Record<ScoreRingSize, number> = {
  sm: 64,
  md: 96,
  lg: 160,
  xl: 240,
};

const STROKE_WIDTH: Record<ScoreRingSize, number> = {
  sm: 5,
  md: 4.5,
  lg: 3.5,
  xl: 3,
};

const VERDICT_COLORS: Record<Verdict, { ring: string; glow: string; cssVar: string }> = {
  BUY: { ring: "#00ff88", glow: "rgba(0, 255, 136, 0.45)", cssVar: "var(--accent)" },
  CAUTION: { ring: "#ffcc33", glow: "rgba(255, 204, 51, 0.4)", cssVar: "var(--yellow)" },
  AVOID: { ring: "#ff4d4d", glow: "rgba(255, 77, 77, 0.45)", cssVar: "var(--red)" },
};

const VERDICT_TR: Record<Verdict, string> = {
  BUY: "AL",
  CAUTION: "DİKKATLİ",
  AVOID: "ALMA",
};

const VERDICT_DOT: Record<Verdict, string> = {
  BUY: "status-dot-ok",
  CAUTION: "status-dot-warn",
  AVOID: "status-dot-risk",
};

const RADIUS = 42;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

// ───────────────────────────────────────────────────────────────────────────
// Component
// ───────────────────────────────────────────────────────────────────────────

export function ScoreRing({
  score,
  verdict,
  size = "md",
  thinking = false,
  showPill = false,
  label,
  delay = 0,
}: Props) {
  const px = SIZE_PX[size];
  const strokeWidth = STROKE_WIDTH[size];
  const colors = VERDICT_COLORS[verdict];
  const clamped = Math.max(0, Math.min(100, score));
  const target = thinking ? 0 : clamped;

  // ─── Spring-animated number counter ───
  const motionVal = useMotionValue(0);
  const smoothed = useSpring(motionVal, { stiffness: 55, damping: 18, mass: 1.2 });
  const [displayed, setDisplayed] = useState(0);

  useMotionValueEvent(smoothed, "change", (v) => {
    setDisplayed(Math.round(v));
  });

  useEffect(() => {
    motionVal.set(target);
  }, [target, motionVal]);

  // ─── Per-size feature flags ───
  const showNumber = size !== "sm";
  const showSubLabel = size === "lg" || size === "xl";
  const showTicks = size === "lg" || size === "xl";
  const showGlow = size === "lg" || size === "xl";
  const showOrbital = size === "xl";

  const offset = CIRCUMFERENCE * (1 - target / 100);

  const ringTransition: Transition = {
    duration: 1.45,
    ease: [0.22, 1.2, 0.36, 1],
    delay: delay / 1000,
  };

  // Tick positions (rotated −90° so 0% is top): 25/50/75
  const ticks = [25, 50, 75];

  return (
    <div className="inline-flex flex-col items-center">
      {/* Ring container */}
      <div className="relative" style={{ width: px, height: px }}>
        {/* Glow halo */}
        {showGlow && !thinking && (
          <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 0.75, scale: 1 }}
            transition={{ duration: 1.2, delay: delay / 1000 + 0.9, ease: "easeOut" }}
            className="absolute inset-0 pointer-events-none rounded-full"
            style={{
              background: `radial-gradient(circle, ${colors.glow} 0%, transparent 65%)`,
              filter: "blur(18px)",
            }}
            aria-hidden
          />
        )}

        <svg
          role="img"
          aria-label={`Güven skoru ${clamped} / 100. Karar: ${VERDICT_TR[verdict]}.`}
          viewBox="0 0 100 100"
          width={px}
          height={px}
          className="relative -rotate-90"
        >
          {/* Background track */}
          <circle
            cx={50}
            cy={50}
            r={RADIUS}
            fill="none"
            stroke="var(--border-strong)"
            strokeWidth={strokeWidth * 0.55}
          />

          {/* Tick marks at 25/50/75 (around the ring) */}
          {showTicks && (
            <g>
              {ticks.map((t, i) => {
                const angle = (t / 100) * Math.PI * 2;
                const r1 = RADIUS + 3;
                const r2 = RADIUS + 7;
                const x1 = 50 + r1 * Math.cos(angle);
                const y1 = 50 + r1 * Math.sin(angle);
                const x2 = 50 + r2 * Math.cos(angle);
                const y2 = 50 + r2 * Math.sin(angle);
                return (
                  <motion.line
                    key={t}
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke="var(--muted-2)"
                    strokeWidth={0.8}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 0.7 }}
                    transition={{
                      duration: 0.3,
                      delay: delay / 1000 + 0.55 + i * 0.08,
                    }}
                  />
                );
              })}
            </g>
          )}

          {/* Main progress arc (or thinking spinner) */}
          {thinking ? (
            <motion.circle
              cx={50}
              cy={50}
              r={RADIUS}
              fill="none"
              stroke="var(--muted-2)"
              strokeWidth={strokeWidth}
              strokeDasharray="5 5"
              animate={{ rotate: 360 }}
              transition={{ duration: 2.5, ease: "linear", repeat: Infinity }}
              style={{ transformOrigin: "50px 50px", transformBox: "fill-box" }}
            />
          ) : (
            <motion.circle
              cx={50}
              cy={50}
              r={RADIUS}
              fill="none"
              stroke={colors.ring}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeDasharray={CIRCUMFERENCE}
              initial={{ strokeDashoffset: CIRCUMFERENCE }}
              animate={{ strokeDashoffset: offset }}
              transition={ringTransition}
            />
          )}

          {/* Orbital dot for XL */}
          {showOrbital && !thinking && (
            <motion.g
              initial={{ opacity: 0 }}
              animate={{ opacity: 1, rotate: 360 }}
              transition={{
                opacity: { duration: 0.5, delay: delay / 1000 + 1.5 },
                rotate: {
                  duration: 28,
                  ease: "linear",
                  repeat: Infinity,
                  delay: delay / 1000 + 1.5,
                },
              }}
              style={{ transformOrigin: "50px 50px", transformBox: "fill-box" }}
            >
              <circle cx={50} cy={50 - RADIUS} r={1.4} fill={colors.ring} />
            </motion.g>
          )}
        </svg>

        {/* Center content */}
        {showNumber && (
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            {thinking ? (
              <motion.span
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                className="font-serif italic tabular-nums text-[var(--muted)] leading-none"
                style={{ fontSize: px * 0.34 }}
              >
                —
              </motion.span>
            ) : (
              <>
                <span
                  className="font-serif italic tabular-nums leading-none"
                  style={{ fontSize: px * 0.34, color: colors.ring }}
                >
                  {displayed}
                </span>
                {showSubLabel && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.4, delay: delay / 1000 + 1.35 }}
                    className="font-mono text-[var(--muted-2)] mt-1.5 uppercase"
                    style={{
                      fontSize: Math.max(8, px * 0.055),
                      letterSpacing: "0.22em",
                    }}
                  >
                    / 100
                  </motion.div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Verdict pill (lg/xl only) */}
      {showPill && !thinking && (size === "lg" || size === "xl") && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.45,
            delay: delay / 1000 + 1.55,
            ease: [0.34, 1.56, 0.64, 1],
          }}
          className="mt-5 inline-flex items-center gap-2.5 border px-3.5 py-1.5"
          style={{
            borderColor: colors.ring,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
          }}
        >
          <span className={`status-dot ${VERDICT_DOT[verdict]}`} />
          <span
            className="font-mono uppercase font-medium"
            style={{
              color: colors.ring,
              fontSize: size === "xl" ? "12px" : "11px",
              letterSpacing: "0.24em",
            }}
          >
            {label ?? VERDICT_TR[verdict]}
          </span>
        </motion.div>
      )}
    </div>
  );
}
