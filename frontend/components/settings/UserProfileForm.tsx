"use client";

import { useId, useState } from "react";

import { createClient } from "@/lib/supabase/client";

type Props = {
  initialFirstName: string;
  initialLastName: string;
  email: string;
};

export function UserProfileForm({
  initialFirstName,
  initialLastName,
  email,
}: Props) {
  const firstNameId = useId();
  const lastNameId = useId();

  const [firstName, setFirstName] = useState(initialFirstName);
  const [lastName, setLastName] = useState(initialLastName);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);

    const supabase = createClient();
    const { error: err } = await supabase.auth.updateUser({
      data: {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        full_name: `${firstName.trim()} ${lastName.trim()}`.trim(),
      },
    });

    setSaving(false);
    if (err) {
      setError(err.message);
    } else {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="corner-frame relative bg-[var(--surface)] border border-[var(--accent)]/40 font-mono"
      noValidate
    >
      <span className="c-tr" />
      <span className="c-bl" />

      {/* Header */}
      <div className="flex items-center justify-between px-4 h-9 border-b border-[var(--accent)]/30 bg-black/40">
        <div className="flex items-center gap-2.5 text-[10px] tracking-[0.22em] uppercase">
          <span
            className={`status-dot ${saved ? "status-dot-ok" : "status-dot-info"}`}
          />
          <span className="text-[var(--foreground)]">HESAP_PROFİLİ</span>
        </div>
        <span className="text-[10px] tracking-[0.18em] uppercase text-[var(--muted-2)]">
          {saved ? "SAVED_OK" : saving ? "PROCESSING" : "SUPABASE"}
        </span>
      </div>

      <div className="p-6 sm:p-8 space-y-6">
        {/* Email (read-only) */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="flex items-center gap-2.5 text-[10px] tracking-[0.24em] uppercase">
              <span className="status-dot status-dot-ok" />
              <span className="text-[var(--foreground)]/85">E-posta</span>
            </span>
            <span className="text-[9px] tracking-[0.22em] uppercase text-[var(--muted-2)]">
              [readonly]
            </span>
          </div>
          <div className="border-b border-[var(--border)] py-2.5 text-[14px] text-[var(--muted)] font-mono">
            {email}
          </div>
        </div>

        {/* Ad + Soyad */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <ProfileField
            id={firstNameId}
            label="Ad"
            filled={firstName.trim().length > 0}
          >
            <input
              id={firstNameId}
              type="text"
              autoComplete="given-name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              disabled={saving}
              placeholder="Mehmet"
              className="w-full bg-transparent outline-none text-[14px] text-[var(--foreground)] placeholder:text-[var(--muted-2)] py-2.5 font-mono caret-[var(--accent)]"
            />
          </ProfileField>
          <ProfileField
            id={lastNameId}
            label="Soyad"
            filled={lastName.trim().length > 0}
          >
            <input
              id={lastNameId}
              type="text"
              autoComplete="family-name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              disabled={saving}
              placeholder="Yılmaz"
              className="w-full bg-transparent outline-none text-[14px] text-[var(--foreground)] placeholder:text-[var(--muted-2)] py-2.5 font-mono caret-[var(--accent)]"
            />
          </ProfileField>
        </div>

        {error && (
          <div className="border border-[var(--red)]/50 bg-[var(--red)]/[0.08] px-4 py-3 flex items-start gap-3">
            <span className="status-dot status-dot-risk mt-1.5 shrink-0" />
            <p className="font-sans text-[13px] text-[var(--foreground)]/90 leading-relaxed">
              {error}
            </p>
          </div>
        )}

        <div className="border-t border-[var(--border)]" />

        <button
          type="submit"
          disabled={saving || saved}
          className="group relative w-full bg-[var(--accent)] hover:bg-[var(--accent-dim)] text-black px-5 py-4 font-mono text-[11px] tracking-[0.24em] uppercase transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-between overflow-hidden"
        >
          {saving && (
            <span className="absolute inset-0 stripes-active opacity-60 pointer-events-none" />
          )}
          <span className="relative flex items-center gap-3">
            <span className="text-black/70">{">"}</span>
            <span>
              {saved ? "Güncellendi ✓" : saving ? "Kaydediliyor" : "Güncelle"}
            </span>
            {saving && <span className="cursor" />}
          </span>
          <span className="relative font-sans transition-transform group-hover:translate-x-0.5">
            →
          </span>
        </button>
      </div>
    </form>
  );
}

function ProfileField({
  id,
  label,
  filled,
  children,
}: {
  id: string;
  label: string;
  filled: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="flex items-center justify-between mb-2">
        <span className="flex items-center gap-2.5 text-[10px] tracking-[0.24em] uppercase">
          <span
            className={`status-dot ${filled ? "status-dot-ok" : "status-dot-info"}`}
          />
          <span className="text-[var(--foreground)]/85">{label}</span>
        </span>
      </label>
      <div className="relative border-b border-[var(--border-strong)] focus-within:border-[var(--accent)] transition-colors">
        {children}
      </div>
    </div>
  );
}
