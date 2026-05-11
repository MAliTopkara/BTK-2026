import { DiagnosticBar } from "@/components/landing/DiagnosticBar";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <DiagnosticBar />
      {children}
    </>
  );
}
