import Link from "next/link";

type Props = {
  step: string;       // "01 / 02"
  eyebrow: string;    // "Erişim"
  title: React.ReactNode;
  intro: React.ReactNode;
  children: React.ReactNode;  // form
  switchHref: string;
  switchLabel: string;
  switchCta: string;
};

export function AuthShell({
  step,
  eyebrow,
  title,
  intro,
  children,
  switchHref,
  switchLabel,
  switchCta,
}: Props) {
  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Background layers */}
      <div className="absolute inset-0 grid-bg pointer-events-none opacity-70" />
      <div className="absolute inset-0 console-glow pointer-events-none" />

      <main className="relative max-w-[1400px] mx-auto px-6 pt-12 pb-16 lg:pt-20 lg:pb-24 grid lg:grid-cols-12 gap-12 lg:gap-20 items-start">
        {/* Left: editorial + diagnostic */}
        <section className="lg:col-span-6 lg:pt-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 font-mono text-[10px] tracking-[0.22em] uppercase text-[var(--muted)] hover:text-[var(--accent)] transition-colors mb-12"
          >
            <span className="text-[var(--accent)]">←</span>
            <span>geri / ana_sayfa</span>
          </Link>

          <div className="font-mono text-[10px] tracking-[0.32em] uppercase text-[var(--muted)] mb-10 flex items-center gap-3">
            <span className="h-px w-8 bg-[var(--accent)]" />
            <span>{step} / {eyebrow}</span>
          </div>

          <h1 className="font-serif text-[clamp(2.6rem,6vw,5rem)] leading-[0.95] tracking-[-0.02em] text-[var(--foreground)]">
            {title}
          </h1>

          <div className="mt-8 max-w-md text-[14px] leading-relaxed text-[var(--muted)]">
            {intro}
          </div>
        </section>

        {/* Right: form */}
        <section className="lg:col-span-6 w-full">
          {children}

          <div className="mt-8 pt-6 border-t border-[var(--border)] flex items-center justify-between font-mono text-[10px] tracking-[0.22em] uppercase">
            <span className="text-[var(--muted)]">{switchLabel}</span>
            <Link
              href={switchHref}
              className="inline-flex items-center gap-2 text-[var(--accent)] hover:text-[var(--foreground)] transition-colors"
            >
              <span>{switchCta}</span>
              <span className="font-sans">→</span>
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
