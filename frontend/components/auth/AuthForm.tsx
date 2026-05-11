"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useId, useState } from "react";

import { createClient } from "@/lib/supabase/client";

type Mode = "login" | "register";

type Props = {
  mode: Mode;
};

const labels = {
  login: {
    panel: "LOGIN_TERMINAL",
    submit: "Giriş_yap",
    submitting: "Doğrulanıyor",
    success: "Başarılı · yönlendiriliyor",
  },
  register: {
    panel: "REGISTER_TERMINAL",
    submit: "Hesap_aç",
    submitting: "Hesap_oluşturuluyor",
    success: "Hesap açıldı · giriş yapılıyor",
  },
} as const;

export function AuthForm({ mode }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const emailId = useId();
  const passwordId = useId();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // URL'de error param varsa göster (callback'ten gelir)
  useEffect(() => {
    if (searchParams.get("error") === "callback_failed") {
      setError("Oturum doğrulama başarısız oldu. Tekrar dene.");
    }
  }, [searchParams]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();

    try {
      if (mode === "login") {
        const { error: err } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (err) throw err;
      } else {
        if (password.length < 8) {
          throw new Error("Şifre en az 8 karakter olmalı.");
        }
        const { error: err } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        });
        if (err) throw err;
      }
      setSuccess(true);
      router.refresh();
      router.push("/dashboard");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Bilinmeyen hata.";
      setError(translateError(msg));
    } finally {
      setLoading(false);
    }
  }

  const lbl = labels[mode];
  const emailFilled = email.length > 3 && email.includes("@");
  const passwordFilled = password.length >= (mode === "register" ? 8 : 1);

  return (
    <form
      onSubmit={handleSubmit}
      className="corner-frame relative bg-[var(--surface)] border border-[var(--border-strong)] font-mono text-[12px]"
      noValidate
    >
      <span className="c-tr" />
      <span className="c-bl" />

      {/* Panel title bar */}
      <div className="flex items-center justify-between px-4 h-9 border-b border-[var(--border-strong)] bg-black/40">
        <div className="flex items-center gap-2.5 text-[10px] tracking-[0.22em] uppercase text-[var(--muted)]">
          <span className={`status-dot ${success ? "status-dot-ok" : loading ? "status-dot-warn" : "status-dot-info"} ${loading ? "live-pulse" : ""}`} />
          <span>{lbl.panel}</span>
        </div>
        <span className="text-[10px] tracking-[0.18em] uppercase text-[var(--muted-2)]">
          {success ? "200_OK" : loading ? "PROCESSING" : "IDLE"}
        </span>
      </div>

      {/* Body */}
      <div className="p-6 sm:p-8 space-y-6">
        {/* Error banner */}
        {error && (
          <div className="border border-[var(--red)]/50 bg-[var(--red)]/[0.08] px-4 py-3 flex items-start gap-3 animate-[slide-down_0.25s_ease-out]">
            <span className="status-dot status-dot-risk mt-1.5 shrink-0" />
            <div>
              <div className="text-[10px] tracking-[0.22em] uppercase text-[var(--red)] mb-1">
                Error · 401
              </div>
              <p className="font-sans text-[13px] text-[var(--foreground)]/90 leading-relaxed">
                {error}
              </p>
            </div>
          </div>
        )}

        {/* Email field */}
        <AuthField
          id={emailId}
          label="E-posta"
          required
          filled={emailFilled}
          focused={false}
        >
          <input
            id={emailId}
            type="email"
            inputMode="email"
            autoComplete="email"
            autoFocus
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
            placeholder="adres@example.com"
            className="w-full bg-transparent outline-none text-[14px] text-[var(--foreground)] placeholder:text-[var(--muted-2)] py-2.5 font-mono caret-[var(--accent)]"
          />
        </AuthField>

        {/* Password field */}
        <AuthField
          id={passwordId}
          label="Şifre"
          required
          filled={passwordFilled}
          focused={false}
          hint={
            mode === "register" ? "Minimum 8 karakter — büyük/küçük harf önerilir." : undefined
          }
          accessory={
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="text-[10px] tracking-[0.22em] uppercase text-[var(--muted-2)] hover:text-[var(--accent)] transition-colors"
              tabIndex={-1}
            >
              {showPassword ? "hide" : "show"}
            </button>
          }
        >
          <input
            id={passwordId}
            type={showPassword ? "text" : "password"}
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            required
            minLength={mode === "register" ? 8 : 1}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
            placeholder={showPassword ? "supersafe123" : "••••••••"}
            className="w-full bg-transparent outline-none text-[14px] text-[var(--foreground)] placeholder:text-[var(--muted-2)] py-2.5 font-mono caret-[var(--accent)]"
          />
        </AuthField>

        {/* Divider */}
        <div className="border-t border-[var(--border)]" />

        {/* Submit button */}
        <button
          type="submit"
          disabled={loading || success || !emailFilled || !passwordFilled}
          className="group relative w-full bg-[var(--accent)] hover:bg-[var(--accent-dim)] text-black px-5 py-4 font-mono text-[11px] tracking-[0.24em] uppercase transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-between overflow-hidden"
        >
          {loading && (
            <span className="absolute inset-0 stripes-active opacity-60 pointer-events-none" />
          )}
          <span className="relative flex items-center gap-3">
            <span className="text-black/70">{">"}</span>
            <span>
              {success ? lbl.success : loading ? lbl.submitting : lbl.submit}
            </span>
            {(loading || success) && <span className="cursor" />}
          </span>
          <span className="relative font-sans transition-transform group-hover:translate-x-0.5">
            →
          </span>
        </button>

        {/* Diagnostic footer line */}
        <div className="flex items-center justify-between text-[9px] tracking-[0.22em] uppercase text-[var(--muted-2)] pt-2">
          <span>encrypted · tls_1.3</span>
          <span>session_id · {sessionId()}</span>
        </div>
      </div>

      <style>{`
        @keyframes slide-down {
          from { opacity: 0; transform: translateY(-6px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Field wrapper
// ---------------------------------------------------------------------------

function AuthField({
  id,
  label,
  required,
  filled,
  hint,
  accessory,
  children,
}: {
  id: string;
  label: string;
  required?: boolean;
  filled: boolean;
  focused: boolean;
  hint?: string;
  accessory?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="group">
      <label
        htmlFor={id}
        className="flex items-center justify-between mb-2"
      >
        <span className="flex items-center gap-2.5 text-[10px] tracking-[0.24em] uppercase">
          <span
            className={`status-dot ${
              filled ? "status-dot-ok" : "status-dot-info"
            }`}
          />
          <span className="text-[var(--foreground)]/85">{label}</span>
        </span>
        {required && (
          <span className="text-[9px] tracking-[0.22em] uppercase text-[var(--muted-2)]">
            [required]
          </span>
        )}
      </label>

      <div className="relative border-b border-[var(--border-strong)] focus-within:border-[var(--accent)] transition-colors flex items-center gap-3">
        {children}
        {accessory && <div className="shrink-0">{accessory}</div>}
      </div>

      {hint && (
        <p className="mt-2 font-mono text-[10px] tracking-[0.1em] text-[var(--muted-2)] flex items-start gap-1.5">
          <span className="text-[var(--accent-dim)]">ⓘ</span>
          <span>{hint}</span>
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function translateError(msg: string): string {
  const lower = msg.toLowerCase();
  if (lower.includes("invalid login")) return "E-posta veya şifre hatalı.";
  if (lower.includes("user already registered"))
    return "Bu e-posta zaten kayıtlı. Giriş yapmayı dene.";
  if (lower.includes("email") && lower.includes("invalid"))
    return "Geçersiz e-posta adresi.";
  if (lower.includes("password") && lower.includes("short"))
    return "Şifre çok kısa, minimum 8 karakter.";
  return msg;
}

function sessionId() {
  // Görsel için sahte session id — gerçek session backend tarafında
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}
