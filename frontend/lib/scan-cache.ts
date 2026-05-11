/**
 * Geçici scan sonucu cache'i (TASK-20)
 * Tarama sonucunu sessionStorage'da tutar, scan detail sayfası buradan okur.
 * TASK-26'da Supabase tablosu + GET /api/scan/{id} endpoint'i ile değiştirilecek.
 */

import type { ScanResult, Verdict } from "./api";

const KEY_PREFIX = "trustlens:scan:";
const INDEX_KEY = "trustlens:scans:index";
const INDEX_LIMIT = 10;

export type RecentScanEntry = {
  scan_id: string;
  url: string;
  title: string;
  verdict: Verdict;
  overall_score: number;
  created_at: string;
};

export function getCacheKey(id: string): string {
  return `${KEY_PREFIX}${id}`;
}

export function saveScanToCache(scan: ScanResult): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(getCacheKey(scan.scan_id), JSON.stringify(scan));
    updateRecentIndex(scan);
  } catch {
    // sessionStorage dolu veya kapalı olabilir, sessizce yut
  }
}

export function loadScanFromCache(id: string): ScanResult | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(getCacheKey(id));
    if (!raw) return null;
    return JSON.parse(raw) as ScanResult;
  } catch {
    return null;
  }
}

export function getRecentScans(limit = 3): RecentScanEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = sessionStorage.getItem(INDEX_KEY);
    if (!raw) return [];
    const all = JSON.parse(raw) as RecentScanEntry[];
    return all.slice(0, limit);
  } catch {
    return [];
  }
}

export function clearScanCache(id?: string): void {
  if (typeof window === "undefined") return;
  if (id) {
    sessionStorage.removeItem(getCacheKey(id));
    return;
  }
  sessionStorage.removeItem(INDEX_KEY);
  for (let i = sessionStorage.length - 1; i >= 0; i--) {
    const key = sessionStorage.key(i);
    if (key?.startsWith(KEY_PREFIX)) sessionStorage.removeItem(key);
  }
}

function updateRecentIndex(scan: ScanResult): void {
  const entry: RecentScanEntry = {
    scan_id: scan.scan_id,
    url: scan.url,
    title: scan.product.title,
    verdict: scan.verdict,
    overall_score: scan.overall_score,
    created_at: scan.created_at,
  };
  const raw = sessionStorage.getItem(INDEX_KEY);
  let current: RecentScanEntry[] = [];
  if (raw) {
    try {
      current = JSON.parse(raw) as RecentScanEntry[];
    } catch {
      current = [];
    }
  }
  const next = [entry, ...current.filter((e) => e.scan_id !== entry.scan_id)].slice(
    0,
    INDEX_LIMIT,
  );
  sessionStorage.setItem(INDEX_KEY, JSON.stringify(next));
}
