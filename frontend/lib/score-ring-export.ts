import type { Verdict } from "@/lib/api";

const VERDICT_COLORS: Record<Verdict, string> = {
  BUY: "#00ff88",
  CAUTION: "#ffcc33",
  AVOID: "#ff4d4d",
};

const VERDICT_TR: Record<Verdict, string> = {
  BUY: "AL",
  CAUTION: "DİKKATLİ OL",
  AVOID: "ALMA",
};

const RADIUS = 42;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function generateScoreRingSVG(
  score: number,
  verdict: Verdict,
  productTitle?: string,
): string {
  const color = VERDICT_COLORS[verdict];
  const clamped = Math.max(0, Math.min(100, score));
  const offset = CIRCUMFERENCE * (1 - clamped / 100);
  const title = productTitle
    ? productTitle.length > 40
      ? productTitle.slice(0, 38) + "…"
      : productTitle
    : "";

  return `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="480" viewBox="0 0 400 480">
  <rect width="400" height="480" fill="#0a0a0a"/>

  <!-- Grid pattern -->
  <defs>
    <pattern id="grid" width="48" height="48" patternUnits="userSpaceOnUse">
      <path d="M 48 0 L 0 0 0 48" fill="none" stroke="rgba(255,255,255,0.025)" stroke-width="0.5"/>
    </pattern>
  </defs>
  <rect width="400" height="480" fill="url(#grid)"/>

  <!-- Header -->
  <text x="200" y="36" text-anchor="middle" font-family="monospace" font-size="9" letter-spacing="3" fill="#555" text-transform="uppercase">TRUSTLENS AI · GÜVEN SKORU</text>

  <!-- Ring group centered -->
  <g transform="translate(200, 210)">
    <!-- Glow -->
    <circle cx="0" cy="0" r="90" fill="none" stroke="${color}" stroke-width="0.5" opacity="0.2"/>

    <!-- Background track -->
    <circle cx="0" cy="0" r="${RADIUS * 2}" fill="none" stroke="#2a2a2a" stroke-width="5" opacity="0.6"/>

    <!-- Progress arc -->
    <circle cx="0" cy="0" r="${RADIUS * 2}" fill="none" stroke="${color}" stroke-width="7" stroke-linecap="round" stroke-dasharray="${CIRCUMFERENCE * 2}" stroke-dashoffset="${offset * 2}" transform="rotate(-90)"/>

    <!-- Tick marks -->
    <g opacity="0.5" stroke="#555" stroke-width="1">
      <line x1="0" y1="${-(RADIUS * 2 + 6)}" x2="0" y2="${-(RADIUS * 2 + 14)}" transform="rotate(90)"/>
      <line x1="0" y1="${-(RADIUS * 2 + 6)}" x2="0" y2="${-(RADIUS * 2 + 14)}" transform="rotate(180)"/>
      <line x1="0" y1="${-(RADIUS * 2 + 6)}" x2="0" y2="${-(RADIUS * 2 + 14)}" transform="rotate(270)"/>
    </g>

    <!-- Score number -->
    <text x="0" y="12" text-anchor="middle" font-family="serif" font-style="italic" font-size="64" fill="${color}">${clamped}</text>
    <text x="0" y="36" text-anchor="middle" font-family="monospace" font-size="10" letter-spacing="2.5" fill="#555">/ 100</text>
  </g>

  <!-- Verdict pill -->
  <g transform="translate(200, 340)">
    <rect x="-60" y="-14" width="120" height="28" fill="none" stroke="${color}" stroke-width="1"/>
    <circle cx="-40" cy="0" r="3" fill="${color}"/>
    <text x="4" y="4" text-anchor="middle" font-family="monospace" font-size="11" letter-spacing="2.5" fill="${color}">${VERDICT_TR[verdict]}</text>
  </g>

  <!-- Product title -->
  ${title ? `<text x="200" y="400" text-anchor="middle" font-family="serif" font-style="italic" font-size="14" fill="#ededed">${escapeXml(title)}</text>` : ""}

  <!-- Footer -->
  <text x="200" y="455" text-anchor="middle" font-family="monospace" font-size="8" letter-spacing="2" fill="#555">btk-2026.vercel.app</text>
</svg>`;
}

export function downloadSVG(score: number, verdict: Verdict, productTitle?: string): void {
  const svg = generateScoreRingSVG(score, verdict, productTitle);
  const blob = new Blob([svg], { type: "image/svg+xml" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `trustlens-score-${score}.svg`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function downloadPNG(score: number, verdict: Verdict, productTitle?: string): Promise<void> {
  const svg = generateScoreRingSVG(score, verdict, productTitle);
  const blob = new Blob([svg], { type: "image/svg+xml" });
  const url = URL.createObjectURL(blob);

  const img = new Image();
  img.width = 800;
  img.height = 960;

  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("SVG render failed"));
    img.src = url;
  });

  const canvas = document.createElement("canvas");
  canvas.width = 800;
  canvas.height = 960;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");

  ctx.drawImage(img, 0, 0, 800, 960);
  URL.revokeObjectURL(url);

  const pngBlob = await new Promise<Blob>((resolve) => {
    canvas.toBlob((b) => resolve(b!), "image/png");
  });

  const pngUrl = URL.createObjectURL(pngBlob);
  const a = document.createElement("a");
  a.href = pngUrl;
  a.download = `trustlens-score-${score}.png`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(pngUrl);
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
