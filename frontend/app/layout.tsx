import type { Metadata } from "next";
import { Instrument_Serif, JetBrains_Mono } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-serif",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "TrustLens AI — E-Ticaret Güven Asistanı",
  description:
    "7 katmanlı yapay zeka ile e-ticaret ürünlerinin güvenilirliğini saniyeler içinde analiz edin.",
  openGraph: {
    title: "TrustLens AI",
    description: "'Bu ürün güvenilir mi?' sorusunu 8 saniyede cevaplayan AI asistanı.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr" className={`${instrumentSerif.variable} ${jetbrainsMono.variable}`}>
      <body className="min-h-screen bg-[#0a0a0a] text-white antialiased">
        {children}
        <Toaster
          theme="dark"
          position="bottom-right"
          toastOptions={{
            style: {
              background: "var(--surface)",
              border: "1px solid var(--border-strong)",
              borderRadius: "0",
              color: "var(--foreground)",
              fontFamily: "var(--font-mono), monospace",
              fontSize: "12px",
              letterSpacing: "0.02em",
            },
          }}
        />
      </body>
    </html>
  );
}
