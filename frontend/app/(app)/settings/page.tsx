"use client";

import { useEffect, useState } from "react";

import { BehaviorProfileForm } from "@/components/settings/BehaviorProfileForm";
import { EmailDigestSettings } from "@/components/settings/EmailDigestSettings";
import { ProfileSummary } from "@/components/settings/ProfileSummary";
import { UserProfileForm } from "@/components/settings/UserProfileForm";
import {
  type BehaviorProfile,
  clearProfile,
  loadProfile,
} from "@/lib/behavior-profile";
import { createClient } from "@/lib/supabase/client";

type Mode = "loading" | "view" | "edit";

export default function SettingsPage() {
  const [mode, setMode] = useState<Mode>("loading");
  const [profile, setProfile] = useState<BehaviorProfile | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userMeta, setUserMeta] = useState<{
    firstName: string;
    lastName: string;
    email: string;
  }>({ firstName: "", lastName: "", email: "" });

  useEffect(() => {
    const p = loadProfile();
    setProfile(p);
    setMode(p ? "view" : "edit");

    createClient()
      .auth.getUser()
      .then(({ data }) => {
        if (!data.user) return;
        const meta = data.user.user_metadata ?? {};
        const fullName = (meta.full_name as string | undefined) ?? (meta.name as string | undefined) ?? "";
        const parts = fullName.split(" ");
        setUserMeta({
          firstName:
            (meta.first_name as string | undefined) ??
            (parts.length > 0 ? parts[0] : ""),
          lastName:
            (meta.last_name as string | undefined) ??
            (parts.length > 1 ? parts.slice(1).join(" ") : ""),
          email: data.user.email ?? "",
        });
        if (data.user.email) setUserEmail(data.user.email);
      });
  }, []);

  function handleSaved(p: BehaviorProfile) {
    setProfile(p);
    setMode("view");
  }

  function handleClear() {
    if (!confirm("Finansal profilini silmek istediğine emin misin?")) return;
    clearProfile();
    setProfile(null);
    setMode("edit");
  }

  return (
    <div className="space-y-12 max-w-3xl">
      {/* Section 01: Hesap Bilgileri */}
      <section className="space-y-6">
          <header className="space-y-4">
            <div className="font-mono text-[10px] tracking-[0.32em] uppercase text-[var(--muted)] flex items-center gap-3">
              <span className="h-px w-8" style={{ background: "var(--accent)" }} />
              <span>01 / Hesap_Bilgileri</span>
            </div>
            <h2 className="font-serif text-[clamp(1.8rem,4vw,3rem)] leading-[0.95] tracking-[-0.02em]">
              Profil{" "}
              <span className="italic" style={{ color: "var(--accent)" }}>
                bilgilerin
              </span>
              .
            </h2>
            <p className="text-[14px] text-[var(--muted)] leading-relaxed max-w-xl">
              Ad ve soyad bilgilerin sidebar&apos;da ve karşılama mesajında kullanılır.
              Supabase&apos;e güvenli şekilde kaydedilir.
            </p>
          </header>
          <UserProfileForm
            initialFirstName={userMeta.firstName}
            initialLastName={userMeta.lastName}
            email={userMeta.email}
          />
        </section>

      {/* Section 02: Finansal Profil */}}
      <header className="space-y-4">
        <div className="font-mono text-[10px] tracking-[0.32em] uppercase text-[var(--muted)] flex items-center gap-3">
          <span className="h-px w-8" style={{ background: "var(--blue)" }} />
          <span>02 / Finansal_Profil</span>
        </div>
        <h1 className="font-serif text-[clamp(2.4rem,5vw,4rem)] leading-[0.95] tracking-[-0.02em]">
          Cüzdanın için bir{" "}
          <span className="italic" style={{ color: "var(--blue)" }}>
            ikinci görüş
          </span>
          .
        </h1>
        <p className="text-[14px] text-[var(--muted)] leading-relaxed max-w-xl">
          Finansal profilini buradan yönet. Veriler yalnızca tarayıcının
          localStorage&apos;ında saklanır, sunucuya gönderilmez.
        </p>
      </header>

      {/* Body */}
      {mode === "loading" && <LoadingShell />}

      {mode === "edit" && (
        <BehaviorProfileForm
          initial={profile}
          onSaved={handleSaved}
          onCancel={profile ? () => setMode("view") : undefined}
        />
      )}

      {mode === "view" && profile && (
        <ProfileSummary
          profile={profile}
          onEdit={() => setMode("edit")}
          onClear={handleClear}
        />
      )}

      {/* Footer note */}
      <footer className="border-t border-[var(--border)] pt-6 font-mono text-[10px] tracking-[0.22em] uppercase text-[var(--muted-2)] flex flex-wrap gap-x-6 gap-y-2">
        <span>storage · localStorage</span>
        <span>scope · device-local</span>
        <span>migrate · TASK-48 (Supabase)</span>
      </footer>

      {/* Email Digest Section */}
      {userEmail && (
        <section className="space-y-4">
          <header className="space-y-4">
            <div className="font-mono text-[10px] tracking-[0.32em] uppercase text-[var(--muted)] flex items-center gap-3">
              <span className="h-px w-8" style={{ background: "var(--accent)" }} />
              <span>03 / E-posta_Bildirimleri</span>
            </div>
            <h2 className="font-serif text-[clamp(1.8rem,4vw,3rem)] leading-[0.95] tracking-[-0.02em]">
              Haftalık{" "}
              <span className="italic" style={{ color: "var(--accent)" }}>
                güven özeti
              </span>
              .
            </h2>
            <p className="text-[14px] text-[var(--muted)] leading-relaxed max-w-xl">
              Her Pazartesi, geçen haftanın tarama istatistikleri ve en riskli
              ürün bilgisi e-postanla sana gelsin.
            </p>
          </header>

          <EmailDigestSettings userEmail={userEmail} />

          <footer className="border-t border-[var(--border)] pt-6 font-mono text-[10px] tracking-[0.22em] uppercase text-[var(--muted-2)] flex flex-wrap gap-x-6 gap-y-2">
            <span>provider · Resend</span>
            <span>frequency · weekly</span>
            <span>unsubscribe · one-click</span>
          </footer>
        </section>
      )}
    </div>
  );
}

function LoadingShell() {
  return (
    <div className="border border-[var(--border-strong)] bg-[var(--surface)]/40 p-8 font-mono text-[12px] text-[var(--muted)] animate-pulse">
      Profil yükleniyor…
    </div>
  );
}
