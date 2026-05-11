"use client";

import { useState } from "react";

import type { LayerResult } from "@/lib/api";
import { LayerCard } from "./LayerCard";

// ───────────────────────────────────────────────────────────────────────────
// Mock LayerResults — 7 katman, dört statü gösterimi
// ───────────────────────────────────────────────────────────────────────────

const MOCK_LAYERS: LayerResult[] = [
  {
    layer_id: "review",
    name: "Sahte Yorum Tespiti",
    status: "RISK",
    score: 24,
    finding:
      "50 yorumun %24'i şüpheli görünüyor; kısa sürede yorum patlaması tespit edildi",
    details: {
      total_reviews: 50,
      suspicious_count: 12,
      suspicious_pct: 24.0,
      burst_detected: true,
      tfidf_suspicious_indices: [3, 7, 12, 19, 24, 31, 38, 41],
      gemini_suspicious_indices: [3, 12, 19, 24, 31, 38, 41, 45],
      gemini_reasoning:
        "Yorumların büyük çoğunluğu jenerik kalıplar içeriyor: 'çok güzel ürün', 'tavsiye ederim', 'harika kalite'. Aynı 12 saatlik dilimde 30+ yorum giren bir patlama deseni mevcut.",
    },
    confidence: 0.85,
  },
  {
    layer_id: "discount",
    name: "Sahte İndirim Tespiti",
    status: "RISK",
    score: 30,
    finding:
      "Sahte indirim şüphesi: %62 indirim iddia ediliyor ama gerçek baz fiyata göre fiyat şişirilmiş",
    details: {
      baseline_price: 3299,
      min_price_90d: 1899,
      max_price_90d: 4999,
      true_discount_pct: -42.4,
      price_current: 1899,
      price_original_claimed: 4999,
      discount_pct_claimed: 62.0,
      flags: [
        "'indirim öncesi fiyat' (4999 TL) baz fiyatın çok üzerinde (3299 TL)",
        "indirimden önce yapay fiyat şişirmesi: 3299 TL'den 4999 TL'ye",
      ],
    },
    confidence: 0.9,
  },
  {
    layer_id: "manipulation",
    name: "Manipülatif Tasarım",
    status: "RISK",
    score: 20,
    finding: "2 manipülatif kalıp: Sahte aciliyet, Sahte sosyal kanıt",
    details: {
      pattern_count: 2,
      high_severity_count: 1,
      urgency_indicators: [
        "Son 2 ürün kaldı!",
        "847 kişi izliyor",
        "12 saat içinde bitiyor",
      ],
      gemini_summary: "Yüksek seviye manipülasyon tespit edildi",
    },
    confidence: 0.8,
  },
  {
    layer_id: "seller",
    name: "Satıcı Profili",
    status: "WARN",
    score: 45,
    finding: "Satıcıda 4 sorun tespit edildi: çok yeni satıcı (10 gün)",
    details: {
      seller_name: "TechStore_2026",
      age_days: 10,
      total_products: 2,
      rating: 3.8,
      rating_count: 4,
      is_verified: false,
      flags: [
        "çok yeni satıcı (10 gün)",
        "çok az ürün (2)",
        "az değerlendirme (4)",
        "doğrulanmamış satıcı",
      ],
    },
    confidence: 0.9,
  },
  {
    layer_id: "visual",
    name: "Görsel Doğrulama",
    status: "WARN",
    score: 55,
    finding: "Stok fotoğraf kullanılmış, logo tutarsızlığı tespit edildi",
    details: {
      authenticity_score: 55,
      is_stock_photo: true,
      logo_consistency: "suspicious",
      ai_generated_likelihood: 0.15,
      replica_risk: "medium",
      flags: ["Apple logosu farklı tonlarda", "Profesyonel olmayan ürün açısı"],
    },
    confidence: 0.75,
  },
  {
    layer_id: "crossplatform",
    name: "Çapraz Platform",
    status: "OK",
    score: 78,
    finding:
      "Hepsiburada'da aynı ürün 1.799 TL'ye bulundu — daha güvenilir alternatif mevcut",
    details: {
      best_alternative: { platform: "hepsiburada", price: 1799, savings: 100 },
      results_found: 4,
      avg_price: 1950,
      cheapest_seller: "Apple_Official_Store",
    },
    confidence: 0.82,
  },
  {
    layer_id: "phishing",
    name: "Phishing Tarama",
    status: "INFO",
    score: null,
    finding: "Görsel yüklenmedi, analiz atlandı",
    details: {},
    confidence: 0.0,
  },
];

const STATUS_ORDER: Record<string, number> = { RISK: 0, WARN: 1, OK: 2, INFO: 3 };

export function LayerCardShowcase() {
  const [sortBy, setSortBy] = useState<"layer" | "status">("layer");
  const [seed, setSeed] = useState(0);

  const sorted = [...MOCK_LAYERS].sort((a, b) => {
    if (sortBy === "status") {
      return STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
    }
    return 0;
  });

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--foreground)]">
      {/* Top diagnostic bar */}
      <div className="border-b border-[var(--border)] bg-[var(--surface)]/40 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-[1400px] mx-auto px-6 h-10 flex items-center justify-between font-mono text-[10px] tracking-[0.18em] uppercase">
          <div className="flex items-center gap-6 text-[var(--muted)]">
            <span className="flex items-center gap-2 text-[var(--foreground)]">
              <span className="status-dot status-dot-warn live-pulse" />
              dev / layer-card
            </span>
            <span className="hidden sm:inline text-[var(--muted-2)]">
              v0.1.0 · QA
            </span>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => setSortBy(sortBy === "layer" ? "status" : "layer")}
              className="text-[var(--muted)] hover:text-[var(--accent)] transition-colors"
            >
              sort_by: {sortBy} ↕
            </button>
            <button
              onClick={() => setSeed((s) => s + 1)}
              className="text-[var(--accent)] hover:text-[var(--foreground)] transition-colors"
            >
              replay ↻
            </button>
          </div>
        </div>
      </div>

      <main className="max-w-[1400px] mx-auto px-6 py-12 lg:py-16 space-y-20">
        {/* Hero */}
        <header className="space-y-4">
          <div className="font-mono text-[10px] tracking-[0.32em] uppercase text-[var(--muted)] flex items-center gap-3">
            <span className="h-px w-8 bg-[var(--accent)]" />
            <span>component · LayerCard</span>
          </div>
          <h1 className="font-serif text-[clamp(2.4rem,5vw,4rem)] leading-[0.95] tracking-[-0.02em]">
            Yedi ayrı{" "}
            <span className="italic text-[var(--accent)]">dosya</span>, yedi
            ayrı gerekçe.
          </h1>
          <p className="max-w-2xl text-[14px] leading-relaxed text-[var(--muted)]">
            Her katman bir adli vaka dosyası: kod, method, statü, skor, finding,
            confidence ve genişletilebilir typed detay tablosu. Üç varyant:
            compact (history satırı), default (scan detail), expanded (default
            + açık).
          </p>
        </header>

        {/* SECTION 1 — Default variant, all 7 layers */}
        <section key={`default-${seed}`}>
          <SectionHeader
            title="Default"
            sub={`7 katman · ${sortBy === "status" ? "statüye göre sıralı" : "katman sırasıyla"}`}
          />
          <div className="grid lg:grid-cols-2 gap-6">
            {sorted.map((layer, i) => (
              <LayerCard
                key={layer.layer_id}
                result={layer}
                variant="default"
                delay={i * 80}
              />
            ))}
          </div>
        </section>

        {/* SECTION 2 — Compact variant */}
        <section key={`compact-${seed}`}>
          <SectionHeader title="Compact" sub="History listesi için tek-satır" />
          <div className="space-y-2 max-w-3xl">
            {sorted.map((layer, i) => (
              <LayerCard
                key={layer.layer_id}
                result={layer}
                variant="compact"
                delay={i * 50}
              />
            ))}
          </div>
        </section>

        {/* SECTION 3 — Expanded variant */}
        <section key={`expanded-${seed}`}>
          <SectionHeader
            title="Expanded"
            sub="Default + detay paneli açık"
          />
          <div className="grid lg:grid-cols-2 gap-6">
            {sorted.slice(0, 2).map((layer, i) => (
              <LayerCard
                key={layer.layer_id}
                result={layer}
                variant="expanded"
                delay={i * 100}
              />
            ))}
          </div>
        </section>

        {/* Detail rendering reference */}
        <section className="border-t border-[var(--border)] pt-12">
          <div className="font-mono text-[10px] tracking-[0.28em] uppercase text-[var(--muted-2)] mb-6">
            Detail value renderer
          </div>
          <ul className="grid sm:grid-cols-2 gap-x-8 gap-y-2 font-mono text-[11px]">
            <li className="flex justify-between border-b border-[var(--border)] py-1.5">
              <span className="text-[var(--muted-2)]">number</span>
              <span className="text-[var(--foreground)] tabular-nums">12.345</span>
            </li>
            <li className="flex justify-between border-b border-[var(--border)] py-1.5">
              <span className="text-[var(--muted-2)]">boolean true</span>
              <span className="text-[var(--yellow)]">true</span>
            </li>
            <li className="flex justify-between border-b border-[var(--border)] py-1.5">
              <span className="text-[var(--muted-2)]">boolean false</span>
              <span className="text-[var(--muted)]">false</span>
            </li>
            <li className="flex justify-between border-b border-[var(--border)] py-1.5">
              <span className="text-[var(--muted-2)]">string</span>
              <span className="text-[var(--foreground)]">&ldquo;value&rdquo;</span>
            </li>
            <li className="flex justify-between border-b border-[var(--border)] py-1.5">
              <span className="text-[var(--muted-2)]">array (small)</span>
              <span className="text-[var(--muted)]">[1, 2, 3]</span>
            </li>
            <li className="flex justify-between border-b border-[var(--border)] py-1.5">
              <span className="text-[var(--muted-2)]">array (long)</span>
              <span className="text-[var(--muted)]">
                [1, 2, 3, 4 <span className="text-[var(--accent-dim)]">+12</span>]
              </span>
            </li>
            <li className="flex justify-between border-b border-[var(--border)] py-1.5">
              <span className="text-[var(--muted-2)]">null</span>
              <span className="text-[var(--muted-2)]">null</span>
            </li>
            <li className="flex justify-between border-b border-[var(--border)] py-1.5">
              <span className="text-[var(--muted-2)]">object</span>
              <span className="text-[var(--muted)]">{`{ key: "v", n: 2 }`}</span>
            </li>
          </ul>
        </section>
      </main>
    </div>
  );
}

function SectionHeader({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="flex items-baseline justify-between mb-8 pb-4 border-b border-[var(--border)]">
      <h2 className="font-serif italic text-[2.4rem] leading-none text-[var(--foreground)]">
        {title}
      </h2>
      <span className="font-mono text-[10px] tracking-[0.22em] uppercase text-[var(--muted)]">
        {sub}
      </span>
    </div>
  );
}
