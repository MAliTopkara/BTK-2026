"use client";

import { useEffect, useState } from "react";

import { BehaviorProfileForm } from "@/components/settings/BehaviorProfileForm";
import { ProfileSummary } from "@/components/settings/ProfileSummary";
import {
  type BehaviorProfile,
  clearProfile,
  loadProfile,
} from "@/lib/behavior-profile";

type Mode = "loading" | "view" | "edit";

export default function SettingsPage() {
  const [mode, setMode] = useState<Mode>("loading");
  const [profile, setProfile] = useState<BehaviorProfile | null>(null);

  useEffect(() => {
    const p = loadProfile();
    setProfile(p);
    setMode(p ? "view" : "edit");
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
      {/* Hero */}
      <header className="space-y-4">
        <div className="font-mono text-[10px] tracking-[0.32em] uppercase text-[var(--muted)] flex items-center gap-3">
          <span className="h-px w-8" style={{ background: "var(--blue)" }} />
          <span>01 / Finansal_Profil</span>
        </div>
        <h1 className="font-serif text-[clamp(2.4rem,5vw,4rem)] leading-[0.95] tracking-[-0.02em]">
          Cüzdanın için bir{" "}
          <span className="italic" style={{ color: "var(--blue)" }}>
            ikinci görüş
          </span>
          .
        </h1>
        <p className="text-[14px] text-[var(--muted)] leading-relaxed max-w-xl">
          TrustLens ürünün güvenilir olup olmadığını söyler — ama satın alımın
          aylık bütçene uyup uymadığını söyleyemez. Profilini doldur, her tarama
          sonucunda finansal uyum analizi de göreceksin.
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
