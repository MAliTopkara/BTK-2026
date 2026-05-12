"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useEffect, useState } from "react";

import {
  type BehaviorProfile,
  type FitTier,
  computeFit,
  computeImpulseScore,
  impulseLabel,
  loadProfile,
} from "@/lib/behavior-profile";

type Props = {
  price: number;
  trustScore: number;
};

const TIER_TOKENS: Record<
  FitTier,
  { color: string; dot: string; label: string; verb: string }
> = {
  comfortable: {
    color: "var(--accent)",
    dot: "status-dot-ok",
    label: "Bütçeye uygun",
    verb: "rahatça uyuyor",
  },
  significant: {
    color: "var(--yellow)",
    dot: "status-dot-warn",
    label: "Bütçenin önemli kısmı",
    verb: "kayda değer",
  },
  stretch: {
    color: "var(--red)",
    dot: "status-dot-risk",
    label: "Bütçeyi geriyor",
    verb: "büyük yer kaplıyor",
  },
};

export function FinancialFitPanel({ price, trustScore }: Props) {
  const [profile, setProfile] = useState<BehaviorProfile | null | "loading">(
    "loading",
  );

  useEffect(() => {
    setProfile(loadProfile());
  }, []);

  if (profile === "loading") return null;

  if (profile === null) {
    return <NoProfileCallout />;
  }

  const fit = computeFit({ profile, price, trust_score: trustScore });
  const tier = TIER_TOKENS[fit.fit_tier];
  const impulse = computeImpulseScore(profile);
  const impulseLbl = impulseLabel(impulse);

  return (
    <section className="relative">
      <header className="grid lg:grid-cols-12 gap-6 items-end mb-8">
        <div className="lg:col-span-7">
          <div className="font-mono text-[10px] tracking-[0.32em] uppercase text-[var(--muted)] mb-5 flex items-center gap-3">
            <span className="h-px w-8" style={{ background: "var(--blue)" }} />
            <span>03 / Cüzdan_Perspektifi</span>
          </div>
          <h2 className="font-serif text-[clamp(1.8rem,3.5vw,2.6rem)] leading-[1.05] tracking-[-0.015em]">
            Bu satın alım{" "}
            <span className="italic" style={{ color: "var(--blue)" }}>
              cüzdanına
            </span>{" "}
            uyuyor mu?
          </h2>
        </div>
        <div className="lg:col-span-5">
          <p className="text-[13px] text-[var(--muted)] leading-relaxed max-w-md">
            Trust skoru ürünün güvenilirliğidir. Bu bölüm finansal profiline
            göre ayrı bir okuma yapar — kararı sen verirsin.
          </p>
        </div>
      </header>

      {/* Main fit panel */}
      <div className="corner-frame relative bg-[var(--surface)] border border-[var(--blue)]/40 font-mono">
        <span className="c-tr" style={{ borderColor: "var(--blue)" }} />
        <span className="c-bl" style={{ borderColor: "var(--blue)" }} />

        {/* Header strip */}
        <div className="flex items-center justify-between px-4 h-9 border-b border-[var(--blue)]/30 bg-black/40">
          <div className="flex items-center gap-2.5 text-[10px] tracking-[0.22em] uppercase text-[var(--muted)]">
            <span
              className="status-dot"
              style={{
                background: "var(--blue)",
                boxShadow: "0 0 8px rgba(90, 169, 255, 0.45)",
              }}
            />
            <span className="text-[var(--foreground)]">CÜZDAN_RAPORU</span>
          </div>
          <span className="text-[10px] tracking-[0.18em] uppercase text-[var(--muted-2)]">
            local · profilinden
          </span>
        </div>

        <div className="p-6 lg:p-8 grid lg:grid-cols-2 gap-8 lg:gap-10">
          {/* LEFT — fit bar + main reading */}
          <div className="space-y-5">
            <div>
              <div className="flex items-baseline gap-3 mb-1.5">
                <span className="font-serif italic text-[44px] leading-none tabular-nums" style={{ color: tier.color }}>
                  %{fit.budget_pct}
                </span>
                <span className="text-[11px] tracking-[0.18em] uppercase text-[var(--muted-2)]">
                  bütçenin
                </span>
              </div>
              <div className="font-sans text-[13px] text-[var(--muted)]">
                Aylık alışveriş bütçenin{" "}
                <span style={{ color: tier.color }}>{tier.verb}</span> bir kısmı.
              </div>
            </div>

            <FitBar pct={fit.budget_pct} color={tier.color} />

            <div className="flex items-center gap-2 pt-1">
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
          </div>

          {/* RIGHT — context table */}
          <dl className="grid grid-cols-2 gap-y-4 gap-x-6 text-[12px] border-l-0 lg:border-l border-[var(--border)] lg:pl-10">
            <ContextRow label="satın alım" value={`₺ ${formatTL(price)}`} />
            <ContextRow
              label="aylık bütçe"
              value={`₺ ${formatTL(profile.shopping_budget)}`}
            />
            <ContextRow
              label="aylık gelir"
              value={`₺ ${formatTL(profile.monthly_income)}`}
              sub={`gelirin %${fit.income_pct}'i`}
            />
            <ContextRow
              label="maaş gününe"
              value={
                fit.days_until_payday !== null
                  ? `${fit.days_until_payday} gün`
                  : "—"
              }
              sub={`ayın ${profile.payday}'i`}
            />
            <ContextRow
              label="impulse"
              value={impulse.toFixed(2)}
              sub={impulseLbl}
              valueColor="var(--blue)"
              colspan
            />
          </dl>
        </div>

        {/* 48-hour rule banner */}
        {fit.should_wait_48h && (
          <FortyEightHourRule
            reasoning={fit.reasoning_tr}
            triggeredByBudget={fit.fit_tier === "stretch"}
            triggeredByTrust={trustScore < 60}
            trustScore={trustScore}
          />
        )}

        {/* Reasoning footer */}
        <div className="border-t border-[var(--blue)]/30 bg-black/30 px-4 py-3 font-sans text-[12px] text-[var(--foreground)]/80 leading-relaxed">
          <span className="font-mono text-[10px] tracking-[0.22em] uppercase text-[var(--muted-2)] mr-2">
            {">"}
          </span>
          {fit.reasoning_tr}
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// FitBar — animated budget consumption bar
// ─────────────────────────────────────────────────────────────────────────

function FitBar({ pct, color }: { pct: number; color: string }) {
  const clamped = Math.min(100, pct);
  return (
    <div className="space-y-2">
      <div className="relative h-2.5 bg-[var(--border-strong)] overflow-hidden">
        {/* Tier markers */}
        {[10, 30].map((t) => (
          <span
            key={t}
            className="absolute top-0 bottom-0 w-px bg-[var(--bg)]"
            style={{ left: `${t}%` }}
          />
        ))}
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${clamped}%` }}
          transition={{ duration: 0.9, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          className="h-full"
          style={{ background: color }}
        />
        {pct > 100 && (
          <span className="absolute right-1 top-1/2 -translate-y-1/2 text-[9px] font-mono text-black tracking-widest">
            +{Math.round(pct - 100)}%
          </span>
        )}
      </div>
      <div className="grid grid-cols-3 font-mono text-[9px] tracking-[0.2em] uppercase text-[var(--muted-2)]">
        <span>0%</span>
        <span className="text-center">10%/30%</span>
        <span className="text-right">100%</span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// 48 hour rule callout
// ─────────────────────────────────────────────────────────────────────────

function FortyEightHourRule({
  reasoning,
  triggeredByBudget,
  triggeredByTrust,
  trustScore,
}: {
  reasoning: string;
  triggeredByBudget: boolean;
  triggeredByTrust: boolean;
  trustScore: number;
}) {
  const triggers: string[] = [];
  if (triggeredByBudget) triggers.push("bütçenin %30'undan fazla");
  if (triggeredByTrust) triggers.push(`trust skoru ${trustScore} (<60)`);

  return (
    <div className="border-t border-[var(--blue)]/30 bg-[var(--blue)]/[0.06] p-5 lg:p-6 flex items-start gap-4">
      <div className="shrink-0 mt-0.5">
        <span className="inline-flex items-center justify-center w-9 h-9 border border-[var(--blue)]/50 bg-black/30">
          <span className="font-serif italic text-[18px]" style={{ color: "var(--blue)" }}>
            48
          </span>
        </span>
      </div>
      <div className="flex-1 space-y-2">
        <div className="flex items-center gap-2 font-mono text-[10px] tracking-[0.24em] uppercase" style={{ color: "var(--blue)" }}>
          <span>48 saat kuralı</span>
          {triggers.length > 0 && (
            <>
              <span className="text-[var(--muted-2)]">·</span>
              <span className="text-[var(--muted)]">{triggers.join(" + ")}</span>
            </>
          )}
        </div>
        <p className="font-sans text-[13px] text-[var(--foreground)]/85 leading-relaxed">
          Bu satın alımı{" "}
          <span style={{ color: "var(--blue)" }}>iki gün ertele</span>. Pişman
          olma ihtimali yüksek satın alımlarda {" "}
          <em className="text-[var(--foreground)]">48 saat bekleme</em>, dürtüsel
          karardan ölçülü karara geçmenin en bilinen yöntemidir.
        </p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// No profile callout
// ─────────────────────────────────────────────────────────────────────────

function NoProfileCallout() {
  return (
    <section className="relative">
      <header className="mb-6">
        <div className="font-mono text-[10px] tracking-[0.32em] uppercase text-[var(--muted)] flex items-center gap-3">
          <span className="h-px w-8" style={{ background: "var(--blue)" }} />
          <span>03 / Cüzdan_Perspektifi · profil eksik</span>
        </div>
      </header>

      <div className="border border-dashed border-[var(--blue)]/40 bg-[var(--blue)]/[0.03] p-6 lg:p-8 flex flex-col lg:flex-row items-start lg:items-center gap-6 justify-between">
        <div className="max-w-xl">
          <div className="font-serif italic text-[22px] leading-tight text-[var(--foreground)] mb-2">
            Finansal profilin yok.
          </div>
          <p className="font-sans text-[13px] text-[var(--muted)] leading-relaxed">
            Aylık gelir + bütçe + maaş günü bilgini bir kez doldur. Her tarama
            sonucunda &quot;bu satın alım cüzdanına uyuyor mu?&quot; analizi de
            göreceksin. Veriler sadece tarayıcında saklanır.
          </p>
        </div>
        <div className="flex flex-col items-start gap-1 shrink-0">
          <Link
            href="/settings"
            className="group inline-flex items-center gap-3 text-black px-5 py-3 font-mono text-[10px] tracking-[0.24em] uppercase transition-opacity hover:opacity-90"
            style={{ background: "var(--blue)" }}
          >
            <span>Profil_oluştur</span>
            <span className="font-sans transition-transform group-hover:translate-x-0.5">→</span>
          </Link>
          <p className="font-mono text-[9px] tracking-[0.18em] uppercase text-[var(--muted-2)] mt-1">
            giriş gerekir
          </p>
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// helpers
// ─────────────────────────────────────────────────────────────────────────

function ContextRow({
  label,
  value,
  sub,
  valueColor,
  colspan,
}: {
  label: string;
  value: string;
  sub?: string;
  valueColor?: string;
  colspan?: boolean;
}) {
  return (
    <div className={colspan ? "col-span-2" : undefined}>
      <dt className="font-mono text-[9px] tracking-[0.22em] uppercase text-[var(--muted-2)] mb-1">
        {label}
      </dt>
      <dd className="flex items-baseline gap-2">
        <span
          className="tabular-nums text-[15px] text-[var(--foreground)]"
          style={valueColor ? { color: valueColor } : undefined}
        >
          {value}
        </span>
        {sub && (
          <span className="text-[10px] tracking-[0.18em] uppercase text-[var(--muted-2)]">
            {sub}
          </span>
        )}
      </dd>
    </div>
  );
}

function formatTL(n: number): string {
  return n.toLocaleString("tr-TR", { maximumFractionDigits: 0 });
}
