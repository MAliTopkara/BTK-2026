"use client";

import { motion } from "framer-motion";
import Link from "next/link";

import type { LayerResult, LayerStatus, ScanResult, Verdict } from "@/lib/api";
import { ScoreRing } from "@/components/ui/ScoreRing";
import { LAYER_META } from "@/components/scan/LayerCard";

const VERDICT_TR: Record<Verdict, string> = {
  BUY: "AL",
  CAUTION: "DİKKATLİ OL",
  AVOID: "ALMA",
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

const STATUS_TONE: Record<LayerStatus, string> = {
  RISK: "text-[var(--red)]",
  WARN: "text-[var(--yellow)]",
  OK: "text-[var(--accent)]",
  INFO: "text-[var(--muted)]",
};

const STATUS_DOT: Record<LayerStatus, string> = {
  RISK: "status-dot-risk",
  WARN: "status-dot-warn",
  OK: "status-dot-ok",
  INFO: "status-dot-info",
};

const LAYER_ORDER = [
  "review",
  "discount",
  "manipulation",
  "seller",
  "visual",
  "crossplatform",
  "phishing",
];

const TIE_THRESHOLD = 5;

type LayerComparison = {
  layerId: string;
  name: string;
  code: string;
  a: { score: number | null; status: LayerStatus } | null;
  b: { score: number | null; status: LayerStatus } | null;
  delta: number | null; // b.score - a.score
  winner: "A" | "B" | "tie" | null;
};

type Props = {
  a: ScanResult;
  b: ScanResult;
};

export function CompareView({ a, b }: Props) {
  const overallDelta = b.overall_score - a.overall_score;
  const winner: "A" | "B" | "tie" =
    Math.abs(overallDelta) < TIE_THRESHOLD ? "tie" : overallDelta > 0 ? "B" : "A";

  const layerComparisons = buildLayerComparisons(a, b);
  const stats = computeWinStats(layerComparisons);

  return (
    <div className="space-y-14">
      {/* Hero */}
      <header className="space-y-4">
        <div className="font-mono text-[10px] tracking-[0.32em] uppercase text-[var(--muted)] flex items-center gap-3">
          <span className="h-px w-8 bg-[var(--accent)]" />
          <span>04 / KARŞILAŞTIRMA · A vs B</span>
        </div>
        <h1 className="font-serif text-[clamp(2.4rem,5vw,4rem)] leading-[0.95] tracking-[-0.02em]">
          İki ürün,{" "}
          <span className="italic text-[var(--accent)]">tek</span> karar.
        </h1>
        <p className="text-[14px] text-[var(--muted)] leading-relaxed max-w-2xl">
          7 katmanın 14 ayrı çıktısı. Yan yana. Adli analiz tarzı, duygusuz.
          Hangisi daha güvenilir, hangisinde hangi katman temiz, hangisi nerede
          riskli — sayılarla.
        </p>
      </header>

      {/* A vs B summary */}
      <section className="grid lg:grid-cols-[1fr_140px_1fr] gap-4 lg:gap-6 items-stretch">
        <SummaryColumn scan={a} side="A" highlight={winner === "A"} />
        <DiffStrip delta={overallDelta} winner={winner} />
        <SummaryColumn scan={b} side="B" highlight={winner === "B"} />
      </section>

      {/* Layer comparison */}
      <section>
        <SectionHeader
          step="A"
          eyebrow="KATMAN_DİFF"
          title={
            <>
              7 katman,{" "}
              <span className="italic text-[var(--muted)]">14 ölçüm</span>.
            </>
          }
          sub="Her katmanın iki taraftaki skoru ve farkı. Yeşil = B daha iyi, kırmızı = A daha iyi, gri = berabere."
        />

        <div className="mt-8 corner-frame relative bg-[var(--surface)]/40 border border-[var(--border-strong)] font-mono">
          <span className="c-tr" />
          <span className="c-bl" />

          {/* Header row */}
          <div className="grid grid-cols-[40px_1fr_120px_72px_120px] gap-3 px-4 py-3 border-b border-[var(--border-strong)] bg-black/40 text-[9px] tracking-[0.22em] uppercase text-[var(--muted-2)]">
            <span>#</span>
            <span>Katman</span>
            <span className="text-right">A</span>
            <span className="text-center">Δ</span>
            <span className="text-right">B</span>
          </div>

          {layerComparisons.map((row, i) => (
            <ComparisonRow key={row.layerId} row={row} index={i} />
          ))}
        </div>
      </section>

      {/* Recommendation */}
      <section>
        <SectionHeader
          step="B"
          eyebrow="TAVSİYE"
          title={
            <>
              Sonuç,{" "}
              <span
                className="italic"
                style={{
                  color: winner === "tie" ? "var(--muted)" : winner === "A"
                    ? VERDICT_TONE[a.verdict]
                    : VERDICT_TONE[b.verdict],
                }}
              >
                {winner === "tie" ? "berabere" : winner === "A" ? "A tarafı" : "B tarafı"}
              </span>
              .
            </>
          }
          sub="Trust skoru farkı + katman bazlı kazanım sayısına dayalı."
        />

        <RecommendationPanel
          a={a}
          b={b}
          winner={winner}
          overallDelta={overallDelta}
          stats={stats}
        />
      </section>

      {/* Footer / actions */}
      <footer className="flex flex-wrap items-center justify-between gap-4 border-t border-[var(--border)] pt-6 font-mono text-[10px] tracking-[0.22em] uppercase">
        <span className="text-[var(--muted-2)]">
          A · {a.scan_id.slice(0, 8)} · {a.url.includes("trendyol") ? "trendyol" : a.url.includes("hepsiburada") ? "hepsiburada" : "—"}
          <span className="mx-3">vs</span>
          B · {b.scan_id.slice(0, 8)}
        </span>
        <Link
          href="/dashboard"
          className="text-[var(--accent)] hover:text-[var(--foreground)] transition-colors"
        >
          yeni_tarama →
        </Link>
      </footer>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────

function SummaryColumn({
  scan,
  side,
  highlight,
}: {
  scan: ScanResult;
  side: "A" | "B";
  highlight: boolean;
}) {
  const tone = VERDICT_TONE[scan.verdict];
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.5,
        delay: side === "A" ? 0.1 : 0.2,
        ease: [0.22, 1, 0.36, 1],
      }}
      className={`corner-frame relative bg-[var(--surface)]/60 border p-6 lg:p-7 flex flex-col font-mono ${
        highlight
          ? "shadow-[inset_3px_0_0]"
          : ""
      }`}
      style={{
        borderColor: highlight ? `${tone}66` : "var(--border-strong)",
        boxShadow: highlight ? `inset 3px 0 0 ${tone}` : undefined,
      }}
    >
      <span className="c-tr" />
      <span className="c-bl" />

      {/* Side label */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <span
            className="font-serif italic text-[44px] leading-none"
            style={{ color: highlight ? tone : "var(--muted-2)" }}
          >
            {side}
          </span>
          <div className="flex flex-col">
            <span className="text-[9px] tracking-[0.22em] uppercase text-[var(--muted-2)]">
              tarama
            </span>
            <span className="text-[10px] tracking-[0.18em] uppercase text-[var(--muted)]">
              {scan.scan_id.slice(0, 8)}
            </span>
          </div>
        </div>
        <ScoreRing score={scan.overall_score} verdict={scan.verdict} size="md" />
      </div>

      {/* Title */}
      <h3
        className="font-serif italic text-[18px] lg:text-[20px] leading-tight text-[var(--foreground)] mb-2"
        style={{
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
        }}
      >
        {scan.product?.title ?? "Bilinmeyen ürün"}
      </h3>

      {/* Platform · price */}
      <div className="text-[11px] text-[var(--muted)] mb-4">
        <span className="text-[var(--foreground)]">
          {scan.product?.platform ?? "—"}
        </span>
        {scan.product?.price_current && (
          <>
            <span className="mx-2 text-[var(--muted-2)]">·</span>
            <span className="text-[var(--foreground)] tabular-nums">
              ₺ {scan.product.price_current.toLocaleString("tr-TR")}
            </span>
          </>
        )}
      </div>

      {/* Verdict pill */}
      <div className="mt-auto pt-4 border-t border-[var(--border)]">
        <span
          className="inline-flex items-center gap-2 border px-3 py-1.5"
          style={{
            borderColor: `${tone}80`,
            backgroundColor: "rgba(0,0,0,0.4)",
          }}
        >
          <span className={`status-dot ${VERDICT_DOT[scan.verdict]}`} />
          <span
            className="text-[11px] tracking-[0.22em] uppercase"
            style={{ color: tone }}
          >
            {VERDICT_TR[scan.verdict]} · {scan.overall_score}/100
          </span>
        </span>
      </div>
    </motion.div>
  );
}

function DiffStrip({
  delta,
  winner,
}: {
  delta: number;
  winner: "A" | "B" | "tie";
}) {
  const color =
    winner === "tie"
      ? "var(--muted)"
      : winner === "B"
        ? "var(--accent)"
        : "var(--red)";
  const arrow = winner === "tie" ? "=" : winner === "B" ? "→" : "←";

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.6, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="flex flex-col items-center justify-center gap-2 lg:gap-3 py-4 lg:py-0"
    >
      <div
        className="font-mono text-[10px] tracking-[0.32em] uppercase"
        style={{ color: "var(--muted-2)" }}
      >
        Δ skor
      </div>
      <div
        className="font-serif italic tabular-nums leading-none"
        style={{ fontSize: 64, color }}
      >
        {winner === "tie" ? "≈" : delta > 0 ? `+${delta}` : `${delta}`}
      </div>
      <div
        className="font-mono text-[14px]"
        style={{ color }}
      >
        {arrow}
      </div>
      <div className="font-mono text-[9px] tracking-[0.22em] uppercase text-[var(--muted-2)] text-center max-w-[120px]">
        {winner === "tie"
          ? "ikisi de yakın"
          : winner === "B"
            ? "B daha güvenli"
            : "A daha güvenli"}
      </div>
    </motion.div>
  );
}

function ComparisonRow({
  row,
  index,
}: {
  row: LayerComparison;
  index: number;
}) {
  const aTone = row.a ? STATUS_TONE[row.a.status] : "text-[var(--muted-2)]";
  const aDot = row.a ? STATUS_DOT[row.a.status] : "status-dot-info";
  const bTone = row.b ? STATUS_TONE[row.b.status] : "text-[var(--muted-2)]";
  const bDot = row.b ? STATUS_DOT[row.b.status] : "status-dot-info";

  const deltaColor =
    row.winner === null || row.winner === "tie"
      ? "text-[var(--muted-2)]"
      : row.winner === "B"
        ? "text-[var(--accent)]"
        : "text-[var(--red)]";

  const deltaText =
    row.delta === null
      ? "—"
      : row.winner === "tie"
        ? "≈"
        : row.delta > 0
          ? `+${row.delta}`
          : `${row.delta}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.05 * index }}
      className="grid grid-cols-[40px_1fr_120px_72px_120px] gap-3 px-4 py-3 items-center border-b border-[var(--border)] last:border-b-0 hover:bg-[var(--surface)]/40 transition-colors"
    >
      <span className="text-[var(--muted-2)] text-[10px] tabular-nums">
        {row.code}
      </span>
      <span className="text-[var(--foreground)] text-[12px] truncate">
        {row.name}
      </span>

      {/* A side */}
      <div className="flex items-center justify-end gap-2">
        {row.a ? (
          <>
            <span className={`status-dot ${aDot}`} />
            <span className={`tabular-nums text-[12px] ${aTone}`}>
              {row.a.score ?? "—"}
            </span>
          </>
        ) : (
          <span className="text-[var(--muted-2)] text-[10px]">N/A</span>
        )}
      </div>

      {/* Delta */}
      <div className="flex items-center justify-center">
        <span className={`font-mono text-[12px] tabular-nums ${deltaColor} font-medium`}>
          {deltaText}
        </span>
      </div>

      {/* B side */}
      <div className="flex items-center justify-end gap-2">
        {row.b ? (
          <>
            <span className={`tabular-nums text-[12px] ${bTone}`}>
              {row.b.score ?? "—"}
            </span>
            <span className={`status-dot ${bDot}`} />
          </>
        ) : (
          <span className="text-[var(--muted-2)] text-[10px]">N/A</span>
        )}
      </div>
    </motion.div>
  );
}

function RecommendationPanel({
  a,
  b,
  winner,
  overallDelta,
  stats,
}: {
  a: ScanResult;
  b: ScanResult;
  winner: "A" | "B" | "tie";
  overallDelta: number;
  stats: { aWins: number; bWins: number; ties: number };
}) {
  const winnerScan = winner === "A" ? a : winner === "B" ? b : null;
  const loserScan = winner === "A" ? b : winner === "B" ? a : null;
  const winnerSide = winner === "A" ? "A" : winner === "B" ? "B" : null;
  const wonLayers = winner === "A" ? stats.aWins : winner === "B" ? stats.bWins : 0;

  if (winner === "tie" || !winnerScan || !loserScan || !winnerSide) {
    return (
      <div className="mt-8 corner-frame relative bg-[var(--surface)]/40 border border-[var(--muted)]/30 p-8 lg:p-12 flex flex-col lg:flex-row items-center gap-8 lg:gap-12">
        <span className="c-tr" />
        <span className="c-bl" />
        <div className="flex-1">
          <div className="font-mono text-[10px] tracking-[0.32em] uppercase text-[var(--muted-2)] mb-3">
            verdict · tie
          </div>
          <h3 className="font-serif text-[clamp(1.6rem,3vw,2.2rem)] leading-tight">
            İki tarafın trust skoru{" "}
            <span className="italic text-[var(--muted)]">çok yakın</span> —
            karar senin.
          </h3>
          <p className="text-[13px] text-[var(--muted)] leading-relaxed mt-3 max-w-md">
            A: {a.overall_score}/100 · B: {b.overall_score}/100 ({Math.abs(overallDelta)} puan fark).
            {stats.aWins > 0 || stats.bWins > 0
              ? ` Katman bazında A ${stats.aWins} kazandı, B ${stats.bWins} kazandı, ${stats.ties} berabere.`
              : ""}
          </p>
        </div>
      </div>
    );
  }

  const tone = VERDICT_TONE[winnerScan.verdict];

  return (
    <div
      className="mt-8 corner-frame relative bg-[var(--surface)]/40 border p-8 lg:p-12 flex flex-col lg:flex-row items-center gap-8 lg:gap-12"
      style={{ borderColor: `${tone}50` }}
    >
      <span className="c-tr" />
      <span className="c-bl" />

      <div className="shrink-0">
        <ScoreRing
          score={winnerScan.overall_score}
          verdict={winnerScan.verdict}
          size="lg"
          showPill
        />
      </div>

      <div className="flex-1 min-w-0">
        <div
          className="font-mono text-[10px] tracking-[0.32em] uppercase mb-3"
          style={{ color: tone }}
        >
          verdict · {winnerSide.toLowerCase()} kazandı
        </div>
        <h3 className="font-serif text-[clamp(1.8rem,3.5vw,2.6rem)] leading-[1.05] tracking-[-0.015em] mb-4">
          {winnerSide} tarafı{" "}
          <span className="italic" style={{ color: tone }}>
            daha güvenli
          </span>
          .
        </h3>
        <p className="text-[14px] text-[var(--foreground)]/85 leading-relaxed max-w-2xl mb-4">
          B&apos;ye göre{" "}
          <span style={{ color: tone }} className="tabular-nums">
            {winner === "B" ? `+${overallDelta}` : `${-overallDelta}`} puan
          </span>{" "}
          üstün. 7 katmanın{" "}
          <span className="text-[var(--foreground)] tabular-nums">{wonLayers}</span>
          &apos;inde daha temiz, {stats.ties} katmanda berabere, {winnerSide === "A" ? stats.bWins : stats.aWins} katmanda riskli.
        </p>
        <div className="font-mono text-[11px] text-[var(--muted)] truncate">
          {winnerScan.product?.title ?? "Bilinmeyen ürün"}
        </div>
      </div>
    </div>
  );
}

function SectionHeader({
  step,
  eyebrow,
  title,
  sub,
}: {
  step: string;
  eyebrow: string;
  title: React.ReactNode;
  sub: string;
}) {
  return (
    <div className="grid lg:grid-cols-12 gap-6 items-end">
      <div className="lg:col-span-7">
        <div className="font-mono text-[10px] tracking-[0.32em] uppercase text-[var(--muted)] mb-5 flex items-center gap-3">
          <span className="h-px w-8 bg-[var(--accent)]" />
          <span>
            {step} / {eyebrow}
          </span>
        </div>
        <h2 className="font-serif text-[clamp(1.8rem,3.5vw,2.6rem)] leading-[1.05] tracking-[-0.015em]">
          {title}
        </h2>
      </div>
      <div className="lg:col-span-5">
        <p className="text-[13px] text-[var(--muted)] leading-relaxed max-w-md">
          {sub}
        </p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Comparison logic
// ─────────────────────────────────────────────────────────────────────────

// Backend'in /api/scan response'unda yer almayan katmanlar (örn. phishing,
// görsel yükleme ile ayrı endpoint'ten gelir) için Türkçe etiket fallback'i.
const LAYER_NAME_FALLBACK_TR: Record<string, string> = {
  phishing: "Phishing / SMS",
};

function buildLayerComparisons(
  a: ScanResult,
  b: ScanResult,
): LayerComparison[] {
  return LAYER_ORDER.map((layerId): LayerComparison => {
    const aLayer = a.layer_results[layerId] as LayerResult | undefined;
    const bLayer = b.layer_results[layerId] as LayerResult | undefined;
    const meta = LAYER_META[layerId] ?? { code: "??", method: "", nameEn: layerId };
    const name =
      aLayer?.name ?? bLayer?.name ?? LAYER_NAME_FALLBACK_TR[layerId] ?? layerId;

    const aSide = aLayer
      ? { score: aLayer.score, status: aLayer.status }
      : null;
    const bSide = bLayer
      ? { score: bLayer.score, status: bLayer.status }
      : null;

    let delta: number | null = null;
    let winner: "A" | "B" | "tie" | null = null;

    if (aSide?.score != null && bSide?.score != null) {
      delta = bSide.score - aSide.score;
      winner =
        Math.abs(delta) < TIE_THRESHOLD ? "tie" : delta > 0 ? "B" : "A";
    } else if (aSide?.score != null && bSide?.score == null) {
      winner = "A";
    } else if (bSide?.score != null && aSide?.score == null) {
      winner = "B";
    }

    return {
      layerId,
      name,
      code: meta.code,
      a: aSide,
      b: bSide,
      delta,
      winner,
    };
  });
}

function computeWinStats(rows: LayerComparison[]): {
  aWins: number;
  bWins: number;
  ties: number;
} {
  let aWins = 0;
  let bWins = 0;
  let ties = 0;
  for (const r of rows) {
    if (r.winner === "A") aWins++;
    else if (r.winner === "B") bWins++;
    else if (r.winner === "tie") ties++;
  }
  return { aWins, bWins, ties };
}
