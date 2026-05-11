import type { Metadata } from "next";

import { HistoryView } from "@/components/history/HistoryView";

export const metadata: Metadata = {
  title: "Geçmiş — TrustLens AI",
  description: "Yaptığın tüm taramaların listesi, filtreler ve detay erişimi.",
};

export default function HistoryPage() {
  return <HistoryView />;
}
