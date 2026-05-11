import type { Metadata } from "next";

import { ScoreRingShowcase } from "@/components/ui/ScoreRingShowcase";

export const metadata: Metadata = {
  title: "ScoreRing Showcase — TrustLens AI",
  robots: { index: false, follow: false },
};

export default function Page() {
  return <ScoreRingShowcase />;
}
