import type { Metadata } from "next";
import { Instrument_Serif, JetBrains_Mono } from "next/font/google";
import { Toaster } from "sonner";
import { I18nProvider } from "@/lib/i18n-context";
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
    "7 katmanlı yapay zeka ile e-ticaret ürünlerinin güvenilirliğini saniyeler içinde analiz edin. Sahte indirim, bot yorum, dark pattern tespiti.",
  keywords: ["e-ticaret güven", "sahte yorum tespiti", "sahte indirim", "trendyol güven", "trustlens"],
  authors: [{ name: "TrustLens AI" }],
  metadataBase: new URL("https://btk-2026.vercel.app"),
  openGraph: {
    title: "TrustLens AI — E-Ticaret Güven Asistanı",
    description: "'Bu ürün güvenilir mi?' sorusunu 8 saniyede, 7 AI katmanıyla cevaplayan asistan.",
    type: "website",
    url: "https://btk-2026.vercel.app",
    siteName: "TrustLens AI",
  },
  twitter: {
    card: "summary_large_image",
    title: "TrustLens AI",
    description: "7 katmanlı AI ile e-ticaret güven analizi.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

const themeInitScript = `
(function(){
  try {
    var t = localStorage.getItem('trustlens-theme');
    if (!t) t = window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
    document.documentElement.dataset.theme = t;
    if (t === 'light') document.body.style.background = '#f5f5f3';
  } catch(e){}
})();
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr" className={`${instrumentSerif.variable} ${jetbrainsMono.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-screen bg-[var(--bg)] text-[var(--foreground)] antialiased">
        <I18nProvider>
        {children}
        </I18nProvider>
        <Toaster
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
