import type { Metadata } from "next";
import { Suspense } from "react";

import { AuthForm } from "@/components/auth/AuthForm";
import { AuthShell } from "@/components/auth/AuthShell";

export const metadata: Metadata = {
  title: "Kayıt Ol — TrustLens AI",
  description: "TrustLens hesabı aç, tarama geçmişini sakla.",
};

export default function RegisterPage() {
  return (
    <AuthShell
      step="02"
      eyebrow="Hesap_aç"
      title={
        <>
          Hesap aç.
          <br />
          Tara.{" "}
          <span className="italic text-[var(--accent)]">Paylaş</span>.
        </>
      }
      intro={
        <>
          <p className="mb-4">
            TrustLens hesabı aç; tarama geçmişin, dilekçelerin ve katman
            çıktıların sana özel olarak saklansın.
          </p>
          <p className="text-[12px] text-[var(--muted-2)] leading-relaxed">
            Yalnızca e-posta ve şifre. Kart bilgisi yok, kayıt ücretsiz,
            kimliğin senin elinde.
          </p>
        </>
      }
      switchHref="/login"
      switchLabel="Zaten hesabın var mı?"
      switchCta="Giriş_yap"
    >
      <Suspense fallback={<AuthFormSkeleton panel="REGISTER_TERMINAL" />}>
        <AuthForm mode="register" />
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
