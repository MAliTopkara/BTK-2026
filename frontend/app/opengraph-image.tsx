import { ImageResponse } from "next/og";

import { GRID_BG, OG_COLORS, OG_SIZE, loadGoogleFont } from "@/lib/og";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const size = OG_SIZE;
export const contentType = "image/png";
export const alt =
  "TrustLens AI — Bu ürün güvenilir mi? 7 katmanlı AI ile 8 saniyede.";

export default async function Image() {
  const [serifItalic, mono] = await Promise.all([
    loadGoogleFont("Instrument Serif", { italic: true }).catch(() => null),
    loadGoogleFont("JetBrains Mono", { weight: 400 }).catch(() => null),
  ]);

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
            padding: "32px 56px",
            borderBottom: `1px solid ${OG_COLORS.border}`,
            fontSize: 18,
            fontFamily: "JetBrainsMono, monospace",
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            color: OG_COLORS.muted,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: 999,
                background: OG_COLORS.accent,
                boxShadow: `0 0 10px ${OG_COLORS.accent}`,
              }}
            />
            <span style={{ color: OG_COLORS.foreground }}>TrustLens_AI</span>
            <span style={{ color: OG_COLORS.muted2 }}>·</span>
            <span>v0.1.0</span>
          </div>
          <span>BTK_Akademi · 2026</span>
        </div>

        {/* Main content */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            padding: "0 96px",
          }}
        >
          {/* Eyebrow */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
              fontSize: 18,
              fontFamily: "JetBrainsMono, monospace",
              letterSpacing: "0.32em",
              textTransform: "uppercase",
              color: OG_COLORS.muted,
              marginBottom: 36,
            }}
          >
            <div style={{ width: 48, height: 1, background: OG_COLORS.accent }} />
            <span>e-ticaret güven asistanı</span>
          </div>

          {/* Tagline — big serif */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              fontFamily: "InstrumentSerif, serif",
              fontStyle: "italic",
              fontSize: 124,
              lineHeight: 1.0,
              letterSpacing: "-0.02em",
              color: OG_COLORS.foreground,
            }}
          >
            <span>Bu ürün</span>
            <span style={{ display: "flex", alignItems: "baseline", gap: 28 }}>
              <span style={{ color: OG_COLORS.muted }}>gerçekten</span>
              <span>güvenilir</span>
              <span style={{ color: OG_COLORS.accent }}>mi?</span>
            </span>
          </div>

          {/* Subtitle */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
              marginTop: 40,
              fontSize: 22,
              fontFamily: "JetBrainsMono, monospace",
              color: OG_COLORS.muted,
            }}
          >
            <span style={{ color: OG_COLORS.accent }}>{">"}</span>
            <span>
              7 paralel ajan · Gemini 2.5 Pro ·{" "}
              <span style={{ color: OG_COLORS.foreground }}>~8 saniye</span>
            </span>
          </div>
        </div>

        {/* Bottom strip */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "28px 56px",
            borderTop: `1px solid ${OG_COLORS.borderStrong}`,
            background: "rgba(0,0,0,0.4)",
            fontSize: 18,
            fontFamily: "JetBrainsMono, monospace",
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            color: OG_COLORS.muted2,
          }}
        >
          <span style={{ color: OG_COLORS.accent }}>trustlens.ai</span>
          <span>şeffaf gerekçe · 7 katman · türkiye odaklı</span>
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
