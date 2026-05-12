(function () {
  if (document.getElementById("trustlens-fab")) return;

  const fab = document.createElement("button");
  fab.id = "trustlens-fab";
  fab.setAttribute("aria-label", "TrustLens AI ile tara");
  fab.innerHTML = `
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <circle cx="10" cy="10" r="8" stroke="#00ff88" stroke-width="1.5" fill="none"/>
      <circle cx="10" cy="10" r="3" fill="#00ff88"/>
    </svg>
    <span class="trustlens-fab-label">TrustLens</span>
  `;

  const tooltip = document.createElement("div");
  tooltip.id = "trustlens-tooltip";
  tooltip.className = "trustlens-tooltip";
  tooltip.style.display = "none";

  document.body.appendChild(fab);
  document.body.appendChild(tooltip);

  let scanning = false;

  fab.addEventListener("click", async () => {
    if (scanning) return;
    scanning = true;
    fab.classList.add("trustlens-fab-loading");
    showTooltip("Taranıyor… (~10 sn)");

    try {
      const result = await chrome.runtime.sendMessage({
        type: "SCAN_URL",
        url: window.location.href,
      });

      if (result.error) {
        showTooltip(`Hata: ${result.error}`, true);
        return;
      }

      showResult(result);
      chrome.storage.local.set({
        [`scan_${result.scan_id}`]: result,
        last_scan_id: result.scan_id,
      });
    } catch (err) {
      showTooltip(`Bağlantı hatası: ${err.message}`, true);
    } finally {
      scanning = false;
      fab.classList.remove("trustlens-fab-loading");
    }
  });

  function showTooltip(text, isError = false) {
    tooltip.textContent = text;
    tooltip.style.display = "block";
    tooltip.className = `trustlens-tooltip ${isError ? "trustlens-tooltip-error" : ""}`;
    clearTimeout(tooltip._hideTimer);
    if (isError) {
      tooltip._hideTimer = setTimeout(() => {
        tooltip.style.display = "none";
      }, 5000);
    }
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

    tooltip.innerHTML = `
      <div class="trustlens-result">
        <div class="trustlens-result-header">
          <span class="trustlens-result-dot" style="background:${color}"></span>
          <span class="trustlens-result-verdict" style="color:${color}">${verdictTr}</span>
          <span class="trustlens-result-score">${result.overall_score}/100</span>
        </div>
        <p class="trustlens-result-explanation">${escapeHtml(truncate(result.final_explanation, 120))}</p>
        <button class="trustlens-result-btn" id="trustlens-open-report">Detaylı Rapor →</button>
      </div>
    `;
    tooltip.style.display = "block";
    tooltip.className = "trustlens-tooltip";

    document.getElementById("trustlens-open-report")?.addEventListener("click", () => {
      chrome.runtime.sendMessage({
        type: "OPEN_FULL_REPORT",
        scanId: result.scan_id,
      });
    });
  }

  function truncate(str, len) {
    if (!str) return "";
    return str.length > len ? str.slice(0, len) + "…" : str;
  }

  function escapeHtml(str) {
    if (!str) return "";
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
})();
