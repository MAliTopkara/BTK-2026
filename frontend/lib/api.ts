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

export type ReviewData = {
  text: string;
  rating: number;
  author_name: string | null;
  date: string | null;
  has_image: boolean;
  image_url: string | null;
  verified_purchase: boolean;
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
  reviews: ReviewData[];
  rating_avg: number;
  review_count_total: number;
  urgency_indicators: string[];
  raw_html: string | null;
  scraped_at: string;
};

export type ReasoningStep = { step: number; content: string };

export type Alternative = {
  platform: string;
  seller_name: string;
  price: number;
  savings: number;
  rating: number;
  url: string;
};

export type ScanResult = {
  scan_id: string;
  url: string;
  product: ProductData;
  overall_score: number;
  verdict: Verdict;
  layer_results: Record<string, LayerResult>;
  reasoning_steps: ReasoningStep[];
  final_explanation: string;
  alternative: Alternative | null;
  duration_ms: number;
  created_at: string;
  cached_at: string | null;
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

async function parseErrorDetail(res: Response): Promise<string> {
  try {
    const body = await res.json();
    if (typeof body?.detail === "string") return body.detail;
    if (Array.isArray(body?.detail)) {
      // FastAPI 422 validation errors
      return body.detail.map((e: { msg?: string }) => e.msg).filter(Boolean).join("; ");
    }
  } catch {
    // not JSON
  }
  return `HTTP ${res.status}`;
}

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
    throw new ApiError(res.status, await parseErrorDetail(res));
  }

  return res.json();
}

/**
 * Phishing SMS/e-posta görsel taraması (TASK-23 backend, TASK-31 frontend).
 * Multipart upload → tek LayerResult döner (phishing agent çıktısı).
 */
export async function scanPhishing(
  file: File,
  options: { signal?: AbortSignal } = {},
): Promise<LayerResult> {
  const form = new FormData();
  form.append("file", file);

  const res = await fetch(`${API_URL}/api/scan/phishing`, {
    method: "POST",
    body: form,
    signal: options.signal,
  });

  if (!res.ok) {
    throw new ApiError(res.status, await parseErrorDetail(res));
  }

  return res.json();
}

/**
 * Geçmiş taramaları listele (TASK-30 sonrası aktif).
 * Şu an backend 501 dönüyor — caller graceful handle etmeli.
 */
export async function getScanHistory(
  options: { signal?: AbortSignal } = {},
): Promise<ScanResult[]> {
  const res = await fetch(`${API_URL}/api/history`, {
    method: "GET",
    signal: options.signal,
  });

  if (!res.ok) {
    throw new ApiError(res.status, await parseErrorDetail(res));
  }

  const body = await res.json();
  // Backend {scans: [...]} formatı veya doğrudan dizi dönebilir
  if (Array.isArray(body)) return body;
  if (Array.isArray(body?.scans)) return body.scans;
  return [];
}

/**
 * Tek tarama detayı (TASK-30 sonrası — Supabase'ten).
 * Şu an backend bu endpoint'i sağlamıyor; frontend sessionStorage cache'i
 * kullanıyor (lib/scan-cache.ts).
 */
export async function getScanById(
  id: string,
  options: { signal?: AbortSignal } = {},
): Promise<ScanResult> {
  const res = await fetch(`${API_URL}/api/scan/${encodeURIComponent(id)}`, {
    method: "GET",
    signal: options.signal,
  });

  if (!res.ok) {
    throw new ApiError(res.status, await parseErrorDetail(res));
  }

  return res.json();
}

export type PetitionUserInfo = {
  url: string;
  full_name: string;
  tc_no: string;
  address: string;
  phone: string;
};

/**
 * Tüketici Hakem Heyeti dilekçesi PDF üretir (TASK-32).
 */
export async function generatePetition(
  scanId: string,
  userInfo: PetitionUserInfo,
  options: { signal?: AbortSignal } = {},
): Promise<Blob> {
  const res = await fetch(
    `${API_URL}/api/petition/${encodeURIComponent(scanId)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: userInfo.url,
        user_full_name: userInfo.full_name,
        tc_no: userInfo.tc_no,
        address: userInfo.address,
        phone: userInfo.phone,
      }),
      signal: options.signal,
    },
  );

  if (!res.ok) {
    throw new ApiError(res.status, await parseErrorDetail(res));
  }

  return res.blob();
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
