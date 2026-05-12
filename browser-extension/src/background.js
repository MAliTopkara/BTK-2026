const API_URL = "https://btk-2026-production.up.railway.app";
const APP_URL = "https://btk-2026.vercel.app";

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "SCAN_URL") {
    scanUrl(message.url).then(sendResponse).catch((err) => {
      sendResponse({ error: err.message });
    });
    return true;
  }

  if (message.type === "OPEN_FULL_REPORT") {
    chrome.tabs.create({
      url: `${APP_URL}/scan/${message.scanId}`,
    });
    sendResponse({ ok: true });
    return false;
  }

  if (message.type === "OPEN_DASHBOARD") {
    chrome.tabs.create({ url: `${APP_URL}/dashboard` });
    sendResponse({ ok: true });
    return false;
  }
});

async function scanUrl(url) {
  const res = await fetch(`${API_URL}/api/scan`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url, force_refresh: false }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `HTTP ${res.status}`);
  }

  return res.json();
}
