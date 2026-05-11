"use client";

import { useEffect, useState } from "react";

type Case = {
  label: string;
  product: string;
  steps: string[];
  verdict: { label: string; tone: "risk" | "warn" | "ok" };
};

const cases: Case[] = [
  {
    label: "Demo / 001",
    product: "Apple AirPods Pro 2 · trendyol",
    steps: [
      "Önce fiyat geçmişine baktım — 3.299 TL'den 4.999 TL'ye kademeli olarak şişirilmiş.",
      "Yorumları taradım — 50 yorumun 30'u jenerik kalıplar içeriyor, 12 saatte kümelenmiş.",
      "Sayfada 'Son 2 ürün kaldı' uyarısı var ama stok aslında yüksek.",
      "Satıcı 10 günlük, 2 ürünlü, doğrulanmamış — yeni mağaza profili.",
      "Tüm sinyaller aynı yönde işaret ediyor. Bu yüzden ALMA diyorum.",
    ],
    verdict: { label: "ALMA · 34/100", tone: "risk" },
  },
  {
    label: "Demo / 002",
    product: "Xiaomi RedmiBook Pro 15 · hepsiburada",
    steps: [
      "Fiyat 26.990 TL'den 29.990 TL'ye atlamış, sonra kademeli düşmüş — hafif pump.",
      "Yorumlarda anormal yok ama satıcı yeni hesap, doğrulama eksik.",
      "Görseller stok fotoğraf, marka logoları yer yer tutarsız.",
      "Hepsiburada'da aynı ürün başka satıcıda daha düşük fiyatta var.",
      "Tek başına yıkıcı değil ama biriken sinyaller — DİKKATLİ OL.",
    ],
    verdict: { label: "DİKKATLİ OL · 58/100", tone: "warn" },
  },
  {
    label: "Demo / 003",
    product: "Casio G-Shock GA-2100 · trendyol",
    steps: [
      "Fiyat 90 günde stabil seyretmiş — pump izi yok, indirim oranı gerçek.",
      "Yorumlar özgün, farklı tarihlerde, kişisel detay içeriyor.",
      "Satıcı 2 yıllık, doğrulanmış mağaza, 4.8 puan, 200+ değerlendirme.",
      "Sayfada manipülatif aciliyet sinyali yok, görseller orijinal.",
      "Sinyallerin tamamı temiz. Bu yüzden AL diyorum, gönül rahatlığıyla.",
    ],
    verdict: { label: "AL · 87/100", tone: "ok" },
  },
];

const toneStyles = {
  risk: { text: "text-[var(--red)]", border: "border-[var(--red)]/50", dot: "status-dot-risk" },
  warn: { text: "text-[var(--yellow)]", border: "border-[var(--yellow)]/50", dot: "status-dot-warn" },
  ok: { text: "text-[var(--accent)]", border: "border-[var(--accent)]/50", dot: "status-dot-ok" },
};

export function ReasoningSection() {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setIdx((i) => (i + 1) % cases.length);
    }, 9500);
    return () => clearInterval(interval);
  }, []);

  const current = cases[idx];
  const tone = toneStyles[current.verdict.tone];

  return (
    <section className="relative border-b border-[var(--border)] py-24 lg:py-32 overflow-hidden">
      <div className="absolute inset-0 grid-bg pointer-events-none opacity-60" />

      <div className="relative max-w-[1400px] mx-auto px-6 grid lg:grid-cols-12 gap-12 lg:gap-20 items-start">
        {/* Left: pull quote */}
        <div className="lg:col-span-5">
          <div className="font-mono text-[10px] tracking-[0.32em] uppercase text-[var(--muted)] mb-8 flex items-center gap-3">
            <span className="h-px w-8 bg-[var(--accent)]" />
            <span>03 / Akıl_Yürütme</span>
          </div>

          <blockquote className="font-serif text-[clamp(1.8rem,3.5vw,2.8rem)] leading-[1.05] tracking-[-0.01em] text-[var(--foreground)]">
            <span className="text-[var(--accent)]">&ldquo;</span>
            Bir sayı vermez,{" "}
            <span className="italic text-[var(--muted)]">
              gerekçesini gösterir.
            </span>{" "}
            Hangi sinyali nereden aldığını, neyi neye göre tarttığını adım adım
            söyler.
            <span className="text-[var(--accent)]">&rdquo;</span>
          </blockquote>

          <p className="mt-8 text-[13px] leading-relaxed text-[var(--muted)] max-w-md">
            Gemini 2.5 Pro&apos;nun{" "}
            <span className="font-mono text-[var(--accent-dim)]">thinking</span>{" "}
            modu, 7 katmanın çıktısını okur ve 4-6 cümlede Türkçe karar zinciri
            kurar. Karar gizli kalmaz.
          </p>
        </div>

        {/* Right: live reasoning terminal */}
        <div className="lg:col-span-7">
          <div className="corner-frame border border-[var(--border-strong)] bg-black/40 font-mono text-[12px]">
            <span className="c-tr" />
            <span className="c-bl" />

            {/* Terminal header */}
            <div className="flex items-center justify-between px-4 h-9 border-b border-[var(--border-strong)] bg-[var(--surface)]">
              <div className="flex items-center gap-2.5 text-[10px] tracking-[0.22em] uppercase text-[var(--muted)]">
                <span className="status-dot status-dot-ok live-pulse" />
                <span>{current.label}</span>
              </div>
              <div className="text-[10px] tracking-[0.18em] uppercase text-[var(--muted-2)] truncate max-w-[60%]">
                {current.product}
              </div>
            </div>

            {/* Reasoning steps */}
            <div className="p-5 space-y-3 min-h-[340px]">
              {current.steps.map((step, i) => (
                <div
                  key={`${idx}-${i}`}
                  className="flex items-start gap-3 opacity-0 animate-[fade-in_0.6s_ease-out_forwards]"
                  style={{ animationDelay: `${i * 0.45}s` }}
                >
                  <span className="font-mono text-[10px] text-[var(--accent)] mt-[3px] shrink-0 tabular-nums">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <p className="text-[13.5px] leading-relaxed text-[var(--foreground)]/85 font-sans">
                    {step}
                  </p>
                </div>
              ))}
            </div>

            {/* Verdict */}
            <div className="border-t border-[var(--border-strong)] bg-[var(--surface)] px-5 py-4 flex items-center justify-between">
              <div className="text-[9px] tracking-[0.22em] uppercase text-[var(--muted-2)]">
                Final
              </div>
              <div
                className={`inline-flex items-center gap-2 border ${tone.border} bg-black/40 px-3 py-1.5`}
              >
                <span className={`status-dot ${tone.dot}`} />
                <span className={`${tone.text} text-[11px] tracking-[0.22em] uppercase`}>
                  {current.verdict.label}
                </span>
              </div>
            </div>
          </div>

          {/* Case selector dots */}
          <div className="flex items-center gap-2 mt-6 font-mono text-[10px] tracking-[0.2em] uppercase text-[var(--muted-2)]">
            <span>senaryo</span>
            {cases.map((c, i) => (
              <button
                key={c.label}
                onClick={() => setIdx(i)}
                aria-label={`Senaryo ${i + 1}`}
                className={`h-1 transition-all ${
                  i === idx
                    ? "w-12 bg-[var(--accent)]"
                    : "w-6 bg-[var(--border-strong)] hover:bg-[var(--muted-2)]"
                }`}
              />
            ))}
            <span className="ml-auto">
              {String(idx + 1).padStart(2, "0")} / 0{cases.length}
            </span>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </section>
  );
}
