/**
 * TrustLens AI — Ethics / Sustainability Score (TASK-40)
 * Client-side heuristic scorer: seller ethics, transparency, consumer rights.
 * No backend call — purely derived from existing ProductData fields.
 */

import type { ProductData } from "./api";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type EthicsTier = "ethical" | "acceptable" | "questionable";

export type EthicsDimension = {
  id: string;
  label: string;
  score: number; // 0-100
  maxScore: number;
  finding: string;
};

export type EthicsResult = {
  overall: number; // 0-100
  tier: EthicsTier;
  dimensions: EthicsDimension[];
  summary_tr: string;
};

// ---------------------------------------------------------------------------
// Tier thresholds
// ---------------------------------------------------------------------------

const TIER_THRESHOLDS: { min: number; tier: EthicsTier }[] = [
  { min: 70, tier: "ethical" },
  { min: 40, tier: "acceptable" },
  { min: 0, tier: "questionable" },
];

function getTier(score: number): EthicsTier {
  for (const t of TIER_THRESHOLDS) {
    if (score >= t.min) return t.tier;
  }
  return "questionable";
}

// ---------------------------------------------------------------------------
// Dimension scorers (each returns 0-100)
// ---------------------------------------------------------------------------

function scoreSeller(product: ProductData): EthicsDimension {
  let score = 50; // baseline
  const seller = product.seller;

  if (seller.is_verified) score += 20;
  if (seller.age_days != null) {
    if (seller.age_days > 365) score += 15;
    else if (seller.age_days > 180) score += 8;
    else if (seller.age_days < 30) score -= 15;
  }
  if (seller.rating != null) {
    if (seller.rating >= 4.5) score += 10;
    else if (seller.rating >= 4.0) score += 5;
    else if (seller.rating < 3.0) score -= 10;
  }
  if (seller.rating_count != null && seller.rating_count > 500) score += 5;

  score = clamp(score, 0, 100);

  let finding: string;
  if (score >= 70) finding = "Satıcı doğrulanmış ve köklü — etik risk düşük.";
  else if (score >= 40) finding = "Satıcı ortalama profilde — dikkatli ol.";
  else finding = "Yeni veya düşük puanlı satıcı — güvenilirlik sorgulanabilir.";

  return { id: "seller_ethics", label: "Satıcı Etiği", score, maxScore: 100, finding };
}

function scoreTransparency(product: ProductData): EthicsDimension {
  let score = 40; // baseline

  const descLen = product.description?.length ?? 0;
  if (descLen > 500) score += 20;
  else if (descLen > 200) score += 10;
  else if (descLen < 50) score -= 10;

  if (product.images.length >= 4) score += 15;
  else if (product.images.length >= 2) score += 8;
  else if (product.images.length === 0) score -= 10;

  if (product.price_original != null && product.price_original > 0) score += 10;

  if (product.review_count_total > 20) score += 10;
  else if (product.review_count_total === 0) score -= 5;

  score = clamp(score, 0, 100);

  let finding: string;
  if (score >= 70) finding = "Ürün bilgileri yeterli ve şeffaf sunulmuş.";
  else if (score >= 40) finding = "Bilgi eksikleri var — tam şeffaflık sağlanmamış.";
  else finding = "Yetersiz bilgi — tüketici olarak karar vermek zor.";

  return { id: "transparency", label: "Şeffaflık", score, maxScore: 100, finding };
}

function scoreConsumerRights(product: ProductData): EthicsDimension {
  let score = 80; // start high, deduct for bad signals

  const urgencyCount = product.urgency_indicators?.length ?? 0;
  score -= urgencyCount * 12;

  if (product.discount_pct != null && product.discount_pct > 70) {
    score -= 15;
  }

  if (product.seller.is_verified) score += 5;

  if (product.reviews.some((r) => r.verified_purchase)) score += 5;

  score = clamp(score, 0, 100);

  let finding: string;
  if (score >= 70) finding = "Baskı unsuru tespit edilmedi — tüketici hakları korunuyor.";
  else if (score >= 40) finding = "Aciliyet baskısı veya abartılı indirim mevcut.";
  else finding = "Ciddi manipülatif unsurlar — tüketici haklarına aykırı.";

  return { id: "consumer_rights", label: "Tüketici Hakları", score, maxScore: 100, finding };
}

function scoreSustainability(product: ProductData): EthicsDimension {
  let score = 55; // baseline

  if (product.seller.age_days != null && product.seller.age_days > 730) score += 15;
  else if (product.seller.age_days != null && product.seller.age_days < 60) score -= 10;

  if (product.review_count_total > 50) score += 10;

  const hasImageReviews = product.reviews.some((r) => r.has_image);
  if (hasImageReviews) score += 10;

  const verifiedCount = product.reviews.filter((r) => r.verified_purchase).length;
  if (verifiedCount > 3) score += 10;

  score = clamp(score, 0, 100);

  let finding: string;
  if (score >= 70) finding = "Uzun süredir aktif satıcı — sürdürülebilir ticaret sinyali.";
  else if (score >= 40) finding = "Orta vadeli satıcı — sürdürülebilirlik nötr.";
  else finding = "Kısa ömürlü satıcı profili — sürdürülebilirlik şüpheli.";

  return { id: "sustainability", label: "Sürdürülebilirlik", score, maxScore: 100, finding };
}

// ---------------------------------------------------------------------------
// Main compute function
// ---------------------------------------------------------------------------

export function computeEthicsScore(product: ProductData): EthicsResult {
  const dimensions = [
    scoreSeller(product),
    scoreTransparency(product),
    scoreConsumerRights(product),
    scoreSustainability(product),
  ];

  const weights = [0.30, 0.25, 0.30, 0.15];
  const overall = Math.round(
    dimensions.reduce((sum, d, i) => sum + d.score * weights[i], 0),
  );

  const tier = getTier(overall);

  let summary_tr: string;
  if (tier === "ethical") {
    summary_tr = "Bu ürün/satıcı etik ticaret standartlarına büyük ölçüde uyuyor.";
  } else if (tier === "acceptable") {
    summary_tr = "Bazı etik eksiklikler var ama ciddi bir sorun tespit edilmedi.";
  } else {
    summary_tr = "Etik açıdan endişe verici sinyaller mevcut — dikkatli karar ver.";
  }

  return { overall, tier, dimensions, summary_tr };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}
