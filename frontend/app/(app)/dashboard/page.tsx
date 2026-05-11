import type { Metadata } from "next";

import { ScanLauncher } from "@/components/dashboard/ScanLauncher";

export const metadata: Metadata = {
  title: "Dashboard — TrustLens AI",
  description: "Yeni bir tarama başlat ve 7 katmanı canlı izle.",
};

export default function DashboardPage() {
  return <ScanLauncher />;
}
