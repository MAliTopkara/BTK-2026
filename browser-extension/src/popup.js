const API_URL = "https://btk-2026-production.up.railway.app";
const APP_URL = "https://btk-2026.vercel.app";

const urlInput = document.getElementById("url-input");
const scanBtn = document.getElementById("scan-btn");
const currentBtn = document.getElementById("current-btn");
const statusEl = document.getElementById("status");
const resultEl = document.getElementById("result");

scanBtn.addEventListener("click", () => {
  const url = urlInput.value.trim();
  if (!url) {
    showStatus("URL gir veya aktif sayfayı tara", true);
    return;
  }
  startScan(url);
});

currentBtn.addEventListener("click", async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.url) {
    showStatus("Aktif sayfa URL'si alınamadı", true);
    return;
  }
  urlInput.value = tab.url;
  startScan(tab.url);
});

async function startScan(url) {
  scanBtn.disabled = true;
  currentBtn.disabled = true;
  resultEl.style.display = "none";
  showStatus("Taranıyor… (~10 saniye)");

  try {
    const res = await fetch(`${API_URL}/api/scan`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url, force_refresh: false }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.detail || `HTTP ${res.status}`);
    }

    const result = await res.json();
    showResult(result);
    showStatus("");
  } catch (err) {
    showStatus(`Hata: ${err.message}`, true);
  } finally {
    scanBtn.disabled = false;
    currentBtn.disabled = false;
  }
}

function showStatus(text, isError = false) {
  statusEl.textContent = text;
  statusEl.className = `status ${isError ? "status-error" : ""}`;
}

function showResult(result) {
  const color =
    result.verdict === "BUY"
      ? "#00ff88"
      : result.verdict === "CAUTION"
        ? "#ffcc33"
        : "#ff4d4d";

  const verdictTr =
    result.verdict === "BUY"
      ? "AL"
      : result.verdict === "CAUTION"
        ? "DİKKATLİ OL"
        : "ALMA";

  const explanation = result.final_explanation
    ? result.final_explanation.length > 150
      ? result.final_explanation.slice(0, 150) + "…"
      : result.final_explanation
    : "";

  resultEl.innerHTML = `
    <div class="result-card">
      <div class="result-verdict">
        <span class="result-dot" style="background:${color}"></span>
        <span class="result-verdict-text" style="color:${color}">${verdictTr}</span>
        <span class="result-score">${result.overall_score}/100</span>
      </div>
      ${explanation ? `<p class="result-explanation">${escapeHtml(explanation)}</p>` : ""}
      <a class="result-link" href="${APP_URL}/scan/${result.scan_id}" target="_blank">
        detaylı rapor →
      </a>
    </div>
  `;
  resultEl.style.display = "block";
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}
