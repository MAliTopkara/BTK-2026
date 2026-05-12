"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

import { CompareView } from "@/components/compare/CompareView";
import { ComparePicker } from "@/components/compare/ComparePicker";
import type { ScanResult } from "@/lib/api";
import { loadScanById } from "@/lib/scan-loader";

type State =
  | { phase: "loading" }
  | { phase: "needs_picker"; reason?: string }
  | { phase: "ready"; a: ScanResult; b: ScanResult };

export default function ComparePageWrapper() {
  return (
    <Suspense fallback={<LoadingShell />}>
      <ComparePage />
    </Suspense>
  );
}

function ComparePage() {
  const searchParams = useSearchParams();
  const a = searchParams.get("a");
  const b = searchParams.get("b");
  const [state, setState] = useState<State>({ phase: "loading" });

  useEffect(() => {
    if (!a || !b) {
      setState({ phase: "needs_picker" });
      return;
    }
    if (a === b) {
      setState({
        phase: "needs_picker",
        reason: "iki taraf aynı seçilmiş — farklı seç",
      });
      return;
    }

    let cancelled = false;
    setState({ phase: "loading" });

    Promise.all([loadScanById(a), loadScanById(b)])
      .then(([scanA, scanB]) => {
        if (cancelled) return;
        if (!scanA || !scanB) {
          const missing: string[] = [];
          if (!scanA) missing.push(`A (${a})`);
          if (!scanB) missing.push(`B (${b})`);
          setState({
            phase: "needs_picker",
            reason: `bulunamadı: ${missing.join(", ")} — sessionStorage süresi dolmuş veya demo bilinmiyor`,
          });
          return;
        }
        setState({ phase: "ready", a: scanA, b: scanB });
      })
      .catch(() => {
        if (cancelled) return;
        setState({
          phase: "needs_picker",
          reason: "yükleme hatası — backend çalışıyor mu?",
        });
      });

    return () => {
      cancelled = true;
    };
  }, [a, b]);

  if (state.phase === "loading") return <LoadingShell />;
  if (state.phase === "needs_picker") {
    return (
      <ComparePicker
        initialA={a ?? undefined}
        initialB={b ?? undefined}
        reason={state.reason}
      />
    );
  }
  return <CompareView a={state.a} b={state.b} />;
}

function LoadingShell() {
  return (
    <div className="space-y-8 max-w-4xl animate-pulse">
      <div className="font-mono text-[10px] tracking-[0.32em] uppercase text-[var(--muted)] flex items-center gap-3">
        <span className="h-px w-8 bg-[var(--accent)]" />
        <span>karşılaştırma yükleniyor…</span>
      </div>
      <div className="grid lg:grid-cols-[1fr_140px_1fr] gap-6">
        <div className="h-48 bg-[var(--border-strong)]/40" />
        <div className="h-48 bg-[var(--border-strong)]/30" />
        <div className="h-48 bg-[var(--border-strong)]/40" />
      </div>
    </div>
  );
}
