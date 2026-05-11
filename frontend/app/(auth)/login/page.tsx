import type { Metadata } from "next";
import { Suspense } from "react";

import { AuthForm } from "@/components/auth/AuthForm";
import { AuthShell } from "@/components/auth/AuthShell";

export const metadata: Metadata = {
  title: "Giriş Yap — TrustLens AI",
  description: "TrustLens hesabına giriş yap, tarama geçmişine eriş.",
};

export default function LoginPage() {
  return (
    <AuthShell
      step="01"
      eyebrow="Erişim"
      title={
        <>
          Hoşgeldin{" "}
          <span className="italic text-[var(--accent)]">geri</span>.
        </>
      }
      intro={
        <>
          <p className="mb-4">
            Terminal&apos;e erişmek için kimliğini doğrula. Tarama geçmişin,
            kaydettiğin dilekçeler ve katman çıktıların burada bekliyor.
          </p>
          <p className="text-[12px] text-[var(--muted-2)] leading-relaxed">
            Henüz hesabın yoksa{" "}
            <span className="font-mono text-[var(--foreground)]">kayıt_ol</span>{" "}
            yeterli — yalnızca e-posta ve şifre.
          </p>
        </>
      }
      switchHref="/register"
      switchLabel="Hesabın yok mu?"
      switchCta="Kayıt_ol"
    >
      <Suspense fallback={<AuthFormSkeleton panel="LOGIN_TERMINAL" />}>
        <AuthForm mode="login" />
      </Suspense>
    </AuthShell>
  );
}

function AuthFormSkeleton({ panel }: { panel: string }) {
  return (
    <div className="corner-frame relative bg-[var(--surface)] border border-[var(--border-strong)] font-mono text-[12px] min-h-[420px]">
      <span className="c-tr" />
      <span className="c-bl" />
      <div className="flex items-center justify-between px-4 h-9 border-b border-[var(--border-strong)] bg-black/40">
        <div className="flex items-center gap-2.5 text-[10px] tracking-[0.22em] uppercase text-[var(--muted)]">
          <span className="status-dot status-dot-info" />
          <span>{panel}</span>
        </div>
        <span className="text-[10px] tracking-[0.18em] uppercase text-[var(--muted-2)]">
          loading
        </span>
      </div>
    </div>
  );
}
