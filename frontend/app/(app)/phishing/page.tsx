import type { Metadata } from "next";

import { PhishingScanner } from "@/components/phishing/PhishingScanner";

export const metadata: Metadata = {
  title: "Phishing Tarama — TrustLens AI",
  description:
    "Şüpheli SMS/e-posta ekran görüntüsünü yükle, anında phishing analizi yap.",
};

export default function PhishingPage() {
  return <PhishingScanner />;
}
