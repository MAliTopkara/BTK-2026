"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { toast } from "sonner";

import {
  ApiError,
  DEMO_SCENARIOS,
  postScan,
  type LayerStatus,
  type ScanResult,
  type Verdict,
} from "@/lib/api";
import { loadProfile } from "@/lib/behavior-profile";
import {
  getRecentScans,
  saveScanToCache,
  type RecentScanEntry,
} from "@/lib/scan-cache";

type Phase = "idle" | "scanning" | "complete" | "error";

type LayerSlot = {
  id: string;
  code: string;
  name: string;
  status: LayerStatus | "QUEUED" | "ANALYZING" | "PENDING_BUILD";
  score: number | null;
  finding: string;
  task?: string;
};

// PENDING_BUILD = bu katman normal ürün taramasında çalışmaz.
// Phishing ayrı endpoint (/api/scan/phishing) — görsel yükleme gerekir;
// /phishing sayfasında aktif (TASK-31 hayata geçti). Burada bilgi amaçlı listelenir.
const INITIAL_LAYERS: LayerSlot[] = [
  { id: "review", code: "01", name: "Sahte Yorum Tespiti", status: "QUEUED", score: null, finding: "" },
  { id: "discount", code: "02", name: "Sahte İndirim", status: "QUEUED", score: null, finding: "" },
  { id: "manipulation", code: "03", name: "Manipülatif Tasarım", status: "QUEUED", score: null, finding: "" },
  { id: "seller", code: "04", name: "Satıcı Profili", status: "QUEUED", score: null, finding: "" },
  { id: "visual", code: "05", name: "Görsel Doğrulama", status: "QUEUED", score: null, finding: "" },
  { id: "crossplatform", code: "06", name: "Çapraz Platform", status: "QUEUED", score: null, finding: "" },
  { id: "phishing", code: "07", name: "Phishing Tarama", status: "PENDING_BUILD", score: null, finding: "Görsel yükleme ile aktif", task: "→ /phishing" },
];

const STATUS_TEXT: Record<LayerSlot["status"], string> = {
  QUEUED: "QUEUED",
  ANALYZING: "ANALYZING",
  PENDING_BUILD: "PENDING",
  RISK: "RISK",
  WARN: "WARN",
  OK: "OK",
  INFO: "INFO",
};

const STATUS_DOT: Record<LayerSlot["status"], string> = {
  QUEUED: "status-dot-info",
  ANALYZING: "status-dot-warn",
  PENDING_BUILD: "status-dot-info",
  RISK: "status-dot-risk",
  WARN: "status-dot-warn",
  OK: "status-dot-ok",
  INFO: "status-dot-info",
};

const STATUS_TEXT_COLOR: Record<LayerSlot["status"], string> = {
  QUEUED: "text-[var(--muted-2)]",
  ANALYZING: "text-[var(--yellow)]",
  PENDING_BUILD: "text-[var(--muted-2)]",
  RISK: "text-[var(--red)]",
  WARN: "text-[var(--yellow)]",
  OK: "text-[var(--accent)]",
  INFO: "text-[var(--muted)]",
};

const VERDICT_TR: Record<Verdict, string> = {
  BUY: "AL",
  CAUTION: "DİKKATLİ OL",
  AVOID: "ALMA",
};

const VERDICT_DOT: Record<Verdict, string> = {
  BUY: "status-dot-ok",
  CAUTION: "status-dot-warn",
  AVOID: "status-dot-risk",
};

const VERDICT_TONE: Record<Verdict, string> = {
  BUY: "text-[var(--accent)]",
  CAUTION: "text-[var(--yellow)]",
  AVOID: "text-[var(--red)]",
};

export function ScanLauncher({ initialUrl }: { initialUrl?: string } = {}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inputId = useId();

  const [url, setUrl] = useState(initialUrl ?? "");

  // searchParams'tan "url" parametresi varsa input'u doldur (landing'den prefill)
  useEffect(() => {
    const param = searchParams.get("url");
    if (param) setUrl(decodeURIComponent(param));
  }, [searchParams]);
  const [phase, setPhase] = useState<Phase>("idle");
  const [layers, setLayers] = useState<LayerSlot[]>(INITIAL_LAYERS);
  const [elapsed, setElapsed] = useState(0);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [recentScans, setRecentScans] = useState<RecentScanEntry[]>([]);
  const [hasProfile, setHasProfile] = useState<boolean | null>(null);

  const tickerRef = useRef<NodeJS.Timeout | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Son taramalar — sessionStorage'tan (TASK-30'da DB'den gelecek)
  useEffect(() => {
    setRecentScans(getRecentScans(3));
  }, [phase]);

  // Finansal profil var mı? (TASK-37 — banner için)
  useEffect(() => {
    setHasProfile(loadProfile() !== null);
  }, []);

  // Elapsed timer + progressive layer reveal during scan
  useEffect(() => {
    if (phase !== "scanning") return;
    const start = Date.now();
    tickerRef.current = setInterval(() => {
      const ms = Date.now() - start;
      setElapsed(ms);

      // Her 900ms'de bir sıradaki QUEUED layer'ı ANALYZING yap.
      // PENDING_BUILD layer'ları (TASK-21..23) atlanır.
      const tick = Math.floor(ms / 900);
      setLayers((prev) =>
        prev.map((l, i) =>
          i <= tick && l.status === "QUEUED" ? { ...l, status: "ANALYZING" } : l,
        ),
      );
    }, 100);
    return () => {
      if (tickerRef.current) clearInterval(tickerRef.current);
    };
  }, [phase]);

  // API yanıtı geldiğinde layer'ları gerçek sonuçla güncelle
  useEffect(() => {
    if (!result) return;
    setLayers((prev) =>
      prev.map((l) => {
        const r = result.layer_results[l.id];
        if (!r) return l;
        return {
          ...l,
          status: r.status,
          score: r.score,
          finding: r.finding,
        };
      }),
    );
  }, [result]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim() || phase === "scanning") return;

    if (!url.trim().startsWith("http://") && !url.trim().startsWith("https://")) {
      setError("URL http:// veya https:// ile başlamalı. Adres çubuğundan tam linki kopyalayıp yapıştırın.");
      setPhase("error");
      return;
    }

    setPhase("scanning");
    setLayers(INITIAL_LAYERS);
    setElapsed(0);
    setError(null);
    setResult(null);

    abortRef.current = new AbortController();
    try {
      const r = await postScan(url.trim(), { signal: abortRef.current.signal });
      saveScanToCache(r);
      setResult(r);
      setPhase("complete");

      if (r.cached_at) {
        toast.success("Önbellekten yüklendi", {
          description: `${(r.duration_ms / 1000).toFixed(2)}s — taze tarama için yenile`,
        });
      }

      // Kısa "complete" süresi sonra detay sayfasına yönlendir
      setTimeout(() => {
        router.push(`/scan/${r.scan_id}`);
      }, 1800);
    } catch (e: unknown) {
      if (e instanceof DOMException && e.name === "AbortError") {
        setPhase("idle");
        return;
      }
      const msg =
        e instanceof ApiError
          ? translateApiError(e)
          : e instanceof Error
            ? e.message
            : "Bilinmeyen hata.";
      setError(msg);
      setPhase("error");
      toast.error("Tarama başarısız", { description: msg });
    }
  }

  function handleCancel() {
    abortRef.current?.abort();
    setPhase("idle");
    setLayers(INITIAL_LAYERS);
    setElapsed(0);
  }

  function pickDemo(demoUrl: string) {
    setUrl(demoUrl);
  }

  // ─────────── Render ───────────
  if (phase === "scanning" || phase === "complete") {
    return (
      <ScanProgress
        url={url}
        layers={layers}
        elapsed={elapsed}
        result={result}
        onCancel={handleCancel}
      />
    );
  }

  return (
    <div className="space-y-10">
      {/* Profil banner — TASK-37 */}
      {hasProfile === false && (
        <div className="border border-dashed border-[var(--blue)]/40 bg-[var(--blue)]/[0.04] px-4 py-3 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <span
              className="status-dot"
              style={{
                background: "var(--blue)",
                boxShadow: "0 0 8px rgba(90, 169, 255, 0.4)",
              }}
            />
            <span className="font-mono text-[10px] tracking-[0.22em] uppercase text-[var(--blue)]">
              cüzdan_perspektifi
            </span>
            <span className="font-sans text-[12px] text-[var(--muted)]">
              Finansal profil eksik — tarama sonuçları cüzdanına göre
              kişiselleştirilemiyor.
            </span>
          </div>
          <Link
            href="/settings"
            className="font-mono text-[10px] tracking-[0.22em] uppercase text-[var(--foreground)] hover:opacity-80 inline-flex items-center gap-2 shrink-0"
            style={{ color: "var(--blue)" }}
          >
            <span>profil_oluştur</span>
            <span className="font-sans">→</span>
          </Link>
        </div>
      )}

      {/* Hero */}
      <header className="space-y-6 max-w-3xl">
        <div className="font-mono text-[10px] tracking-[0.32em] uppercase text-[var(--muted)] flex items-center gap-3">
          <span className="h-px w-8 bg-[var(--accent)]" />
          <span>NEW_SCAN · session açık</span>
        </div>
        <h1 className="font-serif text-[clamp(2.4rem,5vw,4rem)] leading-[0.95] tracking-[-0.02em]">
          Bir sayfa,{" "}
          <span className="italic text-[var(--accent)]">yedi</span> soru.
        </h1>
        <p className="text-[14px] text-[var(--muted)] leading-relaxed max-w-xl">
          Trendyol, Hepsiburada, N11 veya Amazon TR&apos;den herhangi bir ürün
          linkini yapıştır — TrustLens 8 saniye içinde 7 paralel ajan çalıştırıp
          gerekçeli bir karar verir.
        </p>
      </header>

      {/* URL form */}
      <form
        onSubmit={handleSubmit}
        className="corner-frame relative bg-[var(--surface)] border border-[var(--border-strong)] font-mono"
      >
        <span className="c-tr" />
        <span className="c-bl" />

        <div className="px-4 h-9 border-b border-[var(--border-strong)] bg-black/40 flex items-center justify-between">
          <div className="flex items-center gap-2.5 text-[10px] tracking-[0.22em] uppercase text-[var(--muted)]">
            <span className="status-dot status-dot-info" />
            <span>SCAN_QUEUE</span>
          </div>
          <span className="text-[10px] tracking-[0.18em] uppercase text-[var(--muted-2)]">
            POST /api/scan
          </span>
        </div>

        <div className="p-6 lg:p-8 space-y-6">
          <div>
            <label
              htmlFor={inputId}
              className="flex items-center justify-between mb-3"
            >
              <span className="flex items-center gap-2.5 text-[10px] tracking-[0.24em] uppercase">
                <span
                  className={`status-dot ${url.length > 6 && url.includes("http") ? "status-dot-ok" : "status-dot-info"}`}
                />
                <span className="text-[var(--foreground)]/85">Ürün URL</span>
              </span>
              <span className="text-[9px] tracking-[0.22em] uppercase text-[var(--muted-2)]">
                [GEREKLİ]
              </span>
            </label>

            <div className="border-b border-[var(--border-strong)] focus-within:border-[var(--accent)] transition-colors flex items-center gap-3">
              <span className="text-[var(--accent)] text-[14px] shrink-0">{">"}</span>
              <input
                id={inputId}
                type="text"
                inputMode="url"
                autoFocus
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://www.trendyol.com/…"
                className="w-full bg-transparent outline-none text-[16px] py-3 text-[var(--foreground)] placeholder:text-[var(--muted-2)] font-mono caret-[var(--accent)]"
              />
              {url && (
                <button
                  type="button"
                  onClick={() => setUrl("")}
                  className="text-[var(--muted-2)] hover:text-[var(--red)] text-[10px] tracking-[0.22em] uppercase shrink-0"
                  tabIndex={-1}
                >
                  clear
                </button>
              )}
            </div>
          </div>

          {error && (
            <div className="border border-[var(--red)]/50 bg-[var(--red)]/[0.08] px-4 py-3 flex items-start gap-3">
              <span className="status-dot status-dot-risk mt-1.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-[10px] tracking-[0.22em] uppercase text-[var(--red)] mb-1">
                  Tarama başarısız
                </div>
                <p className="font-sans text-[13px] text-[var(--foreground)]/90">
                  {error}
                </p>
              </div>
              <button
                type="submit"
                className="shrink-0 font-mono text-[10px] tracking-[0.22em] uppercase text-[var(--accent)] border border-[var(--accent)]/40 hover:bg-[var(--accent)]/10 px-3 py-1.5 transition-colors whitespace-nowrap"
              >
                Tekrar dene ↺
              </button>
            </div>
          )}

          <div className="border-t border-[var(--border)]" />

          <button
            type="submit"
            disabled={!url}
            className="group relative w-full bg-[var(--accent)] hover:bg-[var(--accent-dim)] text-black px-5 py-4 font-mono text-[11px] tracking-[0.24em] uppercase transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-between"
          >
            <span className="flex items-center gap-3">
              <span className="text-black/70">{">"}</span>
              <span>Taramayı_başlat</span>
            </span>
            <span className="font-sans transition-transform group-hover:translate-x-0.5">
              →
            </span>
          </button>
        </div>
      </form>

      {/* Demo suggestions */}
      <div>
        <div className="flex items-baseline justify-between mb-4">
          <div className="font-mono text-[10px] tracking-[0.28em] uppercase text-[var(--muted-2)]">
            Önceden_hazırlanmış senaryolar
          </div>
          <div className="font-mono text-[10px] tracking-[0.18em] uppercase text-[var(--muted-2)]">
            03 · mock
          </div>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {DEMO_SCENARIOS.map((s) => {
            const colorMap = {
              red: "border-[var(--red)]/40 hover:bg-[var(--red)]/[0.06] text-[var(--red)]",
              yellow: "border-[var(--yellow)]/40 hover:bg-[var(--yellow)]/[0.06] text-[var(--yellow)]",
              green: "border-[var(--accent)]/40 hover:bg-[var(--accent)]/[0.06] text-[var(--accent)]",
            } as const;
            const dotMap = {
              red: "status-dot-risk",
              yellow: "status-dot-warn",
              green: "status-dot-ok",
            } as const;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => pickDemo(s.url)}
                className={`group text-left bg-[var(--surface)]/40 border ${colorMap[s.color]} p-4 transition-colors`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="font-mono text-[10px] tracking-[0.22em] uppercase text-[var(--muted)]">
                    {s.id}
                  </div>
                  <div className="font-mono text-[10px] tracking-[0.22em] uppercase inline-flex items-center gap-2">
                    <span className={`status-dot ${dotMap[s.color]}`} />
                    <span>{s.expected}</span>
                  </div>
                </div>
                <div className="font-serif italic text-[18px] text-[var(--foreground)] mb-1">
                  {s.label}
                </div>
                <div className="text-[12px] text-[var(--muted)] mb-3">
                  {s.note}
                </div>
                <div className="font-mono text-[10px] text-[var(--muted-2)] truncate flex items-center gap-1.5">
                  <span className="text-[var(--accent)] group-hover:translate-x-0.5 transition-transform">
                    →
                  </span>
                  URL&apos;yi kullan
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Recent scans — sessionStorage tabanlı, TASK-30'da DB'ye taşınacak */}
      {recentScans.length > 0 && (
        <div>
          <div className="flex items-baseline justify-between mb-4">
            <div className="font-mono text-[10px] tracking-[0.28em] uppercase text-[var(--muted-2)]">
              Son_taramalar
            </div>
            <div className="font-mono text-[10px] tracking-[0.18em] uppercase text-[var(--muted-2)]">
              {recentScans.length} · session
            </div>
          </div>

          <ul className="border-t border-[var(--border)]">
            {recentScans.map((s) => (
              <li key={s.scan_id} className="border-b border-[var(--border)]">
                <Link
                  href={`/scan/${s.scan_id}`}
                  className="group flex items-center gap-3 sm:gap-4 py-3 px-1 hover:bg-[var(--surface)]/30 transition-colors"
                >
                  <span
                    className={`status-dot ${VERDICT_DOT[s.verdict]} shrink-0`}
                  />
                  <span
                    className={`font-mono text-[10px] tracking-[0.22em] uppercase w-16 shrink-0 ${VERDICT_TONE[s.verdict]}`}
                  >
                    {VERDICT_TR[s.verdict]}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block font-serif italic text-[15px] text-[var(--foreground)] truncate">
                      {s.title || "—"}
                    </span>
                    <span className="block font-mono text-[10px] text-[var(--muted-2)] truncate">
                      {s.url}
                    </span>
                  </span>
                  <span
                    className={`font-mono tabular-nums text-[14px] shrink-0 ${VERDICT_TONE[s.verdict]}`}
                  >
                    {s.overall_score}
                    <span className="text-[var(--muted-2)] text-[10px] ml-0.5">
                      /100
                    </span>
                  </span>
                  <span className="font-mono text-[10px] text-[var(--muted-2)] hidden sm:inline shrink-0 group-hover:text-[var(--accent)] transition-colors">
                    →
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ===========================================================================
// ScanProgress — scan başladığında gösterilen canlı pano
// ===========================================================================

function ScanProgress({
  url,
  layers,
  elapsed,
  result,
  onCancel,
}: {
  url: string;
  layers: LayerSlot[];
  elapsed: number;
  result: ScanResult | null;
  onCancel: () => void;
}) {
  const activeLayers = layers.filter((l) => l.status !== "PENDING_BUILD");
  const completed = activeLayers.filter(
    (l) => l.status !== "QUEUED" && l.status !== "ANALYZING",
  ).length;
  const progressPct = result
    ? 100
    : Math.min(95, (elapsed / 8000) * 100);

  return (
    <div className="space-y-8">
      {/* Header */}
      <header className="space-y-4">
        <div className="font-mono text-[10px] tracking-[0.32em] uppercase text-[var(--muted)] flex items-center gap-3">
          <span className="h-px w-8 bg-[var(--accent)]" />
          <span>{result ? "SCAN_COMPLETE" : "SCAN_IN_PROGRESS"}</span>
        </div>
        <h2 className="font-serif text-[clamp(1.8rem,3.5vw,2.6rem)] leading-tight">
          {result ? (
            <>
              Tarama tamamlandı.{" "}
              <span className="italic text-[var(--accent)]">Yönlendiriliyor</span>
              <span className="cursor" />
            </>
          ) : (
            <>
              Sayfa{" "}
              <span className="italic text-[var(--muted)]">analiz ediliyor</span>
              <span className="cursor" />
            </>
          )}
        </h2>
      </header>

      {/* Console */}
      <div className="corner-frame relative bg-[var(--surface)] border border-[var(--border-strong)] font-mono">
        <span className="c-tr" />
        <span className="c-bl" />

        <div className="flex items-center justify-between px-4 h-9 border-b border-[var(--border-strong)] bg-black/40">
          <div className="flex items-center gap-2.5 text-[10px] tracking-[0.22em] uppercase text-[var(--muted)]">
            <span className={`status-dot ${result ? "status-dot-ok" : "status-dot-warn"} live-pulse`} />
            <span>{result ? "FINALIZING" : "ANALYZING"}</span>
          </div>
          <div className="flex items-center gap-3 text-[10px] tracking-[0.18em] uppercase text-[var(--muted-2)] tabular-nums">
            <span>{(elapsed / 1000).toFixed(1)}s</span>
            <span>· {completed}/{activeLayers.length} done</span>
          </div>
        </div>

        {/* URL + progress bar */}
        <div className="p-4 border-b border-[var(--border)] space-y-2.5">
          <div className="flex items-baseline gap-4">
            <span className="text-[10px] tracking-[0.2em] uppercase text-[var(--muted-2)] w-16 shrink-0">
              URL
            </span>
            <span className="text-[12px] text-[var(--foreground)] truncate">{url}</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-[10px] tracking-[0.2em] uppercase text-[var(--muted-2)] w-16 shrink-0">
              Status
            </span>
            <span className="flex-1 h-2 border border-[var(--border-strong)] overflow-hidden relative">
              <span
                className="absolute inset-y-0 left-0 bg-[var(--accent)] transition-all duration-300 ease-out"
                style={{ width: `${progressPct}%` }}
              />
              <span className="absolute inset-0 stripes-active opacity-50" />
            </span>
            <span className="text-[10px] tracking-[0.18em] uppercase text-[var(--accent)] tabular-nums w-10 text-right">
              {Math.round(progressPct)}%
            </span>
          </div>
        </div>

        {/* Layer table */}
        <div className="px-3 sm:px-4 py-3">
          <div className="grid grid-cols-[24px_1fr_70px_44px] sm:grid-cols-[28px_1fr_84px_56px] gap-2 sm:gap-3 pb-2 mb-1 border-b border-[var(--border)] text-[9px] tracking-[0.22em] uppercase text-[var(--muted-2)]">
            <span>#</span>
            <span>Agent</span>
            <span className="text-right">Status</span>
            <span className="text-right hidden sm:block">Score</span>
          </div>

          {layers.map((l) => (
            <div
              key={l.id}
              className="grid grid-cols-[24px_1fr_70px_44px] sm:grid-cols-[28px_1fr_84px_56px] gap-2 sm:gap-3 py-2 items-center border-b border-[var(--border)]/60 last:border-b-0 min-h-[40px]"
            >
              <span className="text-[var(--muted-2)] text-[10px] tabular-nums">{l.code}</span>
              <span className="text-[var(--foreground)] text-[11px] sm:text-[12px] min-w-0">
                <span className="inline-flex items-center gap-2 flex-wrap">
                  <span>{l.name}</span>
                  {l.task && (
                    <span className="font-mono text-[9px] tracking-[0.2em] uppercase text-[var(--accent-dim)] border border-[var(--border-strong)] px-1.5 py-0.5 hidden sm:inline">
                      {l.task}
                    </span>
                  )}
                </span>
                {l.finding && (
                  <span className="block text-[10px] sm:text-[10.5px] text-[var(--muted)] mt-0.5 truncate">
                    {l.finding}
                  </span>
                )}
              </span>
              <span className={`text-right text-[10px] tracking-[0.14em] sm:tracking-[0.16em] uppercase ${STATUS_TEXT_COLOR[l.status]}`}>
                <span className={`status-dot ${STATUS_DOT[l.status]} ${l.status === "ANALYZING" ? "live-pulse" : ""} mr-1`} />
                <span className="hidden sm:inline">{STATUS_TEXT[l.status]}</span>
                <span className="sm:hidden text-[9px]">{STATUS_TEXT[l.status].slice(0, 4)}</span>
              </span>
              <span className={`text-right tabular-nums text-[11px] sm:text-[12px] ${STATUS_TEXT_COLOR[l.status]} hidden sm:block`}>
                {l.score ?? "—"}
              </span>
            </div>
          ))}
        </div>

        {/* Verdict footer */}
        {result && (
          <div className="border-t border-[var(--border-strong)] bg-black/40 px-4 py-4 grid grid-cols-2 gap-4 items-end">
            <div>
              <div className="text-[9px] tracking-[0.22em] uppercase text-[var(--muted-2)] mb-1">
                Genel Skor
              </div>
              <div className="flex items-baseline gap-2">
                <span
                  className={`font-serif italic text-[44px] leading-none tabular-nums ${
                    result.verdict === "BUY"
                      ? "text-[var(--accent)]"
                      : result.verdict === "CAUTION"
                        ? "text-[var(--yellow)]"
                        : "text-[var(--red)]"
                  }`}
                >
                  {result.overall_score}
                </span>
                <span className="text-[var(--muted)] text-[12px]">/100</span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-[9px] tracking-[0.22em] uppercase text-[var(--muted-2)] mb-1">
                Karar
              </div>
              <div
                className={`inline-flex items-center gap-2 border px-3 py-1.5 ${
                  result.verdict === "BUY"
                    ? "border-[var(--accent)]/60 bg-[var(--accent)]/10"
                    : result.verdict === "CAUTION"
                      ? "border-[var(--yellow)]/60 bg-[var(--yellow)]/10"
                      : "border-[var(--red)]/60 bg-[var(--red)]/10"
                }`}
              >
                <span
                  className={`status-dot ${
                    result.verdict === "BUY"
                      ? "status-dot-ok"
                      : result.verdict === "CAUTION"
                        ? "status-dot-warn"
                        : "status-dot-risk"
                  }`}
                />
                <span
                  className={`text-[12px] tracking-[0.22em] uppercase font-medium ${
                    result.verdict === "BUY"
                      ? "text-[var(--accent)]"
                      : result.verdict === "CAUTION"
                        ? "text-[var(--yellow)]"
                        : "text-[var(--red)]"
                  }`}
                >
                  {verdictTr(result.verdict)}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between font-mono text-[10px] tracking-[0.22em] uppercase text-[var(--muted)]">
        <span>{result ? "→ /scan/" + result.scan_id.slice(0, 8) : "Çalışan ajanları kesme: cancel"}</span>
        {!result && (
          <button
            type="button"
            onClick={onCancel}
            className="text-[var(--muted)] hover:text-[var(--red)] transition-colors"
          >
            cancel ↗
          </button>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

function verdictTr(v: ScanResult["verdict"]): string {
  return v === "BUY" ? "AL" : v === "CAUTION" ? "DİKKATLİ OL" : "ALMA";
}

function translateApiError(e: ApiError): string {
  const detail = e.detail ?? "";

  // 422 — doğrulama hataları
  if (e.status === 422) {
    if (detail.toLowerCase().includes("desteklenmiyor")) return detail;
    if (detail.toLowerCase().includes("platform")) return detail;
    return "Geçerli bir Trendyol, Hepsiburada, N11 veya Amazon TR ürün linki girin. (https:// ile başlamalı)";
  }

  // 404 — ürün / URL bulunamadı
  if (e.status === 404) {
    if (detail.toLowerCase().includes("analiz edilemiyor")) {
      return "Bu ürün şu an analiz edilemiyor. Lütfen birazdan tekrar deneyin veya farklı bir URL dene.";
    }
    return "Bu URL hiçbir demo senaryoya eşleşmiyor — önerilen senaryolardan birini dene.";
  }

  // 503 — AI servisi geçici arıza
  if (e.status === 503) {
    return "AI servisi şu an yavaş yanıt veriyor. 10–15 saniye bekleyip tekrar dene.";
  }

  // 500+ — sunucu hatası
  if (e.status >= 500) {
    return "Sunucu hatası. Birazdan tekrar dene.";
  }

  return detail || `İstek başarısız (${e.status}).`;
}
