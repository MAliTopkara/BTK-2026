"use client";

import { use, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

import { getDemoScan, type ScanResult } from "@/lib/api";
import { ScanDetailView } from "@/components/scan/ScanDetailView";

// ---------------------------------------------------------------------------
// Fake progress layer slots — 8 saniye görsel drama
// ---------------------------------------------------------------------------

type FakeLayer = { code: string; name: string; delay: number };
const FAKE_LAYERS: FakeLayer[] = [
  { code: "01", name: "Sahte Yorum Tespiti", delay: 800 },
  { code: "02", name: "Sahte İndirim", delay: 1800 },
  { code: "03", name: "Manipülatif Tasarım", delay: 2800 },
  { code: "04", name: "Satıcı Profili", delay: 3600 },
  { code: "05", name: "Görsel Doğrulama", delay: 4800 },
  { code: "06", name: "Çapraz Platform", delay: 6000 },
  { code: "07", name: "Karar Motoru", delay: 7200 },
];

type Phase = "loading" | "scanning" | "done" | "error";

export default function DemoPage({
  params,
}: {
  params: Promise<{ scenario: string }>;
}) {
  const { scenario } = use(params);
  const [phase, setPhase] = useState<Phase>("loading");
  const [scan, setScan] = useState<ScanResult | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const [completedLayers, setCompletedLayers] = useState<Set<number>>(new Set());
  const fetchedRef = useRef(false);

  // 1) Pre-fetch immediately in background (kapıyı çal, sonucu sakla)
  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;

    getDemoScan(scenario)
      .then((data) => setScan(data))
      .catch((err: unknown) => {
        const msg =
          err instanceof Error ? err.message : "Demo yüklenemedi.";
        setErrorMsg(msg);
        setPhase("error");
      });

    // Drama: 8 saniyelik fake scanning
    setPhase("scanning");

    // Layer'ları sırayla aç
    FAKE_LAYERS.forEach((layer, i) => {
      setTimeout(() => {
        setCompletedLayers((prev) => new Set([...prev, i]));
      }, layer.delay);
    });

    // Elapsed timer
    const timer = setInterval(() => {
      setElapsed((s) => s + 100);
    }, 100);

    // 8.2 saniye sonra sonucu göster
    setTimeout(() => {
      clearInterval(timer);
      setPhase("done");
    }, 8200);

    return () => clearInterval(timer);
  }, [scenario]);

  if (phase === "error") {
    return <DemoError message={errorMsg} />;
  }

  if (phase === "done" && scan) {
    return (
      <div className="min-h-screen bg-[var(--background)]">
        <DemoBanner />
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-10 py-8 lg:py-14">
          <ScanDetailView scan={scan} />
        </div>
      </div>
    );
  }

  return <ScanningView elapsed={elapsed} completedLayers={completedLayers} />;
}

// ---------------------------------------------------------------------------
// Scanning view — 8 saniyelik progress
// ---------------------------------------------------------------------------

function ScanningView({
  elapsed,
  completedLayers,
}: {
  elapsed: number;
  completedLayers: Set<number>;
}) {
  const elapsedSec = (elapsed / 1000).toFixed(1);

  return (
    <div className="min-h-screen bg-[var(--background)] flex items-center justify-center px-4">
      <div className="w-full max-w-xl">
        {/* Header */}
        <div className="mb-8">
          <div className="font-mono text-[10px] tracking-[0.32em] uppercase text-[var(--muted)] flex items-center gap-3 mb-4">
            <span className="h-px w-8 bg-[var(--accent)]" />
            <span>TrustLens · demo_scan</span>
            <span className="ml-auto tabular-nums text-[var(--accent)]">{elapsedSec}s</span>
          </div>
          <h2 className="font-serif italic text-[clamp(1.8rem,4vw,2.8rem)] leading-tight text-[var(--foreground)]">
            Analiz ediliyor<span className="text-[var(--accent)]">.</span>
          </h2>
          <p className="font-mono text-[11px] text-[var(--muted)] mt-2 tracking-[0.12em]">
            7 katman paralel çalışıyor — karar motoru bekleniyor
          </p>
        </div>

        {/* Layer list */}
        <div className="border border-[var(--border-strong)] bg-[var(--surface)]/40">
          <div className="flex items-center justify-between px-4 h-9 border-b border-[var(--border-strong)] bg-black/40 font-mono text-[10px] tracking-[0.22em] uppercase text-[var(--muted)]">
            <span>Katmanlar</span>
            <span className="tabular-nums">{completedLayers.size}/{FAKE_LAYERS.length} tamamlandı</span>
          </div>

          <div className="divide-y divide-[var(--border)]">
            {FAKE_LAYERS.map((layer, i) => {
              const done = completedLayers.has(i);
              const analyzing = !done && completedLayers.size === i;
              return (
                <div
                  key={layer.code}
                  className="grid grid-cols-[24px_1fr_80px] gap-3 px-4 py-2.5 items-center"
                >
                  <span className="font-mono text-[10px] text-[var(--muted-2)] tabular-nums">{layer.code}</span>
                  <span className={`font-mono text-[11px] ${done ? "text-[var(--foreground)]" : analyzing ? "text-[var(--accent)]" : "text-[var(--muted-2)]"}`}>
                    {layer.name}
                  </span>
                  <span className="text-right font-mono text-[10px] tracking-[0.14em] uppercase">
                    {done ? (
                      <span className="text-[var(--accent)]">
                        <span className="status-dot status-dot-ok mr-1" />DONE
                      </span>
                    ) : analyzing ? (
                      <span className="text-[var(--yellow)]">
                        <span className="status-dot status-dot-warn live-pulse mr-1" />ANALYZING
                      </span>
                    ) : (
                      <span className="text-[var(--muted-2)]">QUEUED</span>
                    )}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-4 h-[2px] bg-[var(--border-strong)] overflow-hidden">
          <motion.div
            className="h-full bg-[var(--accent)]"
            animate={{ width: `${Math.min((elapsed / 8200) * 100, 100)}%` }}
            transition={{ duration: 0.1, ease: "linear" }}
          />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Demo banner — üstte "bu bir demo" notu
// ---------------------------------------------------------------------------

function DemoBanner() {
  return (
    <div className="border-b border-[var(--accent)]/30 bg-[var(--accent)]/[0.04] px-4 py-2.5">
      <div className="max-w-[1400px] mx-auto flex items-center justify-between gap-4 flex-wrap">
        <p className="font-mono text-[10px] tracking-[0.18em] uppercase text-[var(--accent)]">
          <span className="status-dot status-dot-ok mr-2" />
          Demo modu — pre-cache edilmiş gerçek analiz sonucu
        </p>
        <Link
          href="/"
          className="font-mono text-[10px] tracking-[0.18em] uppercase text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
        >
          ← Ana sayfa
        </Link>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Error state
// ---------------------------------------------------------------------------

function DemoError({ message }: { message: string }) {
  return (
    <div className="min-h-screen bg-[var(--background)] flex items-center justify-center px-4">
      <div className="max-w-md text-center space-y-4">
        <div className="font-mono text-[10px] tracking-[0.32em] uppercase text-[var(--red)] flex items-center justify-center gap-3">
          <span className="status-dot status-dot-risk" />
          <span>demo_error</span>
        </div>
        <h2 className="font-serif italic text-3xl text-[var(--foreground)]">
          Demo yüklenemedi.
        </h2>
        <p className="font-mono text-[12px] text-[var(--muted)]">{message}</p>
        <Link
          href="/"
          className="inline-block mt-4 font-mono text-[11px] tracking-[0.22em] uppercase border border-[var(--border-strong)] px-4 py-2 text-[var(--muted)] hover:text-[var(--foreground)] hover:border-[var(--accent)] transition-colors"
        >
          ← Ana sayfaya dön
        </Link>
      </div>
    </div>
  );
}
