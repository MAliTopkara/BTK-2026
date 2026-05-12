"use client";

import { motion } from "framer-motion";

import {
  type BehaviorProfile,
  computeImpulseScore,
  impulseLabel,
} from "@/lib/behavior-profile";

type Props = {
  profile: BehaviorProfile;
  onEdit: () => void;
  onClear: () => void;
};

export function ProfileSummary({ profile, onEdit, onClear }: Props) {
  const impulse = computeImpulseScore(profile);
  const label = impulseLabel(impulse);
  const updated = formatRelative(profile.updated_at);

  return (
    <div className="space-y-6">
      {/* Profile readout */}
      <div className="corner-frame relative bg-[var(--surface)] border border-[var(--blue)]/40 font-mono">
        <span className="c-tr" style={{ borderColor: "var(--blue)" }} />
        <span className="c-bl" style={{ borderColor: "var(--blue)" }} />

        <div className="flex items-center justify-between px-4 h-9 border-b border-[var(--blue)]/30 bg-black/40">
          <div className="flex items-center gap-2.5 text-[10px] tracking-[0.22em] uppercase">
            <span className="status-dot" style={{ background: "var(--blue)", boxShadow: "0 0 8px rgba(90, 169, 255, 0.45)" }} />
            <span className="text-[var(--foreground)]">PROFİL_AKTİF</span>
          </div>
          <span className="text-[10px] tracking-[0.18em] uppercase text-[var(--muted-2)]">
            updated · {updated}
          </span>
        </div>

        <dl className="p-6 sm:p-8 grid sm:grid-cols-2 gap-x-10 gap-y-5">
          <SummaryRow
            label="Aylık gelir"
            value={`₺ ${formatTL(profile.monthly_income)}`}
          />
          <SummaryRow
            label="Aylık bütçe"
            value={`₺ ${formatTL(profile.shopping_budget)}`}
            sub={`gelirin %${pct(profile.shopping_budget, profile.monthly_income)}'i`}
          />
          <SummaryRow
            label="Maaş günü"
            value={`ayın ${profile.payday}'i`}
          />
          <SummaryRow
            label="Bütçe / gelir oranı"
            value={`${pct(profile.shopping_budget, profile.monthly_income)}%`}
          />
        </dl>

        {/* Impulse score visualization */}
        <div className="border-t border-[var(--blue)]/30 px-6 sm:px-8 py-6 bg-black/20 space-y-3">
          <div className="flex items-baseline justify-between">
            <span className="font-mono text-[10px] tracking-[0.24em] uppercase text-[var(--muted)]">
              Türetilen impulse skoru
            </span>
            <span className="font-mono text-[10px] tracking-[0.18em] uppercase text-[var(--muted-2)]">
              0 = disiplinli · 1 = dürtüsel
            </span>
          </div>

          <div className="relative h-2 bg-[var(--border-strong)]">
            {/* Tier markers (25/50/75) */}
            {[0.25, 0.5, 0.75].map((t) => (
              <span
                key={t}
                className="absolute top-0 bottom-0 w-px bg-[var(--bg)]"
                style={{ left: `${t * 100}%` }}
              />
            ))}
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${impulse * 100}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="h-full"
              style={{ background: "var(--blue)" }}
            />
            <motion.span
              initial={{ left: "0%", opacity: 0 }}
              animate={{ left: `${impulse * 100}%`, opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.1, ease: "easeOut" }}
              className="absolute -top-1 -translate-x-1/2 w-1 h-4 bg-[var(--foreground)]"
            />
          </div>

          <div className="flex items-baseline justify-between">
            <span
              className="font-serif italic text-[28px] leading-none tabular-nums"
              style={{ color: "var(--blue)" }}
            >
              {impulse.toFixed(2)}
            </span>
            <span className="font-mono text-[10px] tracking-[0.22em] uppercase text-[var(--foreground)]">
              {label}
            </span>
          </div>

          <p className="font-sans text-[12px] text-[var(--muted)] leading-relaxed pt-1">
            Bu skor şu an basit bir tahmin: bütçenin gelire oranı.{" "}
            <span className="text-[var(--muted-2)]">
              TASK-49 ile tarama geçmişi embedding&apos;leri kullanılarak
              gerçekleşecek.
            </span>
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onEdit}
          className="bg-[var(--blue)] hover:opacity-90 text-black px-5 py-3 font-mono text-[10px] tracking-[0.24em] uppercase transition-opacity"
        >
          profili_düzenle →
        </button>
        <button
          type="button"
          onClick={onClear}
          className="px-5 py-3 border border-[var(--border-strong)] text-[var(--muted)] hover:text-[var(--red)] hover:border-[var(--red)]/60 font-mono text-[10px] tracking-[0.22em] uppercase transition-colors"
        >
          profili_sıfırla
        </button>
      </div>
    </div>
  );
}

function SummaryRow({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div>
      <dt className="font-mono text-[10px] tracking-[0.22em] uppercase text-[var(--muted-2)] mb-1">
        {label}
      </dt>
      <dd className="font-serif italic text-[26px] tabular-nums text-[var(--foreground)] leading-none">
        {value}
      </dd>
      {sub && (
        <div className="font-mono text-[10px] tracking-[0.18em] uppercase text-[var(--muted-2)] mt-1.5">
          {sub}
        </div>
      )}
    </div>
  );
}

function formatTL(n: number): string {
  return n.toLocaleString("tr-TR", { maximumFractionDigits: 0 });
}

function pct(part: number, whole: number): string {
  if (whole <= 0) return "—";
  return ((part / whole) * 100).toFixed(0);
}

function formatRelative(iso: string): string {
  try {
    const d = new Date(iso).getTime();
    const diff = Date.now() - d;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "az önce";
    if (mins < 60) return `${mins} dk önce`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs} saat önce`;
    const days = Math.floor(hrs / 24);
    return `${days} gün önce`;
  } catch {
    return iso;
  }
}
