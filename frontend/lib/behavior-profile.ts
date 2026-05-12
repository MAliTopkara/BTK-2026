/**
 * Finansal Dijital İkiz Lite (TASK-37)
 * Kullanıcının aylık gelir/bütçe profilini localStorage'da tutar,
 * tarama sonucunu profil ışığında değerlendirir.
 *
 * Kalıcı saklama (Supabase behavior_profiles tablosu) → TASK-48.
 */

const KEY = "trustlens:behavior_profile";

export type BehaviorProfile = {
  monthly_income: number; // TL
  shopping_budget: number; // TL/ay
  payday: number; // 1-31
  updated_at: string; // ISO
};

// ─────────────────────────────────────────────────────────────────────────
// Storage
// ─────────────────────────────────────────────────────────────────────────

export function saveProfile(p: Omit<BehaviorProfile, "updated_at">): BehaviorProfile {
  const profile: BehaviorProfile = { ...p, updated_at: new Date().toISOString() };
  if (typeof window === "undefined") return profile;
  try {
    localStorage.setItem(KEY, JSON.stringify(profile));
  } catch {
    /* ignore */
  }
  return profile;
}

export function loadProfile(): BehaviorProfile | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as BehaviorProfile;
    if (
      typeof parsed.monthly_income !== "number" ||
      typeof parsed.shopping_budget !== "number" ||
      typeof parsed.payday !== "number"
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function clearProfile(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Computed: financial fit
// ─────────────────────────────────────────────────────────────────────────

export type FitTier = "comfortable" | "significant" | "stretch";

export type FinancialFit = {
  budget_pct: number; // 0-100, satın alım aylık bütçenin yüzde kaçı
  income_pct: number; // 0-100, satın alım aylık gelirin yüzde kaçı
  fit_tier: FitTier;
  days_until_payday: number | null;
  should_wait_48h: boolean;
  reasoning_tr: string;
};

export type FitInput = {
  profile: BehaviorProfile;
  price: number;
  trust_score?: number; // 0-100, varsa 48 saat kuralı buna da bakar
};

export function computeFit({ profile, price, trust_score }: FitInput): FinancialFit {
  const budget_pct = profile.shopping_budget > 0
    ? (price / profile.shopping_budget) * 100
    : 100;
  const income_pct = profile.monthly_income > 0
    ? (price / profile.monthly_income) * 100
    : 100;

  const fit_tier: FitTier =
    budget_pct < 10 ? "comfortable" : budget_pct < 30 ? "significant" : "stretch";

  const days_until_payday = computeDaysUntilPayday(profile.payday);

  const should_wait_48h =
    fit_tier === "stretch" || (trust_score !== undefined && trust_score < 60);

  const reasoning_tr = buildReasoning(fit_tier, budget_pct, income_pct, trust_score);

  return {
    budget_pct: round1(budget_pct),
    income_pct: round1(income_pct),
    fit_tier,
    days_until_payday,
    should_wait_48h,
    reasoning_tr,
  };
}

// ─────────────────────────────────────────────────────────────────────────
// Computed: impulse score
// ─────────────────────────────────────────────────────────────────────────

/**
 * Profilden basit impulse skoru türetir (0=disiplinli, 1=dürtüsel).
 * Mantık: bütçenin gelire oranı yüksekse, alışveriş öncelikli yaşam tarzı.
 * Gerçek davranış skoru TASK-49'da scan history embedding'leriyle gelecek.
 */
export function computeImpulseScore(p: BehaviorProfile): number {
  if (p.monthly_income <= 0) return 0.5;
  const ratio = p.shopping_budget / p.monthly_income;
  if (ratio < 0.05) return 0.15;
  if (ratio < 0.10) return 0.3;
  if (ratio < 0.20) return 0.45;
  if (ratio < 0.30) return 0.65;
  return 0.85;
}

export function impulseLabel(score: number): string {
  if (score < 0.25) return "çok ölçülü";
  if (score < 0.45) return "ölçülü";
  if (score < 0.65) return "ortalama";
  if (score < 0.8) return "alışverişe yatkın";
  return "yüksek dürtüsel";
}

// ─────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────

function computeDaysUntilPayday(payday: number): number | null {
  if (payday < 1 || payday > 31) return null;
  const today = new Date();
  const d = today.getDate();
  if (payday >= d) return payday - d;
  // sonraki ay
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  return daysInMonth - d + payday;
}

function buildReasoning(
  tier: FitTier,
  budgetPct: number,
  incomePct: number,
  trust?: number,
): string {
  const trustWarn = trust !== undefined && trust < 60
    ? " Trust skoru da düşük."
    : "";
  if (tier === "comfortable") {
    return `Bu satın alım aylık bütçenin %${round1(budgetPct)}'i — bütçeye rahatça uyuyor.`;
  }
  if (tier === "significant") {
    return `Bu satın alım aylık bütçenin %${round1(budgetPct)}'i — kayda değer ama yönetilebilir.${trustWarn}`;
  }
  return `Bu satın alım aylık bütçenin %${round1(budgetPct)}'i ve gelirin %${round1(incomePct)}'i — bütçeyi geriyor.${trustWarn}`;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

// ─────────────────────────────────────────────────────────────────────────
// Validation
// ─────────────────────────────────────────────────────────────────────────

export type ProfileError = { field: keyof BehaviorProfile; message: string };

export function validateProfile(input: {
  monthly_income: number;
  shopping_budget: number;
  payday: number;
}): ProfileError[] {
  const errors: ProfileError[] = [];
  if (!Number.isFinite(input.monthly_income) || input.monthly_income <= 0) {
    errors.push({ field: "monthly_income", message: "Aylık gelir 0'dan büyük olmalı" });
  }
  if (!Number.isFinite(input.shopping_budget) || input.shopping_budget <= 0) {
    errors.push({ field: "shopping_budget", message: "Bütçe 0'dan büyük olmalı" });
  }
  if (input.shopping_budget > input.monthly_income) {
    errors.push({
      field: "shopping_budget",
      message: "Bütçe gelirden büyük olamaz",
    });
  }
  if (
    !Number.isInteger(input.payday) ||
    input.payday < 1 ||
    input.payday > 31
  ) {
    errors.push({ field: "payday", message: "Maaş günü 1-31 arası olmalı" });
  }
  return errors;
}
