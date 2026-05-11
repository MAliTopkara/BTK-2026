"use client";

import { useState } from "react";

import type { ReasoningStep, Verdict } from "@/lib/api";
import { ReasoningPanel } from "./ReasoningPanel";

type Scenario = {
  id: string;
  title: string;
  verdict: Verdict;
  overallScore: number;
  durationMs: number;
  steps: ReasoningStep[];
  finalExplanation: string;
};

const SCENARIOS: Scenario[] = [
  {
    id: "avoid_airpods",
    title: "Apple AirPods Pro 2 · trendyol",
    verdict: "AVOID",
    overallScore: 34,
    durationMs: 16100,
    steps: [
      {
        step: 1,
        content:
          "Önce fiyat geçmişine baktım — 3.299 TL'den 4.999 TL'ye 8 hafta içinde kademeli olarak şişirilmiş. Bu tipik bir 'pump and dump' deseni.",
      },
      {
        step: 2,
        content:
          "Yorumları taradım — 50 yorumun 30'u jenerik kalıplar içeriyor, hepsi de 12 saatlik dilimde kümelenmiş. Bot patlaması veya organize ödüllü kampanya işareti.",
      },
      {
        step: 3,
        content:
          "Sayfada 'Son 2 ürün kaldı' ve '847 kişi izliyor' uyarıları var ama stok aslında yüksek. İki ayrı dark pattern doğrulandı.",
      },
      {
        step: 4,
        content:
          "Satıcı 10 günlük, 2 ürünlü, doğrulanmamış — yeni mağaza profili tüm risk göstergelerini taşıyor.",
      },
      {
        step: 5,
        content:
          "Tüm sinyaller aynı yönde işaret ediyor. Bu yüzden ALMA diyorum, çünkü hem fiyat manipülasyonu hem sahte sosyal kanıt hem de güvensiz satıcı birlikte mevcut.",
      },
    ],
    finalExplanation:
      "Bu ürünü almamanı öneriyorum, çünkü dört bağımsız katman bir arada yüksek risk sinyali veriyor — pompalanmış fiyat, bot yorumları, dark pattern manipülasyonu ve doğrulanmamış yeni satıcı. Tek başına herhangi biri görmezden gelinebilir ama birlikte göründüklerinde organize bir tuzak deseni belirginleşiyor.",
  },
  {
    id: "caution_laptop",
    title: "Xiaomi RedmiBook Pro 15 · hepsiburada",
    verdict: "CAUTION",
    overallScore: 58,
    durationMs: 14300,
    steps: [
      {
        step: 1,
        content:
          "Fiyat 26.990 TL'den 29.990 TL'ye atlamış, sonra kademeli düşmüş — hafif pump izi var ama agresif değil.",
      },
      {
        step: 2,
        content:
          "Yorumlarda anormal kalıp yok ama satıcı yeni hesap, doğrulama eksik.",
      },
      {
        step: 3,
        content:
          "Görseller stok fotoğraf, marka logoları yer yer tutarsız — replika ihtimali orta düzeyde.",
      },
      {
        step: 4,
        content:
          "Hepsiburada'da aynı ürün başka bir satıcıda daha düşük fiyatta var. Bu sinyallerin tamamı tek başına yıkıcı değil ama biriken risk dikkatli olmanı gerektiriyor.",
      },
    ],
    finalExplanation:
      "Bu ürünü almak istiyorsan dikkatli ol: yüksek risk yok ama dört farklı katman düşük-orta seviyede uyarı veriyor. Daha güvenilir bir satıcı bulup karşılaştırmanı öneriyorum.",
  },
  {
    id: "buy_casio",
    title: "Casio G-Shock GA-2100 · trendyol",
    verdict: "BUY",
    overallScore: 87,
    durationMs: 12800,
    steps: [
      {
        step: 1,
        content:
          "Fiyat 90 günde stabil seyretmiş — pump izi yok, indirim oranı (%11) gerçek ve makul.",
      },
      {
        step: 2,
        content:
          "Yorumlar özgün, farklı tarihlerde girilmiş, kişisel detay içeriyor (kayış uzunluğu, ışık fonksiyonu vs.).",
      },
      {
        step: 3,
        content:
          "Satıcı 2 yıllık, doğrulanmış mağaza, 4.8 puan, 200+ değerlendirmeyle güvenilir profil.",
      },
      {
        step: 4,
        content:
          "Sayfada manipülatif aciliyet sinyali yok, görseller orijinal Casio fotoğrafları.",
      },
      {
        step: 5,
        content:
          "Sinyallerin tamamı temiz, çapraz platformda da fiyat tutarlı. Bu yüzden AL diyorum, gönül rahatlığıyla.",
      },
    ],
    finalExplanation:
      "Bu ürünü alabilirsin — yedi katmanın tamamı temiz çıktı. Fiyatı dürüst, satıcısı doğrulanmış, yorumları özgün, görselleri orijinal. Daha güvenilir bir kombinasyon zor bulunur.",
  },
];

const VARIANTS = ["static", "live", "thinking"] as const;
type Variant = (typeof VARIANTS)[number];

export function ReasoningPanelShowcase() {
  const [variant, setVariant] = useState<Variant>("static");
  const [scenarioIdx, setScenarioIdx] = useState(0);
  const [seed, setSeed] = useState(0);

  const scenario = SCENARIOS[scenarioIdx];

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--foreground)]">
      {/* Top diagnostic bar */}
      <div className="border-b border-[var(--border)] bg-[var(--surface)]/40 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-[1400px] mx-auto px-6 h-10 flex items-center justify-between font-mono text-[10px] tracking-[0.18em] uppercase">
          <div className="flex items-center gap-6 text-[var(--muted)]">
            <span className="flex items-center gap-2 text-[var(--foreground)]">
              <span className="status-dot status-dot-warn live-pulse" />
              dev / reasoning-panel
            </span>
            <span className="hidden sm:inline text-[var(--muted-2)]">
              v0.1.0 · QA
            </span>
          </div>

          <button
            onClick={() => setSeed((s) => s + 1)}
            className="text-[var(--accent)] hover:text-[var(--foreground)] transition-colors"
          >
            replay ↻
          </button>
        </div>
      </div>

      <main className="max-w-[1400px] mx-auto px-6 py-12 lg:py-16 space-y-16">
        {/* Hero */}
        <header className="space-y-4">
          <div className="font-mono text-[10px] tracking-[0.32em] uppercase text-[var(--muted)] flex items-center gap-3">
            <span className="h-px w-8 bg-[var(--accent)]" />
            <span>component · ReasoningPanel</span>
          </div>
          <h1 className="font-serif text-[clamp(2.4rem,5vw,4rem)] leading-[0.95] tracking-[-0.02em]">
            Karar zincirini{" "}
            <span className="italic text-[var(--accent)]">okumak</span>.
          </h1>
          <p className="max-w-2xl text-[14px] leading-relaxed text-[var(--muted)]">
            Decision Engine&apos;in 4-6 adımlık akıl yürütme zinciri ve final
            açıklaması. Adli muhasebecinin yazılı ifadesi gibi tasarlandı —
            ölçülü, kanıt sıralı, kesin bir sonuca varan. Üç variant: static,
            live (typewriter), thinking (shimmer placeholder).
          </p>
        </header>

        {/* Variant selector */}
        <div className="flex flex-wrap items-center justify-between gap-6 pb-6 border-b border-[var(--border-strong)]">
          <div className="flex items-center gap-3">
            <span className="font-mono text-[10px] tracking-[0.22em] uppercase text-[var(--muted-2)]">
              variant
            </span>
            <div className="flex border border-[var(--border-strong)]">
              {VARIANTS.map((v) => (
                <button
                  key={v}
                  onClick={() => {
                    setVariant(v);
                    setSeed((s) => s + 1);
                  }}
                  className={`px-4 py-2 font-mono text-[10px] tracking-[0.22em] uppercase transition-colors border-r border-[var(--border-strong)] last:border-r-0 ${
                    variant === v
                      ? "bg-[var(--accent)] text-black"
                      : "bg-transparent text-[var(--muted)] hover:text-[var(--foreground)]"
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>

          {variant !== "thinking" && (
            <div className="flex items-center gap-3">
              <span className="font-mono text-[10px] tracking-[0.22em] uppercase text-[var(--muted-2)]">
                senaryo
              </span>
              <div className="flex border border-[var(--border-strong)]">
                {SCENARIOS.map((s, i) => (
                  <button
                    key={s.id}
                    onClick={() => {
                      setScenarioIdx(i);
                      setSeed((seed) => seed + 1);
                    }}
                    className={`px-3 py-2 font-mono text-[10px] tracking-[0.22em] uppercase transition-colors border-r border-[var(--border-strong)] last:border-r-0 ${
                      scenarioIdx === i
                        ? "bg-[var(--foreground)]/10 text-[var(--foreground)]"
                        : "bg-transparent text-[var(--muted)] hover:text-[var(--foreground)]"
                    }`}
                  >
                    {s.verdict}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Live demo */}
        <section key={seed}>
          <div className="mb-6 flex items-baseline justify-between">
            <h2 className="font-serif italic text-[1.8rem] text-[var(--foreground)]">
              {variant === "thinking" ? "Thinking…" : scenario.title}
            </h2>
            <span className="font-mono text-[10px] tracking-[0.22em] uppercase text-[var(--muted)]">
              {variant}
            </span>
          </div>

          <ReasoningPanel
            steps={scenario.steps}
            finalExplanation={scenario.finalExplanation}
            verdict={scenario.verdict}
            overallScore={scenario.overallScore}
            durationMs={scenario.durationMs}
            variant={variant}
          />
        </section>

        {/* Static — all three side-by-side */}
        {variant !== "thinking" && (
          <section className="border-t border-[var(--border)] pt-12">
            <div className="font-mono text-[10px] tracking-[0.28em] uppercase text-[var(--muted-2)] mb-6">
              Tüm senaryolar · static
            </div>
            <div className="space-y-8">
              {SCENARIOS.map((s) => (
                <ReasoningPanel
                  key={s.id}
                  steps={s.steps}
                  finalExplanation={s.finalExplanation}
                  verdict={s.verdict}
                  overallScore={s.overallScore}
                  durationMs={s.durationMs}
                  variant="static"
                />
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
