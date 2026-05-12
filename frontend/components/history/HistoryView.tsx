"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import type { Verdict } from "@/lib/api";
import {
  getAllScans,
  removeScan,
  type RecentScanEntry,
} from "@/lib/scan-cache";

type Filter = "ALL" | Verdict;

const PAGE_SIZE = 20;

const FILTER_LABELS: Record<Filter, string> = {
  ALL: "Tümü",
  BUY: "AL",
  CAUTION: "Dikkatli",
  AVOID: "Alma",
};

const FILTER_DOT: Record<Filter, string> = {
  ALL: "status-dot-info",
  BUY: "status-dot-ok",
  CAUTION: "status-dot-warn",
  AVOID: "status-dot-risk",
};

const VERDICT_TR: Record<Verdict, string> = {
  BUY: "AL",
  CAUTION: "DİKKATLİ OL",
  AVOID: "ALMA",
};

const VERDICT_TONE: Record<Verdict, string> = {
  BUY: "text-[var(--accent)]",
  CAUTION: "text-[var(--yellow)]",
  AVOID: "text-[var(--red)]",
};

const VERDICT_DOT: Record<Verdict, string> = {
  BUY: "status-dot-ok",
  CAUTION: "status-dot-warn",
  AVOID: "status-dot-risk",
};

export function HistoryView() {
  const [scans, setScans] = useState<RecentScanEntry[]>([]);
  const [filter, setFilter] = useState<Filter>("ALL");
  const [page, setPage] = useState(0);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setScans(getAllScans());
    setHydrated(true);
  }, []);

  const counts = useMemo(() => {
    const c: Record<Filter, number> = { ALL: 0, BUY: 0, CAUTION: 0, AVOID: 0 };
    c.ALL = scans.length;
    for (const s of scans) c[s.verdict] += 1;
    return c;
  }, [scans]);

  const filtered = useMemo(() => {
    return filter === "ALL" ? scans : scans.filter((s) => s.verdict === filter);
  }, [scans, filter]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const pageItems = filtered.slice(
    safePage * PAGE_SIZE,
    safePage * PAGE_SIZE + PAGE_SIZE,
  );

  function handleDelete(entry: RecentScanEntry) {
    removeScan(entry.scan_id);
    setScans(getAllScans());
    toast.success("Tarama silindi", {
      description: entry.title?.slice(0, 60) || entry.url.slice(0, 60),
    });
  }

  function selectFilter(f: Filter) {
    setFilter(f);
    setPage(0);
  }

  return (
    <div className="space-y-10">
      {/* Hero */}
      <header className="space-y-4 max-w-3xl">
        <div className="font-mono text-[10px] tracking-[0.32em] uppercase text-[var(--muted)] flex items-center gap-3">
          <span className="h-px w-8 bg-[var(--accent)]" />
          <span>HISTORY · session_log</span>
        </div>
        <h1 className="font-serif text-[clamp(2.4rem,5vw,4rem)] leading-[0.95] tracking-[-0.02em]">
          Tüm{" "}
          <span className="italic text-[var(--accent)]">taramaların</span>,
          tek yerde.
        </h1>
        <p className="text-[14px] text-[var(--muted)] leading-relaxed max-w-xl">
          Bu oturumda yaptığın taramalar burada görünür. Verdict'e göre filtrele,
          tek tek detaya in, ya da sil.
        </p>
        <p className="font-mono text-[10px] tracking-[0.18em] uppercase text-[var(--muted-2)]">
          v0.1 · sessionStorage tabanlı — TASK-30 sonraki pass'te Supabase
          tablosuna taşınacak.
        </p>
      </header>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {(["ALL", "BUY", "CAUTION", "AVOID"] as Filter[]).map((f) => {
          const isActive = f === filter;
          return (
            <button
              key={f}
              type="button"
              onClick={() => selectFilter(f)}
              className={`group flex items-center gap-2.5 px-4 py-2 border font-mono text-[11px] tracking-[0.22em] uppercase transition-colors ${
                isActive
                  ? "border-[var(--accent)] bg-[var(--accent)]/[0.08] text-[var(--accent)]"
                  : "border-[var(--border-strong)] text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface)]/50"
              }`}
            >
              <span className={`status-dot ${FILTER_DOT[f]}`} />
              <span>{FILTER_LABELS[f]}</span>
              <span className="text-[var(--muted-2)] tabular-nums">
                {counts[f]}
              </span>
            </button>
          );
        })}
      </div>

      {/* List */}
      {!hydrated ? (
        <ListSkeleton />
      ) : filtered.length === 0 ? (
        <EmptyState filter={filter} hasAnyScans={scans.length > 0} />
      ) : (
        <>
          <div className="corner-frame relative bg-[var(--surface)]/30 border border-[var(--border-strong)]">
            <span className="c-tr" />
            <span className="c-bl" />

            <div className="flex items-center justify-between px-4 h-9 border-b border-[var(--border-strong)] bg-black/40 font-mono text-[10px] tracking-[0.22em] uppercase">
              <span className="text-[var(--muted)]">
                {filtered.length} kayıt
              </span>
              <span className="text-[var(--muted-2)] tabular-nums">
                sayfa {safePage + 1}/{pageCount}
              </span>
            </div>

            <ul>
              {pageItems.map((s, i) => (
                <li
                  key={s.scan_id}
                  className={`grid grid-cols-[auto_1fr_auto_auto] gap-3 sm:gap-4 items-center px-4 py-3 font-mono ${
                    i !== pageItems.length - 1
                      ? "border-b border-[var(--border)]"
                      : ""
                  } hover:bg-[var(--surface)]/40 transition-colors`}
                >
                  {/* Verdict tag */}
                  <Link
                    href={`/scan/${s.scan_id}`}
                    className="flex items-center gap-2 shrink-0"
                  >
                    <span className={`status-dot ${VERDICT_DOT[s.verdict]}`} />
                    <span
                      className={`text-[10px] tracking-[0.22em] uppercase w-16 sm:w-20 ${VERDICT_TONE[s.verdict]}`}
                    >
                      {VERDICT_TR[s.verdict]}
                    </span>
                  </Link>

                  {/* Title + URL */}
                  <Link
                    href={`/scan/${s.scan_id}`}
                    className="min-w-0 block group"
                  >
                    <span className="block font-serif italic text-[15px] sm:text-[16px] text-[var(--foreground)] truncate group-hover:text-[var(--accent)] transition-colors">
                      {s.title || "Bilinmeyen ürün"}
                    </span>
                    <span className="block font-mono text-[10px] text-[var(--muted-2)] truncate mt-0.5">
                      {s.url}
                    </span>
                  </Link>

                  {/* Score + relative time */}
                  <Link
                    href={`/scan/${s.scan_id}`}
                    className="text-right shrink-0 hidden sm:block"
                  >
                    <span
                      className={`tabular-nums text-[14px] ${VERDICT_TONE[s.verdict]}`}
                    >
                      {s.overall_score}
                      <span className="text-[var(--muted-2)] text-[10px] ml-0.5">
                        /100
                      </span>
                    </span>
                    <span className="block text-[9px] tracking-[0.18em] uppercase text-[var(--muted-2)] mt-0.5">
                      {formatRelative(s.created_at)}
                    </span>
                  </Link>

                  {/* Delete */}
                  <button
                    type="button"
                    onClick={() => handleDelete(s)}
                    aria-label={`Sil: ${s.title || s.url}`}
                    className="text-[var(--muted-2)] hover:text-[var(--red)] text-[10px] tracking-[0.22em] uppercase shrink-0 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                  >
                    sil
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Pagination */}
          {pageCount > 1 && (
            <div className="flex items-center justify-between font-mono text-[10px] tracking-[0.22em] uppercase text-[var(--muted)]">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={safePage === 0}
                className="flex items-center gap-2 hover:text-[var(--accent)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                ← önceki
              </button>
              <span className="text-[var(--muted-2)] tabular-nums">
                {safePage * PAGE_SIZE + 1}-
                {Math.min(filtered.length, (safePage + 1) * PAGE_SIZE)} / {filtered.length}
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
                disabled={safePage >= pageCount - 1}
                className="flex items-center gap-2 hover:text-[var(--accent)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                sonraki →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ===========================================================================
// Sub-components
// ===========================================================================

function EmptyState({
  filter,
  hasAnyScans,
}: {
  filter: Filter;
  hasAnyScans: boolean;
}) {
  const message =
    !hasAnyScans
      ? "Henüz tarama yapmamışsın. Dashboard'tan başla."
      : `Bu filtreyle eşleşen tarama yok (${FILTER_LABELS[filter]}).`;
  return (
    <div className="corner-frame relative bg-[var(--surface)]/30 border border-[var(--border-strong)] p-10 lg:p-14">
      <span className="c-tr" />
      <span className="c-bl" />
      <div className="max-w-md space-y-4">
        <div className="font-mono text-[10px] tracking-[0.32em] uppercase text-[var(--muted)] flex items-center gap-3">
          <span className="h-px w-8 bg-[var(--muted-2)]" />
          <span>empty_state</span>
        </div>
        <h2 className="font-serif text-[clamp(1.6rem,3vw,2.2rem)] leading-tight italic text-[var(--foreground)]">
          {message}
        </h2>
        {!hasAnyScans && (
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-3 bg-[var(--accent)] hover:bg-[var(--accent-dim)] text-black px-5 py-3 font-mono text-[11px] tracking-[0.24em] uppercase transition-colors"
          >
            <span className="text-black/70">{">"}</span>
            <span>Yeni_tarama_başlat</span>
            <span className="font-sans">→</span>
          </Link>
        )}
      </div>
    </div>
  );
}

function ListSkeleton() {
  return (
    <div className="border border-[var(--border-strong)] bg-[var(--surface)]/30 animate-pulse">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className={`grid grid-cols-[80px_1fr_80px] gap-4 items-center px-4 py-3 ${
            i !== 4 ? "border-b border-[var(--border)]" : ""
          }`}
        >
          <div className="h-3 bg-[var(--border-strong)]/40 w-16" />
          <div className="space-y-2">
            <div className="h-3 bg-[var(--border-strong)]/40 w-3/4" />
            <div className="h-2 bg-[var(--border-strong)]/30 w-1/2" />
          </div>
          <div className="h-3 bg-[var(--border-strong)]/40 w-10 justify-self-end" />
        </div>
      ))}
    </div>
  );
}

// ===========================================================================
// Helpers
// ===========================================================================

function formatRelative(iso: string): string {
  try {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60_000);
    if (mins < 1) return "az önce";
    if (mins < 60) return `${mins} dk`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs} sa`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days} g`;
    const weeks = Math.floor(days / 7);
    if (weeks < 5) return `${weeks} hf`;
    const months = Math.floor(days / 30);
    return `${months} ay`;
  } catch {
    return "";
  }
}
