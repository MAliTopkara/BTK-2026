"use client";

import { useId, useState } from "react";

import {
  type BehaviorProfile,
  type ProfileError,
  saveProfile,
  validateProfile,
} from "@/lib/behavior-profile";

type Props = {
  initial?: BehaviorProfile | null;
  onSaved: (p: BehaviorProfile) => void;
  onCancel?: () => void;
};

export function BehaviorProfileForm({ initial, onSaved, onCancel }: Props) {
  const incomeId = useId();
  const budgetId = useId();
  const paydayId = useId();

  const [income, setIncome] = useState<string>(
    initial ? String(initial.monthly_income) : "",
  );
  const [budget, setBudget] = useState<string>(
    initial ? String(initial.shopping_budget) : "",
  );
  const [payday, setPayday] = useState<string>(
    initial ? String(initial.payday) : "15",
  );

  const [errors, setErrors] = useState<ProfileError[]>([]);
  const [saved, setSaved] = useState(false);

  function fieldError(field: keyof BehaviorProfile): string | undefined {
    return errors.find((e) => e.field === field)?.message;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = {
      monthly_income: Number(income),
      shopping_budget: Number(budget),
      payday: parseInt(payday, 10),
    };
    const errs = validateProfile(parsed);
    setErrors(errs);
    if (errs.length > 0) return;

    const p = saveProfile(parsed);
    setSaved(true);
    onSaved(p);
    setTimeout(() => setSaved(false), 2200);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="corner-frame relative bg-[var(--surface)] border border-[var(--blue)]/40 font-mono"
      noValidate
    >
      <span className="c-tr" style={{ borderColor: "var(--blue)" }} />
      <span className="c-bl" style={{ borderColor: "var(--blue)" }} />

      {/* Header */}
      <div className="flex items-center justify-between px-4 h-9 border-b border-[var(--blue)]/30 bg-black/40">
        <div className="flex items-center gap-2.5 text-[10px] tracking-[0.22em] uppercase">
          <span className="status-dot" style={{ background: "var(--blue)", boxShadow: "0 0 8px rgba(90, 169, 255, 0.45)" }} />
          <span className="text-[var(--foreground)]">PROFİL_FORMU</span>
        </div>
        <span className="text-[10px] tracking-[0.18em] uppercase text-[var(--muted-2)]">
          local · sessionsız
        </span>
      </div>

      <div className="p-6 sm:p-8 space-y-6">
        <NumberField
          id={incomeId}
          label="Aylık gelir"
          unit="₺"
          placeholder="25000"
          value={income}
          onChange={setIncome}
          error={fieldError("monthly_income")}
          hint="Net (eline geçen) tutarı yaz."
        />

        <NumberField
          id={budgetId}
          label="Aylık alışveriş bütçesi"
          unit="₺"
          placeholder="5000"
          value={budget}
          onChange={setBudget}
          error={fieldError("shopping_budget")}
          hint="E-ticaret + dış harcama için ayırdığın aylık tutar."
        />

        <NumberField
          id={paydayId}
          label="Maaş günü"
          unit="ayın"
          placeholder="15"
          suffix="'i"
          value={payday}
          onChange={setPayday}
          error={fieldError("payday")}
          hint="1-31 arası. Hangi gün maaşın yatıyor?"
          min={1}
          max={31}
        />

        <div className="border-t border-[var(--border)] pt-5 flex items-center gap-3">
          <button
            type="submit"
            className="group flex-1 bg-[var(--blue)] hover:opacity-90 text-black px-5 py-3.5 font-mono text-[11px] tracking-[0.24em] uppercase transition-opacity flex items-center justify-between"
          >
            <span className="flex items-center gap-3">
              <span className="text-black/70">{">"}</span>
              <span>{saved ? "Kaydedildi · Profil güncel" : initial ? "Profili_güncelle" : "Profili_kaydet"}</span>
              {saved && <span className="cursor" />}
            </span>
            <span className="font-sans transition-transform group-hover:translate-x-0.5">→</span>
          </button>

          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-5 py-3.5 border border-[var(--border-strong)] text-[var(--muted)] hover:text-[var(--foreground)] hover:border-[var(--foreground)] font-mono text-[10px] tracking-[0.22em] uppercase transition-colors"
            >
              vazgeç
            </button>
          )}
        </div>

        <p className="text-[10px] tracking-[0.18em] uppercase text-[var(--muted-2)] flex items-center gap-2">
          <span className="status-dot status-dot-info" />
          <span className="normal-case tracking-normal text-[11px] font-sans text-[var(--muted)]">
            Profilin yalnızca tarayıcının localStorage&apos;ında saklanır. Hiçbir
            sunucuya gönderilmez.
          </span>
        </p>
      </div>
    </form>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// NumberField
// ─────────────────────────────────────────────────────────────────────────

function NumberField({
  id,
  label,
  unit,
  placeholder,
  suffix,
  value,
  onChange,
  error,
  hint,
  min,
  max,
}: {
  id: string;
  label: string;
  unit: string;
  placeholder: string;
  suffix?: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  hint?: string;
  min?: number;
  max?: number;
}) {
  const filled = value !== "" && Number(value) > 0;
  const hasError = !!error;
  return (
    <div>
      <label htmlFor={id} className="flex items-center justify-between mb-2">
        <span className="flex items-center gap-2.5 text-[10px] tracking-[0.24em] uppercase">
          <span
            className={`status-dot ${
              hasError
                ? "status-dot-risk"
                : filled
                  ? "status-dot-ok"
                  : "status-dot-info"
            }`}
          />
          <span className="text-[var(--foreground)]/85">{label}</span>
        </span>
        <span className="text-[9px] tracking-[0.22em] uppercase text-[var(--muted-2)]">
          [gerekli]
        </span>
      </label>

      <div
        className={`flex items-baseline gap-2 border-b transition-colors ${
          hasError
            ? "border-[var(--red)]/60"
            : "border-[var(--border-strong)] focus-within:border-[var(--blue)]"
        }`}
      >
        <span className="text-[var(--muted)] text-[14px] shrink-0">{unit}</span>
        <input
          id={id}
          type="number"
          inputMode="numeric"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          min={min}
          max={max}
          step="1"
          className="w-full bg-transparent outline-none text-[16px] py-3 text-[var(--foreground)] placeholder:text-[var(--muted-2)] font-mono caret-[var(--blue)] tabular-nums [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        />
        {suffix && (
          <span className="text-[var(--muted)] text-[14px] shrink-0">
            {suffix}
          </span>
        )}
      </div>

      {hasError ? (
        <p className="mt-2 font-mono text-[10px] tracking-[0.18em] uppercase text-[var(--red)] flex items-start gap-1.5">
          <span>×</span>
          <span className="normal-case tracking-normal text-[11px] font-sans">
            {error}
          </span>
        </p>
      ) : hint ? (
        <p className="mt-2 font-mono text-[10px] text-[var(--muted-2)] flex items-start gap-1.5">
          <span className="text-[var(--blue)]">ⓘ</span>
          <span>{hint}</span>
        </p>
      ) : null}
    </div>
  );
}
