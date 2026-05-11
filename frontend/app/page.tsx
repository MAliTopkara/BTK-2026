import { DemoScenarios } from "@/components/landing/DemoScenarios";
import { DiagnosticBar } from "@/components/landing/DiagnosticBar";
import { Footer } from "@/components/landing/Footer";
import { Hero } from "@/components/landing/Hero";
import { LayerGrid } from "@/components/landing/LayerGrid";
import { ReasoningSection } from "@/components/landing/ReasoningSection";

export default function Home() {
  return (
    <>
      <DiagnosticBar />
      <main className="min-h-screen">
        <Hero />
        <LayerGrid />
        <ReasoningSection />
        <DemoScenarios />
      </main>
      <Footer />
    </>
  );
}
