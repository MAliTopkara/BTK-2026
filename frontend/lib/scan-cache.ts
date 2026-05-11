/**
 * Geçici scan sonucu cache'i (TASK-20)
 * Tarama sonucunu sessionStorage'da tutar, scan detail sayfası buradan okur.
 * TASK-26'da Supabase tablosu + GET /api/scan/{id} endpoint'i ile değiştirilecek.
 */

import type { ScanResult } from "./api";

const KEY_PREFIX = "trustlens:scan:";

export function getCacheKey(id: string): string {
  return `${KEY_PREFIX}${id}`;
}

export function saveScanToCache(scan: ScanResult): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(getCacheKey(scan.scan_id), JSON.stringify(scan));
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

export function clearScanCache(id?: string): void {
  if (typeof window === "undefined") return;
  if (id) {
    sessionStorage.removeItem(getCacheKey(id));
    return;
  }
  // Tüm scan cache'lerini temizle
  for (let i = sessionStorage.length - 1; i >= 0; i--) {
    const key = sessionStorage.key(i);
    if (key?.startsWith(KEY_PREFIX)) sessionStorage.removeItem(key);
  }
}
