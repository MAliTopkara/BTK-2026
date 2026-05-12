import type { Metadata } from "next";

import { getDemoScan } from "@/lib/api";
import { DemoHeader } from "@/components/app/DemoHeader";

const SCENARIO_LABELS: Record<string, string> = {
  airpods_fake: "Apple AirPods Pro 2 — sahte indirim + bot yorumlar",
  watch_genuine: "Casio G-Shock — gerçek indirim, doğrulanmış satıcı",
  laptop_suspicious: "Xiaomi RedmiBook — şüpheli pump + yeni satıcı",
  phishing_sms: "Sahte Apple promosyonu — phishing SMS analizi",
};

const VERDICT_TR: Record<string, string> = {
  BUY: "AL",
  CAUTION: "DİKKATLİ OL",
  AVOID: "ALMA",
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ scenario: string }>;
}): Promise<Metadata> {
  const { scenario } = await params;
  const label = SCENARIO_LABELS[scenario] ?? scenario;

  let title = `Demo · ${label} — TrustLens AI`;
  let description =
    "TrustLens AI tarama çıktısı: 7 katman analizi, kanıtlı karar, açıklamalı reasoning.";

  try {
    const scan = await getDemoScan(scenario);
    const verdict = VERDICT_TR[scan.verdict] ?? scan.verdict;
    const productTitle = scan.product?.title ?? label;
    title = `${productTitle} → ${verdict} (${scan.overall_score}/100) · TrustLens AI`;
    description = `${scan.final_explanation || `7 katman analizi: ${verdict} · ${scan.overall_score}/100. Kanıtlı sonuç ve açıklamalı reasoning.`}`;
    if (description.length > 200) description = description.slice(0, 197) + "…";
  } catch {
    // backend ulaşılamadı — defaults
  }

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "article",
      url: `/demo/${scenario}`,
      siteName: "TrustLens AI",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

export default function DemoLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--foreground)]">
      <DemoHeader />
      {children}
    </div>
  );
}
