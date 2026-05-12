import { ImageResponse } from "next/og";

import { getDemoScan } from "@/lib/api";
import {
  GRID_BG,
  OG_COLORS,
  OG_SIZE,
  STATUS_COLOR,
  STATUS_GLYPH,
  type Status,
  VERDICT_COLOR,
  VERDICT_TR,
  type Verdict,
  loadGoogleFont,
} from "@/lib/og";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "TrustLens AI tarama sonucu";

type LayerEntry = {
  layer_id: string;
  name: string;
  status: Status;
  finding: string;
  score: number | null;
};

export default async function Image({
  params,
}: {
  params: Promise<{ scenario: string }>;
}) {
  const { scenario } = await params;
  const [serifItalic, mono] = await Promise.all([
    loadGoogleFont("Instrument Serif", { italic: true }).catch(() => null),
    loadGoogleFont("JetBrains Mono", { weight: 400 }).catch(() => null),
  ]);

  let scan;
  try {
    scan = await getDemoScan(scenario);
  } catch {
    return fallbackImage(serifItalic, mono);
  }

  const verdict = scan.verdict as Verdict;
  const verdictColor = VERDICT_COLOR[verdict];
  const verdictLabel = VERDICT_TR[verdict];

  // En önemli 3 bulgu (RISK önce, sonra WARN)
  const topFindings: LayerEntry[] = Object.values(scan.layer_results)
    .filter((l) => l && l.status !== "INFO")
    .map<LayerEntry>((l) => ({
      layer_id: l.layer_id,
      name: l.name,
      status: l.status as Status,
      finding: l.finding,
      score: l.score,
    }))
    .sort((a, b) => statusPriority(a.status) - statusPriority(b.status))
    .slice(0, 3);

  const product = scan.product;
  const platformShort = (product?.platform ?? "").toUpperCase();

  return new ImageResponse(
    (
      <div
        style={{
          width: size.width,
          height: size.height,
          background: OG_COLORS.bg,
          color: OG_COLORS.foreground,
          display: "flex",
          flexDirection: "column",
          fontFamily: "InstrumentSerif, JetBrainsMono, serif",
          position: "relative",
          ...GRID_BG,
        }}
      >
        {/* Top diagnostic strip */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "24px 48px",
            borderBottom: `1px solid ${OG_COLORS.border}`,
            fontSize: 16,
            fontFamily: "JetBrainsMono, monospace",
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            color: OG_COLORS.muted,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 9,
                height: 9,
                borderRadius: 999,
                background: OG_COLORS.accent,
                boxShadow: `0 0 10px ${OG_COLORS.accent}`,
              }}
            />
            <span style={{ color: OG_COLORS.foreground }}>TrustLens_AI</span>
            <span style={{ color: OG_COLORS.muted2 }}>·</span>
            <span>tarama_raporu</span>
          </div>
          <span>scan_id · {scan.scan_id.slice(0, 8)}</span>
        </div>

        {/* Body — split */}
        <div style={{ flex: 1, display: "flex", padding: "48px 56px", gap: 56 }}>
          {/* LEFT — Product + findings */}
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              minWidth: 0,
            }}
          >
            {/* Eyebrow */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                fontSize: 14,
                fontFamily: "JetBrainsMono, monospace",
                letterSpacing: "0.32em",
                textTransform: "uppercase",
                color: OG_COLORS.muted,
                marginBottom: 24,
              }}
            >
              <div style={{ width: 36, height: 1, background: OG_COLORS.accent }} />
              <span>tarama · {scenario.replace(/_/g, "/")}</span>
            </div>

            {/* Product title */}
            <div
              style={{
                fontFamily: "InstrumentSerif, serif",
                fontSize: 56,
                lineHeight: 1.05,
                letterSpacing: "-0.015em",
                color: OG_COLORS.foreground,
                marginBottom: 16,
                display: "flex",
                maxWidth: 540,
              }}
            >
              {truncate(product?.title ?? "Bilinmeyen ürün", 80)}
            </div>

            {/* Platform / price */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                fontSize: 16,
                fontFamily: "JetBrainsMono, monospace",
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: OG_COLORS.muted,
                marginBottom: 36,
              }}
            >
              <span style={{ color: OG_COLORS.foreground }}>{platformShort}</span>
              {product?.price_current ? (
                <>
                  <span style={{ color: OG_COLORS.muted2 }}>·</span>
                  <span style={{ color: OG_COLORS.foreground }}>
                    ₺ {formatTL(product.price_current)}
                  </span>
                </>
              ) : null}
              {product?.discount_pct ? (
                <>
                  <span style={{ color: OG_COLORS.muted2 }}>·</span>
                  <span style={{ color: verdictColor }}>
                    %{Math.round(product.discount_pct)} ind.
                  </span>
                </>
              ) : null}
            </div>

            {/* Top findings */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 14,
                paddingTop: 20,
                borderTop: `1px solid ${OG_COLORS.border}`,
              }}
            >
              {topFindings.map((f) => {
                const statusColor = STATUS_COLOR[f.status];
                return (
                  <div
                    key={f.layer_id}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 14,
                      fontSize: 18,
                      fontFamily: "JetBrainsMono, monospace",
                    }}
                  >
                    <span
                      style={{
                        color: statusColor,
                        fontSize: 14,
                        letterSpacing: "0.22em",
                        textTransform: "uppercase",
                        marginTop: 2,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {STATUS_GLYPH[f.status]} {f.status}
                    </span>
                    <span style={{ color: OG_COLORS.foreground, lineHeight: 1.35 }}>
                      {truncate(f.finding, 100)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* RIGHT — Score column */}
          <div
            style={{
              width: 320,
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-end",
              justifyContent: "center",
              position: "relative",
            }}
          >
            {/* Bracketed score box */}
            <div
              style={{
                position: "relative",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                padding: "36px 32px",
                border: `1px solid ${verdictColor}40`,
                background: "rgba(0,0,0,0.4)",
              }}
            >
              {/* Corner accents */}
              <div
                style={{
                  position: "absolute",
                  top: -2,
                  left: -2,
                  width: 16,
                  height: 16,
                  borderTop: `2px solid ${verdictColor}`,
                  borderLeft: `2px solid ${verdictColor}`,
                }}
              />
              <div
                style={{
                  position: "absolute",
                  bottom: -2,
                  right: -2,
                  width: 16,
                  height: 16,
                  borderBottom: `2px solid ${verdictColor}`,
                  borderRight: `2px solid ${verdictColor}`,
                }}
              />

              <div
                style={{
                  fontSize: 14,
                  fontFamily: "JetBrainsMono, monospace",
                  letterSpacing: "0.28em",
                  textTransform: "uppercase",
                  color: OG_COLORS.muted2,
                  marginBottom: 8,
                }}
              >
                Genel Skor
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  gap: 8,
                  fontFamily: "InstrumentSerif, serif",
                  fontStyle: "italic",
                }}
              >
                <span
                  style={{
                    fontSize: 200,
                    lineHeight: 0.9,
                    color: verdictColor,
                  }}
                >
                  {scan.overall_score}
                </span>
                <span style={{ fontSize: 28, color: OG_COLORS.muted }}>/100</span>
              </div>

              {/* Verdict pill */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  marginTop: 24,
                  padding: "10px 18px",
                  border: `1px solid ${verdictColor}80`,
                  background: "rgba(0,0,0,0.4)",
                }}
              >
                <div
                  style={{
                    width: 9,
                    height: 9,
                    borderRadius: 999,
                    background: verdictColor,
                    boxShadow: `0 0 10px ${verdictColor}`,
                  }}
                />
                <span
                  style={{
                    fontSize: 18,
                    fontFamily: "JetBrainsMono, monospace",
                    letterSpacing: "0.24em",
                    textTransform: "uppercase",
                    color: verdictColor,
                  }}
                >
                  {verdictLabel}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom strip */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "20px 48px",
            borderTop: `1px solid ${OG_COLORS.borderStrong}`,
            background: "rgba(0,0,0,0.4)",
            fontSize: 14,
            fontFamily: "JetBrainsMono, monospace",
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            color: OG_COLORS.muted2,
          }}
        >
          <span>
            <span style={{ color: OG_COLORS.accent }}>trustlens.ai</span>
            /demo/{scenario}
          </span>
          <span>
            {scan.duration_ms ? `${(scan.duration_ms / 1000).toFixed(1)}s ·` : ""}{" "}
            7 katman · gemini 2.5 pro
          </span>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        ...(serifItalic
          ? ([
              {
                name: "InstrumentSerif",
                data: serifItalic,
                style: "italic" as const,
              },
            ] as const)
          : []),
        ...(mono
          ? ([
              {
                name: "JetBrainsMono",
                data: mono,
                style: "normal" as const,
              },
            ] as const)
          : []),
      ],
    },
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────

function statusPriority(s: Status): number {
  return s === "RISK" ? 0 : s === "WARN" ? 1 : s === "OK" ? 2 : 3;
}

function truncate(s: string, max: number): string {
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}

function formatTL(n: number): string {
  return n.toLocaleString("tr-TR", { maximumFractionDigits: 0 });
}

function fallbackImage(
  serifItalic: ArrayBuffer | null,
  mono: ArrayBuffer | null,
): ImageResponse {
  return new ImageResponse(
    (
      <div
        style={{
          width: OG_SIZE.width,
          height: OG_SIZE.height,
          background: OG_COLORS.bg,
          color: OG_COLORS.foreground,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "InstrumentSerif, serif",
          fontSize: 64,
          fontStyle: "italic",
        }}
      >
        TrustLens AI
      </div>
    ),
    {
      ...OG_SIZE,
      fonts: [
        ...(serifItalic
          ? ([
              { name: "InstrumentSerif", data: serifItalic, style: "italic" as const },
            ] as const)
          : []),
        ...(mono
          ? ([
              { name: "JetBrainsMono", data: mono, style: "normal" as const },
            ] as const)
          : []),
      ],
    },
  );
}
