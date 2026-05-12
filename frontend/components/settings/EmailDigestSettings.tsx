"use client";

import { useState } from "react";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "http://localhost:8000";

type Props = {
  userEmail: string;
};

export function EmailDigestSettings({ userEmail }: Props) {
  const [enabled, setEnabled] = useState(
    () => typeof window !== "undefined" && localStorage.getItem("trustlens-digest") === "on",
  );
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);

  async function handleToggle() {
    const next = !enabled;
    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch(`${API_URL}/api/email/subscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: userEmail, enabled: next }),
      });
      const data = await res.json();
      if (res.ok) {
        setEnabled(next);
        localStorage.setItem("trustlens-digest", next ? "on" : "off");
        setMessage(data.message);
      } else {
        setMessage(data.detail ?? "Hata oluştu");
      }
    } catch {
      setMessage("Bağlantı hatası");
    } finally {
      setLoading(false);
    }
  }

  async function handleTestSend() {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch(`${API_URL}/api/email/digest/trigger`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: userEmail }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage("Test e-postası gönderildi ✓");
      } else {
        setMessage(data.detail ?? "Gönderilemedi");
      }
    } catch {
      setMessage("Bağlantı hatası");
    } finally {
      setLoading(false);
    }
  }

  async function handlePreview() {
    try {
      const res = await fetch(`${API_URL}/api/email/digest/preview`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: userEmail }),
      });
      const data = await res.json();
      if (res.ok) {
        setPreviewHtml(data.html);
      }
    } catch {
      setMessage("Önizleme yüklenemedi");
    }
  }

  return (
    <div className="space-y-6">
      {/* Toggle row */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="font-mono text-[11px] tracking-[0.18em] uppercase text-[var(--foreground)]">
            Haftalık özet e-postası
          </div>
          <p className="text-[12px] text-[var(--muted)] mt-1">
            Her Pazartesi, geçen haftanın tarama özeti e-postana gelsin.
          </p>
        </div>
        <button
          type="button"
          onClick={handleToggle}
          disabled={loading}
          className={`shrink-0 w-12 h-7 border transition-colors relative ${
            enabled
              ? "bg-[var(--accent)]/20 border-[var(--accent)]"
              : "bg-[var(--surface)] border-[var(--border-strong)]"
          }`}
          aria-pressed={enabled}
        >
          <span
            className={`absolute top-1 w-5 h-5 transition-all ${
              enabled
                ? "left-6 bg-[var(--accent)]"
                : "left-1 bg-[var(--muted-2)]"
            }`}
          />
        </button>
      </div>

      {/* Email display */}
      <div className="flex items-center gap-3 px-4 py-3 border border-[var(--border-strong)] bg-[var(--surface)]/40">
        <span className="font-mono text-[10px] tracking-[0.22em] uppercase text-[var(--muted-2)]">
          alıcı
        </span>
        <span className="font-mono text-[12px] text-[var(--foreground)] truncate">
          {userEmail}
        </span>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={handleTestSend}
          disabled={loading}
          className="font-mono text-[10px] tracking-[0.22em] uppercase border border-[var(--border-strong)] hover:border-[var(--accent)] px-4 py-2.5 text-[var(--muted)] hover:text-[var(--accent)] transition-colors disabled:opacity-50"
        >
          test_gönder
        </button>
        <button
          type="button"
          onClick={handlePreview}
          className="font-mono text-[10px] tracking-[0.22em] uppercase border border-[var(--border-strong)] hover:border-[var(--foreground)] px-4 py-2.5 text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
        >
          önizle
        </button>
      </div>

      {/* Status message */}
      {message && (
        <div className="font-mono text-[11px] tracking-[0.18em] text-[var(--accent)] px-3 py-2 border border-[var(--accent)]/30 bg-[var(--accent)]/[0.05]">
          {message}
        </div>
      )}

      {/* Preview iframe */}
      {previewHtml && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] tracking-[0.22em] uppercase text-[var(--muted-2)]">
              e-posta önizleme
            </span>
            <button
              type="button"
              onClick={() => setPreviewHtml(null)}
              className="font-mono text-[10px] tracking-[0.22em] uppercase text-[var(--muted)] hover:text-[var(--red)] transition-colors"
            >
              kapat ×
            </button>
          </div>
          <iframe
            srcDoc={previewHtml}
            title="Email preview"
            className="w-full h-[500px] border border-[var(--border-strong)]"
            sandbox=""
          />
        </div>
      )}
    </div>
  );
}
