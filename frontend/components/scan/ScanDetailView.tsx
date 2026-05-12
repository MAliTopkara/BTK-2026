"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";

import type { Alternative, LayerResult, ScanResult, Verdict } from "@/lib/api";
import { downloadPNG, downloadSVG } from "@/lib/score-ring-export";
import { ScoreRing } from "@/components/ui/ScoreRing";
import { EthicsPanel } from "./EthicsPanel";
import { FinancialFitPanel } from "./FinancialFitPanel";
import { LayerCard } from "./LayerCard";
import { ReasoningPanel } from "./ReasoningPanel";
import { PetitionModal } from "./PetitionModal";
import { ShareSheet } from "./ShareSheet";

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

const STATUS_PRIORITY: Record<string, number> = {
  RISK: 0,
  WARN: 1,
  INFO: 2,
  OK: 3,
};

type Props = {
  scan: ScanResult;
};

export function ScanDetailView({ scan }: Props) {
  const verdictTone = VERDICT_TONE[scan.verdict];
  const sortedLayers = sortLayers(Object.values(scan.layer_results));
  const counts = countByStatus(sortedLayers);
  const [showPetitionModal, setShowPetitionModal] = useState(false);
  const [showShareSheet, setShowShareSheet] = useState(false);
  const lowDataNotice = scan.product.review_count_total === 0;

  return (
    <div className="space-y-16 lg:space-y-20">
      {/* ───────────────── HERO — verdict moment ───────────────── */}
      <section className="relative">
        <Eyebrow
          scanId={scan.scan_id}
          createdAt={scan.created_at}
          cachedAt={scan.cached_at}
        />

        {lowDataNotice && (
          <div className="mt-6 border border-[var(--yellow)]/40 bg-[var(--yellow)]/[0.06] px-4 py-3 flex items-start gap-3">
            <span className="status-dot status-dot-warn mt-1.5 shrink-0" />
            <div className="min-w-0">
              <div className="font-mono text-[10px] tracking-[0.22em] uppercase text-[var(--yellow)] mb-1">
                Yetersiz veri ile sınırlı analiz
              </div>
              <p className="font-sans text-[13px] text-[var(--foreground)]/85 leading-relaxed">
                Bu ürün için kullanıcı yorumu bulunamadı. Yorum katmanı atlandı,
                karar diğer katmanlardan gelen sinyallere dayanıyor — güveni
                tek başına doğrulamak için yeterli değil.
              </p>
            </div>
          </div>
        )}

        <div className="grid lg:grid-cols-12 gap-10 lg:gap-16 items-start mt-8 lg:mt-12">
          {/* Mobile: ScoreRing önce gelsin */}
          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="lg:hidden flex justify-center"
          >
            <ScoreRing
              score={scan.overall_score}
              verdict={scan.verdict}
              size="lg"
              showPill
              delay={300}
            />
          </motion.div>

          {/* Left: Product info */}
          <div className="lg:col-span-7 space-y-8">
            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
              className="font-serif text-[clamp(2rem,4vw,3.4rem)] leading-[1.02] tracking-[-0.02em]"
            >
              {scan.product.title || "Bilinmeyen ürün"}
            </motion.h1>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="flex items-center gap-3 font-mono text-[11px] tracking-[0.18em] uppercase text-[var(--muted)] flex-wrap"
            >
              <span className="text-[var(--foreground)]">
                {scan.product.platform}
              </span>
              <span className="text-[var(--muted-2)]">·</span>
              <a
                href={scan.url}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-[var(--accent)] transition-colors truncate max-w-[420px]"
              >
                {shortUrl(scan.url)} ↗
              </a>
            </motion.div>

            {/* Product details table */}
            <motion.dl
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.45 }}
              className="grid grid-cols-[100px_1fr] sm:grid-cols-[120px_1fr] gap-y-3 font-mono text-[12px] border-t border-[var(--border)] pt-6 max-w-md"
            >
              <ProductRow label="fiyat">
                <PriceCell
                  current={scan.product.price_current}
                  original={scan.product.price_original}
                  discount={scan.product.discount_pct}
                />
              </ProductRow>

              <ProductRow label="satıcı">
                <span className="text-[var(--foreground)]">
                  {scan.product.seller?.name ?? "—"}
                </span>
                {scan.product.seller?.is_verified && (
                  <span className="ml-2 text-[var(--accent)] text-[10px] tracking-[0.2em] uppercase">
                    ✓ doğrulanmış
                  </span>
                )}
              </ProductRow>

              {scan.product.seller?.rating != null && (
                <ProductRow label="puan">
                  <span className="text-[var(--foreground)] tabular-nums">
                    {scan.product.seller.rating.toFixed(1)}
                  </span>
                  {scan.product.seller.rating_count != null && (
                    <span className="text-[var(--muted-2)] ml-2">
                      / {scan.product.seller.rating_count.toLocaleString("tr-TR")} değerlendirme
                    </span>
                  )}
                </ProductRow>
              )}

              <ProductRow label="süre">
                <span className="text-[var(--foreground)] tabular-nums">
                  {(scan.duration_ms / 1000).toFixed(1)}s
                </span>
              </ProductRow>

              <ProductRow label="zaman">
                <span className="text-[var(--foreground)]">
                  {formatRelative(scan.created_at)}
                </span>
              </ProductRow>
            </motion.dl>
          </div>

          {/* Right: XL ScoreRing — verdict moment (desktop only) */}
          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="hidden lg:flex lg:col-span-5 flex-col items-center justify-center"
          >
            <div className="flex flex-col items-center">
              <ScoreRing
                score={scan.overall_score}
                verdict={scan.verdict}
                size="xl"
                showPill
                delay={300}
              />
            </div>
          </motion.div>
        </div>

        {/* Status counts strip */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 1.4 }}
          className="mt-12 lg:mt-16 pt-6 border-t border-[var(--border-strong)] grid grid-cols-2 sm:grid-cols-4 gap-6 max-w-3xl font-mono text-[11px]"
        >
          <CountStat label="risk" count={counts.RISK} dot="status-dot-risk" tone="text-[var(--red)]" />
          <CountStat label="warn" count={counts.WARN} dot="status-dot-warn" tone="text-[var(--yellow)]" />
          <CountStat label="ok" count={counts.OK} dot="status-dot-ok" tone="text-[var(--accent)]" />
          <CountStat label="info" count={counts.INFO} dot="status-dot-info" tone="text-[var(--muted)]" />
        </motion.div>
      </section>

      {/* ───────────────── FINANCIAL FIT (TASK-37) ───────────────── */}
      {scan.product?.price_current ? (
        <FinancialFitPanel
          price={scan.product.price_current}
          trustScore={scan.overall_score}
        />
      ) : null}

      {/* ───────────────── ETHICS SCORE (TASK-40) ───────────────── */}
      <EthicsPanel product={scan.product} />

      {/* ───────────────── REASONING ───────────────── */}
      {scan.reasoning_steps && scan.reasoning_steps.length > 0 ? (
        <ReasoningPanel
          steps={scan.reasoning_steps}
          finalExplanation={scan.final_explanation}
          verdict={scan.verdict}
          overallScore={scan.overall_score}
          durationMs={scan.duration_ms}
          variant="static"
        />
      ) : (
        <FinalExplanationOnly
          finalExplanation={scan.final_explanation}
          verdict={scan.verdict}
          overallScore={scan.overall_score}
          durationMs={scan.duration_ms}
        />
      )}

      {/* ───────────────── LAYER GRID ───────────────── */}
      <section>
        <SectionHeader
          step="04"
          eyebrow="Katmanlar"
          title={
            <>
              {sortedLayers.length} ayrı{" "}
              <span className={`italic ${verdictTone}`}>kanıt</span>, ayrı ayrı.
            </>
          }
          sub="Her katman bağımsız çalıştı, kendi skorunu üretti. Statüye göre RISK ilk."
        />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mt-10">
          {sortedLayers.map((layer, i) => (
            <LayerCard
              key={layer.layer_id}
              result={layer}
              variant="default"
              delay={i * 70}
            />
          ))}
        </div>
      </section>

      {/* ───────────────── ALTERNATIVE ───────────────── */}
      {scan.alternative && (
        <AlternativeCard alternative={scan.alternative} />
      )}

      {/* ───────────────── ACTION STRIP ───────────────── */}
      <section className="border-t border-[var(--border-strong)] pt-10">
        <div className="font-mono text-[10px] tracking-[0.28em] uppercase text-[var(--muted-2)] mb-5">
          Aksiyonlar
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
          <button
            type="button"
            onClick={() => setShowPetitionModal(true)}
            className="group bg-[var(--surface)]/40 hover:bg-[var(--surface)]/70 border border-[var(--border-strong)] hover:border-[var(--accent)]/60 p-4 text-left transition-colors flex flex-col justify-between min-h-[100px]"
          >
            <span className="font-mono text-[10px] tracking-[0.22em] uppercase text-[var(--accent-dim)] group-hover:text-[var(--accent)]">
              pdf · dilekçe
            </span>
            <span className="mt-3 flex items-end justify-between gap-2">
              <span className="min-w-0">
                <span className="block font-mono text-[12px] tracking-[0.22em] uppercase text-[var(--foreground)]/85">
                  Dilekçe oluştur
                </span>
                <span className="block text-[11px] text-[var(--muted-2)] mt-1.5 normal-case tracking-normal font-sans">
                  Tüketici Hakem Heyeti · PDF
                </span>
              </span>
              <span className="font-sans text-[var(--muted)] group-hover:text-[var(--accent)] group-hover:translate-x-0.5 transition-all shrink-0">
                ↓
              </span>
            </span>
          </button>
          <ActionLink
            href="/history"
            label="Geçmişe git"
            sub="Tüm taramalarını gör"
          />
          <ActionLink
            href={`/compare?a=scan:${scan.scan_id}`}
            label="Karşılaştır"
            sub="Başka bir tarama veya demo ile yan yana"
          />
          <button
            type="button"
            onClick={() => setShowShareSheet(true)}
            className="group bg-[var(--surface)]/40 border border-[var(--border-strong)] hover:border-[var(--accent)] p-4 text-left transition-colors flex flex-col justify-between min-h-[100px]"
          >
            <span className="font-mono text-[10px] tracking-[0.22em] uppercase text-[var(--accent-dim)]">
              paylaş ↗
            </span>
            <span className="mt-3">
              <span className="block font-mono text-[12px] tracking-[0.22em] uppercase text-[var(--foreground)] group-hover:text-[var(--accent)] transition-colors">
                Paylaş
              </span>
              <span className="block text-[11px] text-[var(--muted-2)] mt-1.5 normal-case tracking-normal font-sans">
                Link + OG kart + paylaşım metni
              </span>
            </span>
          </button>
          <ScoreExportButton
            score={scan.overall_score}
            verdict={scan.verdict}
            productTitle={scan.product.title}
          />
          <Link
            href="/dashboard"
            className="group bg-[var(--accent)] hover:bg-[var(--accent-dim)] text-black p-4 transition-colors flex flex-col justify-between min-h-[100px]"
          >
            <span className="font-mono text-[10px] tracking-[0.22em] uppercase opacity-70">
              cta · /dashboard
            </span>
            <span className="flex items-center justify-between mt-3">
              <span className="font-mono text-[12px] tracking-[0.22em] uppercase">
                Yeni_tarama
              </span>
              <span className="font-sans text-lg transition-transform group-hover:translate-x-0.5">
                →
              </span>
            </span>
          </Link>
        </div>
      </section>

      {/* Diagnostic footer */}
      <footer className="font-mono text-[10px] tracking-[0.22em] uppercase text-[var(--muted-2)] flex flex-wrap gap-x-6 gap-y-2 pt-6 border-t border-[var(--border)]">
        <span>scan_id · {scan.scan_id}</span>
        <span>created · {new Date(scan.created_at).toLocaleString("tr-TR")}</span>
        <span>duration · {(scan.duration_ms / 1000).toFixed(2)}s</span>
        <span>cache · sessionStorage</span>
      </footer>

      {/* Dilekçe Modal */}
      {showPetitionModal && (
        <PetitionModal
          scanId={scan.scan_id}
          scanUrl={scan.url}
          onClose={() => setShowPetitionModal(false)}
        />
      )}

      {/* Paylaş Sheet — TASK-38 */}
      <ShareSheet
        scan={scan}
        open={showShareSheet}
        onClose={() => setShowShareSheet(false)}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────

function Eyebrow({
  scanId,
  createdAt,
  cachedAt,
}: {
  scanId: string;
  createdAt: string;
  cachedAt: string | null;
}) {
  const shortId = scanId.slice(0, 8);
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="font-mono text-[10px] tracking-[0.32em] uppercase text-[var(--muted)] flex items-center gap-3 flex-wrap"
    >
      <span className="h-px w-8 bg-[var(--accent)]" />
      <span>tarama · {shortId}</span>
      <span className="text-[var(--muted-2)]">·</span>
      <span>{formatRelative(createdAt)}</span>
      {cachedAt && (
        <>
          <span className="text-[var(--muted-2)]">·</span>
          <span className="inline-flex items-center gap-1.5 text-[var(--accent-dim)]">
            <span className="status-dot status-dot-info" />
            <span>cached</span>
          </span>
        </>
      )}
    </motion.div>
  );
}

function ProductRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <>
      <dt className="text-[var(--muted-2)] tracking-[0.2em] uppercase text-[10px]">
        {label}
      </dt>
      <dd className="text-[var(--foreground)]/85">{children}</dd>
    </>
  );
}

function PriceCell({
  current,
  original,
  discount,
}: {
  current: number;
  original: number | null;
  discount: number | null;
}) {
  const fmt = (n: number) =>
    `${n.toLocaleString("tr-TR", { maximumFractionDigits: 0 })} TL`;
  return (
    <span className="inline-flex items-baseline gap-2">
      <span className="text-[var(--foreground)] tabular-nums text-[13px]">
        {fmt(current)}
      </span>
      {original && original > current && (
        <>
          <span className="text-[var(--muted-2)] line-through tabular-nums">
            {fmt(original)}
          </span>
          {discount != null && (
            <span className="text-[var(--red)] tabular-nums">
              {discount > 0 ? `−${discount.toFixed(0)}%` : `${discount.toFixed(0)}%`}
            </span>
          )}
        </>
      )}
    </span>
  );
}

function CountStat({
  label,
  count,
  dot,
  tone,
}: {
  label: string;
  count: number;
  dot: string;
  tone: string;
}) {
  return (
    <div className="flex items-baseline gap-3">
      <span className={`status-dot ${dot}`} />
      <div>
        <div className={`tabular-nums text-[20px] font-serif italic leading-none ${tone}`}>
          {count}
        </div>
        <div className="text-[10px] tracking-[0.22em] uppercase text-[var(--muted-2)] mt-1">
          {label}
        </div>
      </div>
    </div>
  );
}

function AlternativeCard({ alternative }: { alternative: Alternative }) {
  const savings = Math.round(alternative.savings);
  const savingsPct =
    alternative.price > 0 && alternative.savings > 0
      ? Math.round((alternative.savings / (alternative.price + alternative.savings)) * 100)
      : 0;

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="font-mono text-[10px] tracking-[0.32em] uppercase text-[var(--muted)] mb-5 flex items-center gap-3">
        <span className="h-px w-8 bg-[var(--accent)]" />
        <span>alternatif_öneri · daha_iyi_seçenek</span>
      </div>

      <div className="corner-frame relative border border-[var(--accent)]/40 bg-[var(--accent)]/[0.04]">
        <span className="c-tr" />
        <span className="c-bl" />

        <div className="flex items-center justify-between px-4 h-9 border-b border-[var(--accent)]/30 bg-black/30 font-mono text-[10px] tracking-[0.22em] uppercase">
          <div className="flex items-center gap-2.5 text-[var(--accent)]">
            <span className="status-dot status-dot-ok" />
            <span>BETTER_DEAL</span>
          </div>
          <span className="text-[var(--muted-2)]">{alternative.platform}</span>
        </div>

        <div className="p-5 lg:p-6 grid lg:grid-cols-[1fr_auto] gap-6 items-center">
          <div className="space-y-3 min-w-0">
            <div className="font-mono text-[10px] tracking-[0.22em] uppercase text-[var(--muted-2)]">
              {alternative.seller_name}
              {alternative.rating > 0 && (
                <>
                  <span className="mx-2 text-[var(--muted-2)]">·</span>
                  <span className="tabular-nums">
                    ★ {alternative.rating.toFixed(1)}
                  </span>
                </>
              )}
            </div>
            <p className="font-serif italic text-[clamp(1.2rem,2.2vw,1.6rem)] text-[var(--foreground)] leading-snug">
              Aynı ürün{" "}
              <span className="text-[var(--accent)] not-italic tabular-nums">
                {savings.toLocaleString("tr-TR")} TL
              </span>{" "}
              daha ucuza var
              {savingsPct > 0 && (
                <span className="text-[var(--muted)] text-[0.7em] ml-2 not-italic">
                  (%{savingsPct} tasarruf)
                </span>
              )}
              .
            </p>
            <a
              href={alternative.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 font-mono text-[11px] tracking-[0.22em] uppercase text-[var(--accent)] hover:text-[var(--accent-dim)] transition-colors"
            >
              <span>Karşılaştırmaya_git</span>
              <span className="font-sans">↗</span>
            </a>
          </div>

          <div className="text-right shrink-0 border-l border-[var(--accent)]/20 pl-6 hidden lg:block">
            <div className="font-mono text-[9px] tracking-[0.22em] uppercase text-[var(--muted-2)] mb-1">
              alternatif fiyat
            </div>
            <div className="font-serif italic tabular-nums text-[var(--accent)] text-[36px] leading-none">
              {alternative.price.toLocaleString("tr-TR")}
            </div>
            <div className="font-mono text-[10px] text-[var(--muted-2)] mt-1">
              TL
            </div>
          </div>
        </div>
      </div>
    </motion.section>
  );
}

function ActionLink({ href, label, sub }: { href: string; label: string; sub: string }) {
  return (
    <Link
      href={href}
      className="group bg-[var(--surface)]/40 hover:bg-[var(--surface)]/60 border border-[var(--border-strong)] hover:border-[var(--accent)]/60 p-4 text-left transition-colors flex flex-col justify-between min-h-[100px]"
    >
      <span className="font-mono text-[10px] tracking-[0.22em] uppercase text-[var(--accent-dim)] group-hover:text-[var(--accent)]">
        nav · {href}
      </span>
      <span className="mt-3 flex items-end justify-between gap-2">
        <span className="min-w-0">
          <span className="block font-mono text-[12px] tracking-[0.22em] uppercase text-[var(--foreground)]/85">
            {label}
          </span>
          <span className="block text-[11px] text-[var(--muted-2)] mt-1.5 normal-case tracking-normal font-sans">
            {sub}
          </span>
        </span>
        <span className="font-sans text-[var(--muted)] group-hover:text-[var(--accent)] group-hover:translate-x-0.5 transition-all shrink-0">
          →
        </span>
      </span>
    </Link>
  );
}

function FinalExplanationOnly({
  finalExplanation,
  verdict,
  overallScore,
  durationMs,
}: {
  finalExplanation: string;
  verdict: Verdict;
  overallScore: number;
  durationMs: number;
}) {
  // Decision Agent (#24) gelmeden önce reasoning_steps boş — sadece final açıklama
  return (
    <ReasoningPanel
      steps={[]}
      finalExplanation={finalExplanation}
      verdict={verdict}
      overallScore={overallScore}
      durationMs={durationMs}
      variant="static"
    />
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

function ScoreExportButton({
  score,
  verdict,
  productTitle,
}: {
  score: number;
  verdict: Verdict;
  productTitle?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="group bg-[var(--surface)]/40 hover:bg-[var(--surface)]/70 border border-[var(--border-strong)] hover:border-[var(--accent)]/60 p-4 text-left transition-colors flex flex-col justify-between min-h-[100px] w-full"
      >
        <span className="font-mono text-[10px] tracking-[0.22em] uppercase text-[var(--accent-dim)] group-hover:text-[var(--accent)]">
          export · skor
        </span>
        <span className="mt-3">
          <span className="block font-mono text-[12px] tracking-[0.22em] uppercase text-[var(--foreground)]/85">
            Skor İndir
          </span>
          <span className="block text-[11px] text-[var(--muted-2)] mt-1.5 normal-case tracking-normal font-sans">
            SVG veya PNG olarak
          </span>
        </span>
      </button>

      {open && (
        <div className="absolute bottom-full mb-2 left-0 right-0 bg-[var(--surface)] border border-[var(--border-strong)] p-2 space-y-1 z-10">
          <button
            type="button"
            onClick={() => {
              downloadSVG(score, verdict, productTitle);
              setOpen(false);
            }}
            className="w-full text-left px-3 py-2 font-mono text-[10px] tracking-[0.18em] uppercase text-[var(--muted)] hover:text-[var(--accent)] hover:bg-[var(--accent)]/[0.05] transition-colors"
          >
            ↓ SVG
          </button>
          <button
            type="button"
            onClick={() => {
              downloadPNG(score, verdict, productTitle);
              setOpen(false);
            }}
            className="w-full text-left px-3 py-2 font-mono text-[10px] tracking-[0.18em] uppercase text-[var(--muted)] hover:text-[var(--accent)] hover:bg-[var(--accent)]/[0.05] transition-colors"
          >
            ↓ PNG (2x)
          </button>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────

function sortLayers(layers: LayerResult[]): LayerResult[] {
  return [...layers].sort((a, b) => {
    const pa = STATUS_PRIORITY[a.status] ?? 4;
    const pb = STATUS_PRIORITY[b.status] ?? 4;
    if (pa !== pb) return pa - pb;
    return (a.layer_id ?? "").localeCompare(b.layer_id ?? "");
  });
}

function countByStatus(layers: LayerResult[]): Record<string, number> {
  const counts: Record<string, number> = { RISK: 0, WARN: 0, OK: 0, INFO: 0 };
  for (const l of layers) {
    counts[l.status] = (counts[l.status] ?? 0) + 1;
  }
  return counts;
}

function shortUrl(url: string): string {
  try {
    const u = new URL(url);
    const path = u.pathname.length > 32 ? `${u.pathname.slice(0, 30)}…` : u.pathname;
    return `${u.host}${path}`;
  } catch {
    return url;
  }
}

function formatRelative(iso: string): string {
  try {
    const d = new Date(iso).getTime();
    const diff = Date.now() - d;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "az önce";
    if (mins < 60) return `${mins} dk önce`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs} saat önce`;
    const days = Math.floor(hrs / 24);
    return `${days} gün önce`;
  } catch {
    return iso;
  }
}
