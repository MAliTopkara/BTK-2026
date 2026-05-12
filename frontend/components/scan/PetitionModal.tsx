"use client";

/**
 * PetitionModal — Tüketici Hakem Heyeti dilekçesi PDF indirme formu
 * TASK-32
 */

import { useState } from "react";
import { generatePetition, ApiError } from "@/lib/api";

type Props = {
  scanId: string;
  scanUrl: string;
  onClose: () => void;
};

type FormState = {
  full_name: string;
  tc_no: string;
  address: string;
  phone: string;
};

const INITIAL_FORM: FormState = {
  full_name: "",
  tc_no: "",
  address: "",
  phone: "",
};

export function PetitionModal({ scanId, scanUrl, onClose }: Props) {
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function validate(): string | null {
    if (form.full_name.trim().length < 3) return "Ad Soyad en az 3 karakter olmalıdır.";
    if (!/^\d{11}$/.test(form.tc_no)) return "TC Kimlik No 11 haneli rakam olmalıdır.";
    if (form.address.trim().length < 10) return "Adres en az 10 karakter olmalıdır.";
    if (!/^[0-9\s\+\-\(\)]{7,20}$/.test(form.phone)) return "Geçerli bir telefon numarası girin.";
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const blob = await generatePetition(scanId, {
        url: scanUrl,
        full_name: form.full_name.trim(),
        tc_no: form.tc_no.trim(),
        address: form.address.trim(),
        phone: form.phone.trim(),
      });

      // PDF indir
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `trustlens_dilekce_${scanId.slice(0, 8)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      onClose();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.detail);
      } else {
        setError("PDF oluşturulamadı. Lütfen tekrar deneyin.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    /* Overlay */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-[var(--surface)] border border-[var(--border-strong)] w-full max-w-lg p-8 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <p className="font-mono text-[10px] tracking-[0.28em] uppercase text-[var(--muted-2)] mb-1">
              TASK-32 · Dilekçe
            </p>
            <h2 className="font-serif text-2xl leading-tight">
              Tüketici Hakem Heyeti
            </h2>
            <p className="font-mono text-[11px] text-[var(--muted)] mt-1">
              Bilgilerinizi girin, PDF otomatik oluşturulsun.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Kapat"
            className="font-mono text-[var(--muted)] hover:text-[var(--foreground)] transition-colors text-xl leading-none mt-1"
          >
            ×
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <FieldRow
            id="full_name"
            label="Ad Soyad"
            type="text"
            value={form.full_name}
            placeholder="Ayşe Yılmaz"
            onChange={handleChange}
            autoComplete="name"
          />
          <FieldRow
            id="tc_no"
            label="TC Kimlik No"
            type="text"
            value={form.tc_no}
            placeholder="12345678901"
            onChange={handleChange}
            maxLength={11}
          />
          <div className="space-y-1">
            <label
              htmlFor="address"
              className="font-mono text-[10px] tracking-[0.22em] uppercase text-[var(--muted)]"
            >
              Adres
            </label>
            <textarea
              id="address"
              name="address"
              rows={3}
              value={form.address}
              onChange={handleChange}
              placeholder="Mahalle, cadde, sokak, kapı no, ilçe, il"
              className="w-full bg-transparent border border-[var(--border)] focus:border-[var(--accent)] outline-none p-3 font-mono text-[12px] text-[var(--foreground)] placeholder:text-[var(--muted-2)] resize-none transition-colors"
              autoComplete="street-address"
            />
          </div>
          <FieldRow
            id="phone"
            label="Telefon"
            type="tel"
            value={form.phone}
            placeholder="0532 000 00 00"
            onChange={handleChange}
            autoComplete="tel"
          />

          {/* Error */}
          {error && (
            <p className="font-mono text-[11px] text-[var(--red)] border border-[var(--red)]/30 bg-[var(--red)]/5 px-3 py-2">
              {error}
            </p>
          )}

          {/* Disclaimer */}
          <p className="font-mono text-[9px] tracking-[0.12em] text-[var(--muted-2)] leading-relaxed">
            Bu dilekçe TrustLens AI tarafından taslak olarak üretilir.
            Sunmadan önce bir hukuk uzmanına danışmanız önerilir.
            TC Kimlik numaranız yalnızca bu dilekçe için kullanılır ve saklanmaz.
          </p>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border border-[var(--border)] text-[var(--muted)] hover:text-[var(--foreground)] hover:border-[var(--border-strong)] font-mono text-[11px] tracking-[0.22em] uppercase py-3 transition-colors"
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-[var(--foreground)] text-[var(--background)] hover:bg-[var(--accent)] hover:text-black font-mono text-[11px] tracking-[0.22em] uppercase py-3 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Oluşturuluyor…" : "PDF İndir"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Alt bileşen
// ---------------------------------------------------------------------------

function FieldRow({
  id,
  label,
  type,
  value,
  placeholder,
  onChange,
  maxLength,
  autoComplete,
}: {
  id: string;
  label: string;
  type: string;
  value: string;
  placeholder?: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  maxLength?: number;
  autoComplete?: string;
}) {
  return (
    <div className="space-y-1">
      <label
        htmlFor={id}
        className="font-mono text-[10px] tracking-[0.22em] uppercase text-[var(--muted)]"
      >
        {label}
      </label>
      <input
        id={id}
        name={id}
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={onChange}
        maxLength={maxLength}
        autoComplete={autoComplete}
        className="w-full bg-transparent border border-[var(--border)] focus:border-[var(--accent)] outline-none px-3 py-2.5 font-mono text-[12px] text-[var(--foreground)] placeholder:text-[var(--muted-2)] transition-colors"
      />
    </div>
  );
}
