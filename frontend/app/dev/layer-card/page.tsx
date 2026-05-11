import type { Metadata } from "next";

import { LayerCardShowcase } from "@/components/scan/LayerCardShowcase";

export const metadata: Metadata = {
  title: "LayerCard Showcase — TrustLens AI",
  robots: { index: false, follow: false },
};

export default function Page() {
  return <LayerCardShowcase />;
}
