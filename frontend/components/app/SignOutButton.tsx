"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { createClient } from "@/lib/supabase/client";

export function SignOutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleSignOut() {
    setLoading(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleSignOut}
      disabled={loading}
      className="font-mono text-[10px] tracking-[0.22em] uppercase text-[var(--muted)] hover:text-[var(--red)] transition-colors disabled:opacity-50 inline-flex items-center gap-2"
      aria-label="Çıkış yap"
    >
      <span>{loading ? "çıkılıyor" : "çıkış"}</span>
      <span className="text-[var(--muted-2)]">→</span>
    </button>
  );
}
