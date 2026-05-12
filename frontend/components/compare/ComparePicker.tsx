"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import {
  DEMO_SCENARIOS,
  formatScanRef,
  type ScanRefKind,
} from "@/lib/scan-loader";
import { getRecentScans, type RecentScanEntry } from "@/lib/scan-cache";
import type { Verdict } from "@/lib/api";

const DEMO_LABELS: Record<string, { label: string; verdict: Verdict; score: number }> = {
  airpods_fake: { label: "Apple AirPods Pro 2 — sahte indirim", verdict: "AVOID", score: 34 },
  watch_genuine: { label: "Casio G-Shock — gerçek indirim", verdict: "BUY", score: 87 },
  laptop_suspicious: { label: "Xiaomi RedmiBook — şüpheli pump", verdict: "CAUTION", score: 58 },
  phishing_sms: { label: "Sahte Apple promosyonu — phishing SMS", verdict: "AVOID", score: 8 },
};

const VERDICT_TONE: Record<Verdict, string> = {
  BUY: "var(--accent)",
  CAUTION: "var(--yellow)",
  AVOID: "var(--red)",
};

const VERDICT_DOT: Record<Verdict, string> = {
  BUY: "status-dot-ok",
  CAUTION: "status-dot-warn",
  AVOID: "status-dot-risk",
};

type Slot = { kind: ScanRefKind; key: string; label: string; verdict?: Verdict; score?: number };

type Props = {
  initialA?: string;
  initialB?: string;
  reason?: string;
};

export function ComparePicker({ initialA, initialB, reason }: Props) {
  const router = useRouter();
  const [recents, setRecents] = useState<RecentScanEntry[]>([]);
  const [aSlot, setASlot] = useState<Slot | null>(null);
  const [bSlot, setBSlot] = useState<Slot | null>(null);

  useEffect(() => {
    setRecents(getRecentScans(8));
    if (initialA) setASlot(initialSlotFromId(initialA));
    if (initialB) setBSlot(initialSlotFromId(initialB));
  }, [initialA, initialB]);

  const ready = aSlot && bSlot && aSlot.key !== bSlot.key;

  function pick(slotName: "A" | "B", slot: Slot) {
    if (slotName === "A") setASlot(slot);
    else setBSlot(slot);
  }

  function startCompare() {
    if (!aSlot || !bSlot) return;
    const a = formatScanRef(aSlot.kind, aSlot.key);
    const b = formatScanRef(bSlot.kind, bSlot.key);
    router.push(`/compare?a=${encodeURIComponent(a)}&b=${encodeURIComponent(b)}`);
  }

  return (
    <div className="space-y-12 max-w-5xl">
      {/* Hero */}
      <header className="space-y-4">
        <div className="font-mono text-[10px] tracking-[0.32em] uppercase text-[var(--muted)] flex items-center gap-3">
          <span className="h-px w-8 bg-[var(--accent)]" />
          <span>04 / KARŞILAŞTIRMA · seçim</span>
        </div>
        <h1 className="font-serif text-[clamp(2.4rem,5vw,4rem)] leading-[0.95] tracking-[-0.02em]">
          İki tarama{" "}
          <span className="italic text-[var(--accent)]">seç</span>.
        </h1>
        {reason && (
          <p className="text-[13px] text-[var(--yellow)] font-mono tracking-[0.18em] uppercase">
            ⓘ {reason}
          </p>
        )}
        <p className="text-[14px] text-[var(--muted)] leading-relaxed max-w-2xl">
          Demo senaryoları veya kendi son taramaların. Aynı taramayı iki tarafa
          koyamazsın — yeni tarama yapmak için <a href="/dashboard" className="text-[var(--accent)] hover:underline">/dashboard</a>&apos;a git.
        </p>
      </header>

      {/* Slots */}
      <section className="grid sm:grid-cols-2 gap-4">
        <SlotCard
          side="A"
          slot={aSlot}
          onClear={() => setASlot(null)}
        />
        <SlotCard
          side="B"
          slot={bSlot}
          onClear={() => setBSlot(null)}
        />
      </section>

      {/* Picker tabs */}
      <section className="space-y-8">
        {/* Demo scenarios */}
        <div>
          <div className="font-mono text-[10px] tracking-[0.28em] uppercase text-[var(--muted-2)] mb-3 flex items-center gap-2">
            <span className="h-px w-6 bg-[var(--muted-2)]" />
            <span>demo senaryoları · 4</span>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            {DEMO_SCENARIOS.map((s) => {
              const meta = DEMO_LABELS[s];
              const slot: Slot = {
                kind: "demo",
                key: s,
                label: meta?.label ?? s,
                verdict: meta?.verdict,
                score: meta?.score,
              };
              return (
                <PickRow
                  key={s}
                  slot={slot}
                  selected={aSlot?.key === s || bSlot?.key === s}
                  selectedAs={aSlot?.key === s ? "A" : bSlot?.key === s ? "B" : null}
                  onPick={pick}
                  primary={s.replace(/_/g, "/")}
                />
              );
            })}
          </div>
        </div>

        {/* Recent scans */}
        <div>
          <div className="font-mono text-[10px] tracking-[0.28em] uppercase text-[var(--muted-2)] mb-3 flex items-center gap-2">
            <span className="h-px w-6 bg-[var(--muted-2)]" />
            <span>son taramaların · {recents.length}</span>
          </div>
          {recents.length === 0 ? (
            <div className="border border-dashed border-[var(--border-strong)] bg-[var(--surface)]/30 px-5 py-6 text-[12px] text-[var(--muted)] font-mono">
              Henüz tarama yapmadın.{" "}
              <a href="/dashboard" className="text-[var(--accent)] hover:underline">
                /dashboard
              </a>{" "}
              üzerinden bir tarama yap, sonra burada listelenir.
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-3">
              {recents.map((r) => {
                const slot: Slot = {
                  kind: "session",
                  key: r.scan_id,
                  label: r.title,
                  verdict: r.verdict,
                  score: r.overall_score,
                };
                return (
                  <PickRow
                    key={r.scan_id}
                    slot={slot}
                    selected={aSlot?.key === r.scan_id || bSlot?.key === r.scan_id}
                    selectedAs={aSlot?.key === r.scan_id ? "A" : bSlot?.key === r.scan_id ? "B" : null}
                    onPick={pick}
                    primary={`scan/${r.scan_id.slice(0, 8)}`}
                  />
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* CTA */}
      <section className="pt-6 border-t border-[var(--border-strong)]">
        <button
          type="button"
          disabled={!ready}
          onClick={startCompare}
          className="group w-full bg-[var(--accent)] hover:bg-[var(--accent-dim)] text-black px-5 py-4 font-mono text-[11px] tracking-[0.24em] uppercase transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-between"
        >
          <span className="flex items-center gap-3">
            <span className="text-black/70">{">"}</span>
            <span>Karşılaştırmayı_başlat</span>
          </span>
          <span className="font-sans transition-transform group-hover:translate-x-0.5">
            →
          </span>
        </button>
        {!ready && (
          <p className="mt-3 text-[10px] tracking-[0.22em] uppercase text-[var(--muted-2)]">
            {!aSlot && !bSlot
              ? "iki tarama seç"
              : !aSlot
                ? "a tarafı boş"
                : !bSlot
                  ? "b tarafı boş"
                  : "ikisi aynı — farklı seç"}
          </p>
        )}
      </section>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────

function SlotCard({
  side,
  slot,
  onClear,
}: {
  side: "A" | "B";
  slot: Slot | null;
  onClear: () => void;
}) {
  const tone = slot?.verdict ? VERDICT_TONE[slot.verdict] : "var(--border-strong)";
  return (
    <div
      className="corner-frame relative bg-[var(--surface)]/40 border p-5 lg:p-6 min-h-[170px] flex flex-col"
      style={{
        borderColor: slot ? `${tone}66` : "var(--border-strong)",
      }}
    >
      <span className="c-tr" />
      <span className="c-bl" />

      <div className="flex items-center justify-between mb-4">
        <div className="flex items-baseline gap-3">
          <span
            className="font-serif italic text-[44px] leading-none"
            style={{ color: slot ? tone : "var(--muted-2)" }}
          >
            {side}
          </span>
          <span className="font-mono text-[10px] tracking-[0.22em] uppercase text-[var(--muted-2)]">
            {slot ? slot.kind : "boş"}
          </span>
        </div>
        {slot && (
          <button
            type="button"
            onClick={onClear}
            className="text-[var(--muted)] hover:text-[var(--red)] text-[10px] tracking-[0.22em] uppercase transition-colors"
          >
            kaldır ×
          </button>
        )}
      </div>

      {slot ? (
        <div className="space-y-2">
          <div
            className="font-serif italic text-[16px] leading-tight text-[var(--foreground)]"
            style={{
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {slot.label}
          </div>
          {slot.verdict && slot.score !== undefined && (
            <div className="font-mono text-[10px] tracking-[0.22em] uppercase">
              <span style={{ color: tone }}>
                {slot.verdict}
              </span>
              <span className="text-[var(--muted-2)] mx-2">·</span>
              <span className="text-[var(--foreground)] tabular-nums">
                {slot.score}/100
              </span>
            </div>
          )}
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-[var(--muted-2)] font-mono text-[11px] tracking-[0.22em] uppercase border border-dashed border-[var(--border-strong)] rounded-none">
          aşağıdan seç ↓
        </div>
      )}
    </div>
  );
}

function PickRow({
  slot,
  selected,
  selectedAs,
  onPick,
  primary,
}: {
  slot: Slot;
  selected: boolean;
  selectedAs: "A" | "B" | null;
  onPick: (side: "A" | "B", slot: Slot) => void;
  primary: string;
}) {
  const tone = slot.verdict ? VERDICT_TONE[slot.verdict] : "var(--muted-2)";
  return (
    <div
      className="border bg-[var(--surface)]/40 px-4 py-3 flex items-center justify-between gap-3 transition-colors"
      style={{
        borderColor: selected ? `${tone}66` : "var(--border-strong)",
      }}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 mb-1 font-mono text-[10px] tracking-[0.22em] uppercase text-[var(--muted-2)]">
          {slot.verdict && (
            <span className={`status-dot ${VERDICT_DOT[slot.verdict]}`} />
          )}
          <span>{primary}</span>
          {slot.score !== undefined && (
            <>
              <span className="text-[var(--muted-2)]">·</span>
              <span style={{ color: tone }} className="tabular-nums">
                {slot.score}/100
              </span>
            </>
          )}
        </div>
        <div
          className="text-[12px] text-[var(--foreground)]/85 truncate"
          title={slot.label}
        >
          {slot.label}
        </div>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        <PickBtn label="A" active={selectedAs === "A"} onClick={() => onPick("A", slot)} />
        <PickBtn label="B" active={selectedAs === "B"} onClick={() => onPick("B", slot)} />
      </div>
    </div>
  );
}

function PickBtn({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`w-9 h-9 font-mono text-[11px] tracking-[0.18em] uppercase transition-colors border ${
        active
          ? "bg-[var(--accent)] border-[var(--accent)] text-black"
          : "bg-transparent border-[var(--border-strong)] text-[var(--muted)] hover:text-[var(--foreground)] hover:border-[var(--foreground)]"
      }`}
    >
      {label}
    </button>
  );
}

function initialSlotFromId(id: string): Slot {
  if (id.startsWith("scan:")) {
    return { kind: "session", key: id.slice(5), label: `scan/${id.slice(5, 13)}` };
  }
  const meta = DEMO_LABELS[id];
  return {
    kind: "demo",
    key: id,
    label: meta?.label ?? id,
    verdict: meta?.verdict,
    score: meta?.score,
  };
}
