const layers = [
  {
    id: "01",
    name: "Sahte Yorum Tespiti",
    method: "TF-IDF + BURST + GEMINI",
    desc: "Bot ve AI üretimi yorumları, kısa süreli yorum patlamalarını ve klon metinleri ayırır.",
    sample: "12/50 şüpheli · burst tespit edildi",
  },
  {
    id: "02",
    name: "Sahte İndirim",
    method: "AKAKÇE 90D + PUMP DETECTION",
    desc: "Üzeri çizili \"orijinal fiyat\" geçmişte gerçekten var mıydı, yoksa son hafta mı şişti?",
    sample: "3.299 → 4.999 → 1.899 TL · pump",
  },
  {
    id: "03",
    name: "Manipülatif Tasarım",
    method: "URGENCY + GEMINI",
    desc: "Sahte aciliyet, sahte sosyal kanıt, confirmshaming, gizli maliyet kalıplarını sayar.",
    sample: "fake_urgency · fake_social_proof",
  },
  {
    id: "04",
    name: "Satıcı Profili",
    method: "RULE-BASED SCORING",
    desc: "Satıcının yaşı, ürün çeşitliliği, ortalama puanı ve doğrulama durumu.",
    sample: "10 gün · 2 ürün · doğrulanmamış",
  },
  {
    id: "05",
    name: "Görsel Doğrulama",
    method: "GEMINI VISION + PHASH",
    desc: "Stok fotoğraf, AI üretimi sentetik görsel, logo tutarsızlığı, replika işaretleri.",
    sample: "stok foto · logo tutarsız",
  },
  {
    id: "06",
    name: "Çapraz Platform",
    method: "MULTI-MERCHANT QUERY",
    desc: "Aynı ürünü daha güvenilir veya daha ucuz başka platformda bulur — risk değil, fırsat.",
    sample: "Hepsiburada 1.799 TL bulundu",
  },
  {
    id: "07",
    name: "Phishing Tarama",
    method: "OCR + USOM + PHISHTANK",
    desc: "SMS / e-posta görsellerini PTT, kargo, banka taklidi dolandırıcılık için tarar.",
    sample: "pttkargo-takip-sorgula.com",
  },
] as const;

export function LayerGrid() {
  return (
    <section
      id="layers"
      className="relative border-b border-[var(--border)] py-24 lg:py-32"
    >
      <div className="max-w-[1400px] mx-auto px-6">
        {/* Section header */}
        <div className="grid lg:grid-cols-12 gap-8 mb-16 items-end">
          <div className="lg:col-span-7">
            <div className="font-mono text-[10px] tracking-[0.32em] uppercase text-[var(--muted)] mb-6 flex items-center gap-3">
              <span className="h-px w-8 bg-[var(--accent)]" />
              <span>02 / Katmanlar</span>
            </div>
            <h2 className="font-serif text-[clamp(2.2rem,4.5vw,3.8rem)] leading-[0.98] tracking-[-0.015em] text-[var(--foreground)]">
              Tek bir &ldquo;güvenilir&rdquo;{" "}
              <span className="italic text-[var(--muted)]">yerine</span>
              <br />
              yedi ayrı kanıt.
            </h2>
          </div>
          <div className="lg:col-span-5">
            <p className="text-[14px] leading-relaxed text-[var(--muted)] max-w-md">
              Her katman bağımsız çalışır, kendi skorunu üretir ve kendi
              kanıtını sunar. Karar motoru bu yedi sinyali ağırlıklı olarak
              birleştirir — sonuç bir oy değil, bir{" "}
              <span className="text-[var(--foreground)] italic font-serif">
                gerekçe
              </span>
              .
            </p>
          </div>
        </div>

        {/* Layer cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 border-l border-t border-[var(--border-strong)]">
          {layers.map((l) => (
            <article
              key={l.id}
              className="group relative border-r border-b border-[var(--border-strong)] p-6 hover:bg-[var(--surface)]/60 transition-colors"
            >
              <div className="flex items-baseline justify-between mb-6">
                <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-[var(--muted-2)]">
                  Katman_{l.id}
                </span>
                <span className="font-serif italic text-3xl text-[var(--muted-2)] group-hover:text-[var(--accent)] transition-colors tabular-nums">
                  {l.id}
                </span>
              </div>

              <h3 className="font-serif italic text-[22px] leading-tight text-[var(--foreground)] mb-2">
                {l.name}
              </h3>

              <div className="font-mono text-[9px] tracking-[0.18em] uppercase text-[var(--accent-dim)] mb-4">
                {l.method}
              </div>

              <p className="text-[13px] leading-relaxed text-[var(--muted)] mb-6">
                {l.desc}
              </p>

              <div className="font-mono text-[10.5px] text-[var(--foreground)]/70 border-t border-[var(--border)] pt-3 flex items-start gap-2">
                <span className="text-[var(--accent)] shrink-0">{">"}</span>
                <span className="break-all">{l.sample}</span>
              </div>
            </article>
          ))}

          {/* Decision engine — highlighted 8th cell */}
          <article className="relative border-r border-b border-[var(--accent)]/40 p-6 bg-[var(--accent)]/[0.04] hover:bg-[var(--accent)]/[0.08] transition-colors col-span-1 sm:col-span-2 lg:col-span-1 group">
            <div className="flex items-baseline justify-between mb-6">
              <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-[var(--accent)]">
                Karar_Motoru
              </span>
              <span className="font-serif italic text-3xl text-[var(--accent)] tabular-nums">
                08
              </span>
            </div>

            <h3 className="font-serif italic text-[22px] leading-tight text-[var(--foreground)] mb-2">
              7 sinyali bir gerekçeye dönüştürür.
            </h3>

            <div className="font-mono text-[9px] tracking-[0.18em] uppercase text-[var(--accent)] mb-4">
              GEMINI 2.5 PRO · THINKING
            </div>

            <p className="text-[13px] leading-relaxed text-[var(--muted)] mb-6">
              Ağırlıklı ortalama, akıl yürütme zinciri ve nihai karar:{" "}
              <span className="text-[var(--foreground)]">AL / DİKKATLİ OL / ALMA</span>.
            </p>

            <div className="font-mono text-[10.5px] text-[var(--foreground)]/80 border-t border-[var(--accent)]/30 pt-3 flex items-start gap-2">
              <span className="text-[var(--accent)] shrink-0">{">"}</span>
              <span>4-6 adım Türkçe akıl yürütme</span>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}
