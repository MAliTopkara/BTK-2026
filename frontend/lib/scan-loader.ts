/**
 * Birleşik scan loader (TASK-39 — karşılaştırma)
 * id formatı:
 *   - "airpods_fake"    → demo senaryo
 *   - "scan:<uuid>"      → sessionStorage'daki kişisel tarama
 */

import { getDemoScan, type ScanResult } from "./api";
import { loadScanFromCache } from "./scan-cache";

export type ScanRefKind = "demo" | "session";

export type ScanRef = {
  raw: string;
  kind: ScanRefKind;
  key: string; // demo: scenario name, session: uuid
};

export const DEMO_SCENARIOS = [
  "airpods_fake",
  "watch_genuine",
  "laptop_suspicious",
  "phishing_sms",
] as const;

export function parseScanRef(id: string): ScanRef {
  if (id.startsWith("scan:")) {
    return { raw: id, kind: "session", key: id.slice(5) };
  }
  return { raw: id, kind: "demo", key: id };
}

export function formatScanRef(kind: ScanRefKind, key: string): string {
  return kind === "session" ? `scan:${key}` : key;
}

export async function loadScanByRef(ref: ScanRef): Promise<ScanResult | null> {
  if (ref.kind === "demo") {
    try {
      return await getDemoScan(ref.key);
    } catch {
      return null;
    }
  }
  return loadScanFromCache(ref.key);
}

export async function loadScanById(id: string): Promise<ScanResult | null> {
  return loadScanByRef(parseScanRef(id));
}
