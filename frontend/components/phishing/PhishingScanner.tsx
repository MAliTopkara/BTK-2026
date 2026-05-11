"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { toast } from "sonner";

import { ApiError, scanPhishing, type LayerResult } from "@/lib/api";

type Phase = "idle" | "scanning" | "complete" | "error";

type UrlCheck = {
  url: string;
  domain: string;
  in_blacklist: boolean;
};

type PhishingDetails = {
  extracted_text?: string;
  urls_found?: string[];
  url_checks?: UrlCheck[];
  blacklisted_domains?: string[];
  verdict?: string;
  flags?: string[];
  explanation?: string;
};

const VERDICT_TONE: Record<string, string> = {
  PHISHING_CONFIRMED: "text-[var(--red)]",
  PHISHING_SUSPECTED: "text-[var(--red)]",
  SUSPICIOUS: "text-[var(--yellow)]",
  CLEAN: "text-[var(--accent)]",
};

const VERDICT_DOT: Record<string, string> = {
  PHISHING_CONFIRMED: "status-dot-risk",
  PHISHING_SUSPECTED: "status-dot-risk",
  SUSPICIOUS: "status-dot-warn",
  CLEAN: "status-dot-ok",
};

const VERDICT_TR: Record<string, string> = {
  PHISHING_CONFIRMED: "Phishing onaylandı",
  PHISHING_SUSPECTED: "Phishing şüpheli",
  SUSPICIOUS: "Şüpheli içerik",
  CLEAN: "Temiz",
  UNKNOWN: "Analiz edilemedi",
};

const STATUS_TONE: Record<string, string> = {
  RISK: "border-[var(--red)]/50 bg-[var(--red)]/[0.06]",
  WARN: "border-[var(--yellow)]/50 bg-[var(--yellow)]/[0.06]",
  OK: "border-[var(--accent)]/50 bg-[var(--accent)]/[0.06]",
  INFO: "border-[var(--border-strong)] bg-[var(--surface)]/40",
};

const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB (backend limit)
const ACCEPTED_MIME = {
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
  "image/webp": [".webp"],
  "image/gif": [".gif"],
};

export function PhishingScanner() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [preview, setPreview] = useState<string | null>(null);
  const [result, setResult] = useState<LayerResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setPhase("scanning");
    setError(null);
    setResult(null);

    // Preview URL (sonradan revoke için saklı)
    const url = URL.createObjectURL(file);
    setPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return url;
    });

    try {
      const r = await scanPhishing(file);
      setResult(r);
      setPhase("complete");

      const verdict = (r.details as PhishingDetails)?.verdict ?? "";
      if (verdict.startsWith("PHISHING")) {
        toast.error("Phishing tespit edildi", {
          description: r.finding,
        });
      } else if (verdict === "SUSPICIOUS") {
        toast.warning("Şüpheli içerik", { description: r.finding });
      } else {
        toast.success("İçerik temiz", { description: r.finding });
      }
    } catch (e: unknown) {
      const msg =
        e instanceof ApiError
          ? translateApiError(e)
          : e instanceof Error
            ? e.message
            : "Bilinmeyen hata.";
      setError(msg);
      setPhase("error");
      toast.error("Tarama başarısız", { description: msg });
    }
  }, []);

  const {
    getRootProps,
    getInputProps,
    isDragActive,
    fileRejections,
    open,
  } = useDropzone({
    onDrop,
    accept: ACCEPTED_MIME,
    maxFiles: 1,
    maxSize: MAX_SIZE_BYTES,
    disabled: phase === "scanning",
    noClick: true,
    noKeyboard: false,
  });

  function reset() {
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    setResult(null);
    setError(null);
    setPhase("idle");
  }

  return (
    <div className="space-y-10">
      {/* Hero */}
      <header className="space-y-4 max-w-3xl">
        <div className="font-mono text-[10px] tracking-[0.32em] uppercase text-[var(--muted)] flex items-center gap-3">
          <span className="h-px w-8 bg-[var(--accent)]" />
          <span>PHISHING · OCR + USOM + GEMINI</span>
        </div>
        <h1 className="font-serif text-[clamp(2.4rem,5vw,4rem)] leading-[0.95] tracking-[-0.02em]">
          O SMS{" "}
          <span className="italic text-[var(--accent)]">gerçek</span> mi?
        </h1>
        <p className="text-[14px] text-[var(--muted)] leading-relaxed max-w-xl">
          PTT, banka, kargo, e-devlet kılıklı şüpheli mesaj ekran görüntüsünü
          yükle — TrustLens OCR ile metni çıkarır, URL'leri kara listeyle
          karşılaştırır ve Türkçe bir karar verir.
        </p>
      </header>

      {/* Main */}
      {phase === "idle" || phase === "error" ? (
        <DropZone
          getRootProps={getRootProps}
          getInputProps={getInputProps}
          isDragActive={isDragActive}
          fileRejections={fileRejections}
          openPicker={open}
          error={error}
        />
      ) : (
        <ResultView
          phase={phase}
          preview={preview}
          result={result}
          onReset={reset}
        />
      )}
    </div>
  );
}

// ===========================================================================
// DropZone
// ===========================================================================

type DropZoneProps = {
  getRootProps: ReturnType<typeof useDropzone>["getRootProps"];
  getInputProps: ReturnType<typeof useDropzone>["getInputProps"];
  isDragActive: boolean;
  fileRejections: ReturnType<typeof useDropzone>["fileRejections"];
  openPicker: () => void;
  error: string | null;
};

function DropZone({
  getRootProps,
  getInputProps,
  isDragActive,
  fileRejections,
  openPicker,
  error,
}: DropZoneProps) {
  const rejection = fileRejections[0]?.errors[0];

  return (
    <div
      {...getRootProps({
        className: `corner-frame relative border-2 border-dashed transition-colors cursor-pointer ${
          isDragActive
            ? "border-[var(--accent)] bg-[var(--accent)]/[0.06]"
            : "border-[var(--border-strong)] bg-[var(--surface)]/30 hover:border-[var(--accent)]/60 hover:bg-[var(--surface)]/40"
        }`,
        onClick: openPicker,
      })}
    >
      <span className="c-tr" />
      <span className="c-bl" />
      <input {...getInputProps()} />

      <div className="flex items-center justify-between px-4 h-9 border-b border-[var(--border-strong)] bg-black/40 font-mono text-[10px] tracking-[0.22em] uppercase">
        <div className="flex items-center gap-2.5 text-[var(--muted)]">
          <span
            className={`status-dot ${isDragActive ? "status-dot-ok live-pulse" : "status-dot-info"}`}
          />
          <span>{isDragActive ? "BIRAK" : "UPLOAD_ZONE"}</span>
        </div>
        <span className="text-[var(--muted-2)]">
          POST /api/scan/phishing
        </span>
      </div>

      <div className="p-10 lg:p-16 flex flex-col items-center text-center space-y-6">
        <div className="w-16 h-16 border border-[var(--border-strong)] flex items-center justify-center font-serif italic text-[var(--muted)] text-[28px]">
          ↑
        </div>
        <div className="space-y-2">
          <h2 className="font-serif italic text-[clamp(1.5rem,3vw,2rem)] text-[var(--foreground)]">
            {isDragActive ? "Görseli bırak" : "Ekran görüntüsünü yükle"}
          </h2>
          <p className="text-[13px] text-[var(--muted)] max-w-md mx-auto">
            Tıkla ve seç ya da görseli buraya sürükle. JPEG / PNG / WebP / GIF,
            maksimum 10 MB.
          </p>
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            openPicker();
          }}
          className="group flex items-center gap-3 bg-[var(--accent)] hover:bg-[var(--accent-dim)] text-black px-5 py-3 font-mono text-[11px] tracking-[0.24em] uppercase transition-colors"
        >
          <span className="text-black/70">{">"}</span>
          <span>Dosya_seç</span>
          <span className="font-sans transition-transform group-hover:translate-x-0.5">
            →
          </span>
        </button>

        {(error || rejection) && (
          <div className="w-full max-w-md border border-[var(--red)]/50 bg-[var(--red)]/[0.08] px-4 py-3 flex items-start gap-3 text-left">
            <span className="status-dot status-dot-risk mt-1.5 shrink-0" />
            <div>
              <div className="font-mono text-[10px] tracking-[0.22em] uppercase text-[var(--red)] mb-1">
                Yükleme hatası
              </div>
              <p className="font-sans text-[12px] text-[var(--foreground)]/85">
                {error || translateRejection(rejection)}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ===========================================================================
// ResultView
// ===========================================================================

function ResultView({
  phase,
  preview,
  result,
  onReset,
}: {
  phase: Phase;
  preview: string | null;
  result: LayerResult | null;
  onReset: () => void;
}) {
  const isScanning = phase === "scanning";
  const details = (result?.details as PhishingDetails) ?? {};
  // Status INFO ise (Gemini OCR başarısız vb.) UNKNOWN fallback'i kullan
  const verdict = isScanning
    ? ""
    : details.verdict ?? (result?.status === "INFO" ? "UNKNOWN" : "SUSPICIOUS");
  const verdictTone = VERDICT_TONE[verdict] ?? "text-[var(--muted)]";
  const verdictDot = VERDICT_DOT[verdict] ?? "status-dot-info";
  const verdictLabel = VERDICT_TR[verdict] ?? "Analiz ediliyor";
  const statusTone = STATUS_TONE[result?.status ?? "INFO"];
  const urlChecks = details.url_checks ?? [];
  const flags = details.flags ?? [];

  return (
    <div className="space-y-8">
      <div className="grid lg:grid-cols-[280px_1fr] gap-8 items-start">
        {/* Görsel preview */}
        {preview && (
          <div className="corner-frame relative border border-[var(--border-strong)] bg-[var(--surface)]/30 overflow-hidden">
            <span className="c-tr" />
            <span className="c-bl" />
            <div className="px-3 h-8 flex items-center justify-between border-b border-[var(--border-strong)] bg-black/40 font-mono text-[9px] tracking-[0.22em] uppercase text-[var(--muted-2)]">
              <span>UPLOADED</span>
              <span>preview</span>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={preview}
              alt="Yüklenen ekran görüntüsü"
              className="block w-full max-h-[400px] object-contain bg-black"
            />
          </div>
        )}

        {/* Banner + finding */}
        <div className="space-y-4 min-w-0">
          <div
            className={`corner-frame relative border ${statusTone} p-5 lg:p-6`}
          >
            <span className="c-tr" />
            <span className="c-bl" />

            <div className="flex items-center justify-between mb-4">
              <div className="font-mono text-[10px] tracking-[0.32em] uppercase text-[var(--muted)] flex items-center gap-3">
                <span
                  className={`status-dot ${verdictDot} ${isScanning ? "live-pulse" : ""}`}
                />
                <span>VERDICT</span>
              </div>
              {result && result.score !== null && (
                <div className="text-right">
                  <div className="font-mono text-[9px] tracking-[0.22em] uppercase text-[var(--muted-2)]">
                    skor
                  </div>
                  <div
                    className={`font-serif italic tabular-nums text-[32px] leading-none ${verdictTone}`}
                  >
                    {result.score}
                    <span className="text-[var(--muted-2)] text-[12px] ml-0.5">
                      /100
                    </span>
                  </div>
                </div>
              )}
            </div>

            {isScanning ? (
              <ScanningState />
            ) : (
              <>
                <h2
                  className={`font-serif italic text-[clamp(1.6rem,3vw,2.2rem)] leading-tight ${verdictTone}`}
                >
                  {verdictLabel}.
                </h2>
                {result?.finding && (
                  <p className="font-sans text-[14px] leading-relaxed text-[var(--foreground)]/85 mt-3 max-w-2xl">
                    {result.finding}
                  </p>
                )}
                {details.explanation && (
                  <p className="font-sans text-[13px] leading-relaxed text-[var(--muted)] mt-3 max-w-2xl border-l-2 border-[var(--border-strong)] pl-3">
                    {details.explanation}
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* URLs table */}
      {!isScanning && urlChecks.length > 0 && (
        <UrlList urlChecks={urlChecks} />
      )}

      {/* Flags */}
      {!isScanning && flags.length > 0 && <FlagList flags={flags} />}

      {/* Extracted text */}
      {!isScanning && details.extracted_text && (
        <ExtractedText text={details.extracted_text} />
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-3 pt-4 border-t border-[var(--border-strong)]">
        <button
          type="button"
          onClick={onReset}
          disabled={isScanning}
          className="group flex items-center gap-3 bg-[var(--accent)] hover:bg-[var(--accent-dim)] text-black px-5 py-3 font-mono text-[11px] tracking-[0.24em] uppercase transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span className="text-black/70">{">"}</span>
          <span>Yeni_tarama</span>
          <span className="font-sans transition-transform group-hover:translate-x-0.5">
            ↻
          </span>
        </button>
      </div>
    </div>
  );
}

function ScanningState() {
  return (
    <div className="space-y-3">
      <div className="font-serif italic text-[clamp(1.4rem,2.5vw,1.8rem)] leading-tight text-[var(--foreground)]">
        Görsel analiz ediliyor
        <span className="cursor" />
      </div>
      <div className="space-y-2 font-mono text-[11px] tracking-[0.18em] uppercase text-[var(--muted)]">
        <PulseLine>OCR · Gemini Vision</PulseLine>
        <PulseLine>URL çıkarma · regex</PulseLine>
        <PulseLine>USOM kara liste karşılaştırma</PulseLine>
        <PulseLine>Metin analizi · Gemini Flash</PulseLine>
      </div>
    </div>
  );
}

function PulseLine({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="status-dot status-dot-warn live-pulse" />
      <span>{children}</span>
    </div>
  );
}

function UrlList({ urlChecks }: { urlChecks: UrlCheck[] }) {
  return (
    <section className="corner-frame relative border border-[var(--border-strong)] bg-[var(--surface)]/30">
      <span className="c-tr" />
      <span className="c-bl" />

      <div className="px-4 h-9 flex items-center justify-between border-b border-[var(--border-strong)] bg-black/40 font-mono text-[10px] tracking-[0.22em] uppercase">
        <span className="text-[var(--muted)] flex items-center gap-2.5">
          <span className="status-dot status-dot-info" />
          Tespit edilen URL'ler
        </span>
        <span className="text-[var(--muted-2)] tabular-nums">
          {urlChecks.length} adet
        </span>
      </div>

      <ul>
        {urlChecks.map((c, i) => (
          <li
            key={`${c.url}-${i}`}
            className={`grid grid-cols-[auto_1fr_auto] gap-3 items-center px-4 py-3 font-mono ${
              i !== urlChecks.length - 1
                ? "border-b border-[var(--border)]"
                : ""
            }`}
          >
            <span
              className={`status-dot ${c.in_blacklist ? "status-dot-risk" : "status-dot-info"} shrink-0`}
            />
            <div className="min-w-0">
              <div className="text-[12px] text-[var(--foreground)] truncate">
                {c.url}
              </div>
              <div className="text-[10px] text-[var(--muted-2)] truncate">
                domain · {c.domain}
              </div>
            </div>
            <span
              className={`text-[10px] tracking-[0.22em] uppercase shrink-0 ${
                c.in_blacklist
                  ? "text-[var(--red)]"
                  : "text-[var(--muted-2)]"
              }`}
            >
              {c.in_blacklist ? "kara_liste" : "bilinmiyor"}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function FlagList({ flags }: { flags: string[] }) {
  return (
    <section className="space-y-3">
      <div className="font-mono text-[10px] tracking-[0.32em] uppercase text-[var(--muted)] flex items-center gap-3">
        <span className="h-px w-8 bg-[var(--accent)]" />
        <span>tespit_edilen_kalıplar</span>
        <span className="text-[var(--muted-2)] tabular-nums">
          {flags.length}
        </span>
      </div>
      <ul className="grid sm:grid-cols-2 gap-2 font-mono text-[12px]">
        {flags.map((f, i) => (
          <li
            key={i}
            className="flex items-start gap-3 border border-[var(--border)] bg-[var(--surface)]/30 px-3 py-2"
          >
            <span className="status-dot status-dot-warn mt-1.5 shrink-0" />
            <span className="text-[var(--foreground)]/85">{f}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function ExtractedText({ text }: { text: string }) {
  return (
    <section className="space-y-3">
      <div className="font-mono text-[10px] tracking-[0.32em] uppercase text-[var(--muted)] flex items-center gap-3">
        <span className="h-px w-8 bg-[var(--accent)]" />
        <span>ocr · çıkarılan_metin</span>
      </div>
      <div className="corner-frame relative border border-[var(--border-strong)] bg-[var(--surface)]/30">
        <span className="c-tr" />
        <span className="c-bl" />
        <pre className="px-4 py-3 font-mono text-[12px] text-[var(--foreground)]/80 leading-relaxed whitespace-pre-wrap break-words max-h-[300px] overflow-auto">
          {text}
        </pre>
      </div>
    </section>
  );
}

// ===========================================================================
// Helpers
// ===========================================================================

function translateApiError(e: ApiError): string {
  if (e.status === 415) return "Desteklenmeyen dosya türü. JPEG/PNG/WebP/GIF yükle.";
  if (e.status === 413) return "Dosya çok büyük (10 MB üstü kabul edilmiyor).";
  if (e.status === 422) return "Geçersiz dosya — boş ya da bozuk olabilir.";
  if (e.status === 501) return "Servis şu an aktif değil.";
  if (e.status >= 500) return "Sunucu hatası — birazdan tekrar dene.";
  return e.detail || `İstek başarısız (${e.status}).`;
}

function translateRejection(error: { code?: string; message?: string } | undefined): string {
  if (!error) return "Dosya kabul edilmedi.";
  if (error.code === "file-too-large") return "Dosya 10 MB sınırını aşıyor.";
  if (error.code === "file-invalid-type") return "Sadece JPEG / PNG / WebP / GIF kabul ediliyor.";
  if (error.code === "too-many-files") return "Tek bir dosya yükle, lütfen.";
  return error.message || "Dosya kabul edilmedi.";
}
