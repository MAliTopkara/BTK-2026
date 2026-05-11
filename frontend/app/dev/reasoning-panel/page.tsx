import type { Metadata } from "next";

import { ReasoningPanelShowcase } from "@/components/scan/ReasoningPanelShowcase";

export const metadata: Metadata = {
  title: "ReasoningPanel Showcase — TrustLens AI",
  robots: { index: false, follow: false },
};

export default function Page() {
  return <ReasoningPanelShowcase />;
}
