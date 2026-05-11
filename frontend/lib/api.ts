/**
 * TrustLens AI — typed API client (TASK-16)
 * Tüm fetch çağrıları bu dosyadan geçer.
 */

const API_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "http://localhost:8000";

// ---------------------------------------------------------------------------
// Types — backend ScanResult ile birebir
// ---------------------------------------------------------------------------

export type LayerStatus = "RISK" | "WARN" | "OK" | "INFO";
export type Verdict = "BUY" | "CAUTION" | "AVOID";

export type LayerResult = {
  layer_id: string;
  name: string;
  status: LayerStatus;
  score: number | null;
  finding: string;
  details: Record<string, unknown>;
  confidence: number;
};

export type SellerData = {
  name: string;
  age_days: number | null;
  total_products: number | null;
  rating: number | null;
  rating_count: number | null;
  is_verified: boolean;
};

export type ProductData = {
  url: string;
  platform: string;
  title: string;
  price_current: number;
  price_original: number | null;
  discount_pct: number | null;
  images: string[];
  description: string;
  seller: SellerData;
  rating_avg: number;
  review_count_total: number;
  scraped_at: string;
};

export type ReasoningStep = { step: number; content: string };

export type ScanResult = {
  scan_id: string;
  url: string;
  product: ProductData;
  overall_score: number;
  verdict: Verdict;
  layer_results: Record<string, LayerResult>;
  reasoning_steps: ReasoningStep[];
  final_explanation: string;
  alternative: unknown | null;
  duration_ms: number;
  created_at: string;
};

// ---------------------------------------------------------------------------
// API errors
// ---------------------------------------------------------------------------

export class ApiError extends Error {
  status: number;
  detail: string;

  constructor(status: number, detail: string) {
    super(detail);
    this.name = "ApiError";
    this.status = status;
    this.detail = detail;
  }
}

// ---------------------------------------------------------------------------
// Endpoints
// ---------------------------------------------------------------------------

export async function postScan(
  url: string,
  options: { signal?: AbortSignal; force_refresh?: boolean } = {},
): Promise<ScanResult> {
  const res = await fetch(`${API_URL}/api/scan`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url, force_refresh: options.force_refresh ?? false }),
    signal: options.signal,
  });

  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    try {
      const body = await res.json();
      detail = body?.detail ?? detail;
    } catch {
      // ignore json parse
    }
    throw new ApiError(res.status, detail);
  }

  return res.json();
}

// ---------------------------------------------------------------------------
// Demo URL'leri (TASK-29 öncesi mock match için)
// ---------------------------------------------------------------------------

export const DEMO_SCENARIOS = [
  {
    id: "airpods_fake",
    label: "AirPods Pro 2",
    url: "https://www.trendyol.com/apple-airpods-pro-2nd-gen-p-123456",
    expected: "AVOID",
    color: "red",
    note: "Sahte indirim + bot yorumlar",
  },
  {
    id: "watch_genuine",
    label: "Casio G-Shock",
    url: "https://www.trendyol.com/casio-g-shock-ga-2100-1aer-p-987654",
    expected: "BUY",
    color: "green",
    note: "Gerçek indirim, doğrulanmış satıcı",
  },
  {
    id: "laptop_suspicious",
    label: "Xiaomi RedmiBook",
    url: "https://www.hepsiburada.com/xiaomi-redmibook-pro-15-p-HBC0000XXXXX",
    expected: "CAUTION",
    color: "yellow",
    note: "Yeni satıcı, hafif pump",
  },
] as const;
