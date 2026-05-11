"use client";

import { use, useEffect, useState } from "react";

import { ScanDetailView } from "@/components/scan/ScanDetailView";
import { ScanNotFound } from "@/components/scan/ScanNotFound";
import type { ScanResult } from "@/lib/api";
import { loadScanFromCache } from "@/lib/scan-cache";

type State =
  | { phase: "loading" }
  | { phase: "found"; scan: ScanResult }
  | { phase: "not_found" };

export default function ScanDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [state, setState] = useState<State>({ phase: "loading" });

  useEffect(() => {
    const cached = loadScanFromCache(id);
    setState(cached ? { phase: "found", scan: cached } : { phase: "not_found" });
  }, [id]);

  if (state.phase === "loading") return <LoadingState />;
  if (state.phase === "not_found") return <ScanNotFound id={id} />;
  return <ScanDetailView scan={state.scan} />;
}

function LoadingState() {
  return (
    <div className="space-y-12 animate-pulse">
      <div className="font-mono text-[10px] tracking-[0.32em] uppercase text-[var(--muted)] flex items-center gap-3">
        <span className="h-px w-8 bg-[var(--accent)]" />
        <span>loading_scan…</span>
      </div>
      <div className="grid lg:grid-cols-12 gap-10 items-start">
        <div className="lg:col-span-7 space-y-4">
          <div className="h-12 bg-[var(--border-strong)]/40 w-3/4" />
          <div className="h-4 bg-[var(--border-strong)]/30 w-1/2" />
          <div className="h-4 bg-[var(--border-strong)]/30 w-2/3 mt-8" />
          <div className="h-4 bg-[var(--border-strong)]/30 w-1/3" />
        </div>
        <div className="lg:col-span-5 flex justify-center">
          <div className="w-60 h-60 rounded-full border-2 border-[var(--border-strong)]/40" />
        </div>
      </div>
    </div>
  );
}
