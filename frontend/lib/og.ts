/**
 * Open Graph image üretim yardımcıları (TASK-38)
 * next/og ImageResponse için renk tokenları + font yükleyici.
 */

export const OG_SIZE = { width: 1200, height: 630 } as const;

// Inline color tokens (CSS variables OG'de çalışmaz)
export const OG_COLORS = {
  bg: "#0a0a0a",
  surface: "#111111",
  surface2: "#1a1a1a",
  border: "#1c1c1c",
  borderStrong: "#2a2a2a",
  foreground: "#ededed",
  muted: "#888888",
  muted2: "#555555",
  accent: "#00ff88",
  red: "#ff4d4d",
  yellow: "#ffcc33",
  blue: "#5aa9ff",
} as const;

export type Verdict = "BUY" | "CAUTION" | "AVOID";

export const VERDICT_COLOR: Record<Verdict, string> = {
  BUY: OG_COLORS.accent,
  CAUTION: OG_COLORS.yellow,
  AVOID: OG_COLORS.red,
};

export const VERDICT_TR: Record<Verdict, string> = {
  BUY: "AL",
  CAUTION: "DİKKATLİ OL",
  AVOID: "ALMA",
};

export type Status = "RISK" | "WARN" | "OK" | "INFO";

export const STATUS_COLOR: Record<Status, string> = {
  RISK: OG_COLORS.red,
  WARN: OG_COLORS.yellow,
  OK: OG_COLORS.accent,
  INFO: OG_COLORS.muted,
};

export const STATUS_GLYPH: Record<Status, string> = {
  RISK: "▲",
  WARN: "◆",
  OK: "●",
  INFO: "◌",
};

/**
 * Google Fonts'tan TTF binary'sini fetch eder.
 * Satori WOFF2 desteklemiyor — eski IE UA göndererek TTF aldırıyoruz.
 * ImageResponse `fonts: [{ name, data, style }]` formatında ister.
 */
export async function loadGoogleFont(
  family: string,
  options: { italic?: boolean; weight?: number } = {},
): Promise<ArrayBuffer> {
  const spec = options.italic
    ? "ital@1"
    : `wght@${options.weight ?? 400}`;
  const cssUrl = `https://fonts.googleapis.com/css2?family=${family.replace(/ /g, "+")}:${spec}&display=swap`;

  // Eski IE 8 UA → Google TTF döndürür (modern UA WOFF2 verir, satori parse edemez)
  const cssRes = await fetch(cssUrl, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; rv:11.0) like Gecko",
    },
  });

  if (!cssRes.ok) {
    throw new Error(`Google Fonts CSS fetch failed: ${cssRes.status}`);
  }
  const css = await cssRes.text();
  // Önce truetype/opentype ara, sonra herhangi bir url'e fallback
  const match =
    css.match(/src:\s*url\(([^)]+)\)\s*format\(['"]?(truetype|opentype)['"]?\)/) ??
    css.match(/src:\s*url\(([^)]+)\)/);
  if (!match) throw new Error("Font URL not found in CSS");

  // Quote'ları temizle
  const fontUrl = match[1].replace(/^['"]|['"]$/g, "");

  const fontRes = await fetch(fontUrl);
  if (!fontRes.ok) {
    throw new Error(`Font binary fetch failed: ${fontRes.status}`);
  }
  return await fontRes.arrayBuffer();
}

/**
 * Forensic graph paper grid backgroundImage CSS.
 */
export const GRID_BG = {
  backgroundImage:
    "linear-gradient(to right, rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.025) 1px, transparent 1px)",
  backgroundSize: "48px 48px",
} as const;

/**
 * Korner accent bracket — JSX olarak embed.
 */
export function corner(
  position: "tl" | "tr" | "bl" | "br",
  color: string = OG_COLORS.accent,
  size: number = 18,
): React.CSSProperties {
  const base: React.CSSProperties = {
    position: "absolute",
    width: size,
    height: size,
    borderColor: color,
  };
  switch (position) {
    case "tl":
      return { ...base, top: 0, left: 0, borderTop: "2px solid", borderLeft: "2px solid" };
    case "tr":
      return { ...base, top: 0, right: 0, borderTop: "2px solid", borderRight: "2px solid" };
    case "bl":
      return { ...base, bottom: 0, left: 0, borderBottom: "2px solid", borderLeft: "2px solid" };
    case "br":
      return { ...base, bottom: 0, right: 0, borderBottom: "2px solid", borderRight: "2px solid" };
  }
}
