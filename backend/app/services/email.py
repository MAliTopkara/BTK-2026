"""
TrustLens AI — Email Service (TASK-46)
Sends weekly digest emails via Resend API.
"""

import httpx

from app.config import settings


async def send_email(to: str, subject: str, html: str) -> bool:
    """Send an email via Resend API. Returns True on success."""
    api_key = settings.resend_api_key
    if not api_key:
        return False

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            res = await client.post(
                "https://api.resend.com/emails",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "from": "TrustLens AI <noreply@trustlens.app>",
                    "to": [to],
                    "subject": subject,
                    "html": html,
                },
            )
            return res.status_code in (200, 201)
    except Exception:
        return False


def build_weekly_digest_html(
    user_email: str,
    scans_count: int,
    avg_score: int,
    top_risk_product: str | None,
    top_risk_score: int | None,
    savings_estimate: float,
    period: str,
) -> str:
    """Build HTML email for weekly digest."""
    risk_section = ""
    if top_risk_product and top_risk_score is not None:
        risk_section = f"""
        <tr>
          <td style="padding: 16px 24px; border-bottom: 1px solid #2a2a2a;">
            <p style="margin: 0 0 4px; font-family: monospace; font-size: 10px; letter-spacing: 2px; text-transform: uppercase; color: #555;">EN RİSKLİ ÜRÜN</p>
            <p style="margin: 0; font-size: 14px; color: #ff4d4d;">{_escape(top_risk_product)}</p>
            <p style="margin: 4px 0 0; font-family: monospace; font-size: 12px; color: #888;">Skor: {top_risk_score}/100</p>
          </td>
        </tr>
        """

    savings_section = ""
    if savings_estimate > 0:
        savings_section = f"""
        <tr>
          <td style="padding: 16px 24px; border-bottom: 1px solid #2a2a2a;">
            <p style="margin: 0 0 4px; font-family: monospace; font-size: 10px; letter-spacing: 2px; text-transform: uppercase; color: #555;">TAHMİNİ TASARRUF</p>
            <p style="margin: 0; font-family: serif; font-style: italic; font-size: 28px; color: #00ff88;">₺{savings_estimate:,.0f}</p>
            <p style="margin: 4px 0 0; font-size: 12px; color: #888;">Bu hafta riskli ürünlerden kaçınarak tasarruf ettiğin tahmini tutar.</p>
          </td>
        </tr>
        """

    return f"""<!DOCTYPE html>
<html lang="tr">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin: 0; padding: 0; background: #0a0a0a; font-family: -apple-system, system-ui, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: #0a0a0a;">
    <tr>
      <td align="center" style="padding: 40px 16px;">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width: 560px; width: 100%; background: #0f0f0f; border: 1px solid #2a2a2a;">
          <!-- Header -->
          <tr>
            <td style="padding: 20px 24px; border-bottom: 1px solid #2a2a2a;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <span style="display: inline-block; width: 8px; height: 8px; background: #00ff88; border-radius: 50%; margin-right: 8px; vertical-align: middle;"></span>
                    <span style="font-family: monospace; font-size: 11px; letter-spacing: 2px; text-transform: uppercase; color: #ededed; vertical-align: middle;">TrustLens AI</span>
                  </td>
                  <td align="right">
                    <span style="font-family: monospace; font-size: 9px; letter-spacing: 2px; text-transform: uppercase; color: #555;">Haftalık Özet</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Period -->
          <tr>
            <td style="padding: 24px 24px 8px;">
              <p style="margin: 0; font-family: monospace; font-size: 10px; letter-spacing: 2px; text-transform: uppercase; color: #555;">
                <span style="display: inline-block; width: 24px; height: 1px; background: #00ff88; vertical-align: middle; margin-right: 8px;"></span>
                {_escape(period)}
              </p>
              <h1 style="margin: 12px 0 0; font-family: serif; font-style: italic; font-size: 24px; font-weight: normal; color: #ededed;">
                Bu hafta <span style="color: #00ff88;">{scans_count}</span> tarama yaptın.
              </h1>
            </td>
          </tr>

          <!-- Stats -->
          <tr>
            <td style="padding: 16px 24px; border-bottom: 1px solid #2a2a2a;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td width="50%" style="padding: 12px 0;">
                    <p style="margin: 0 0 4px; font-family: monospace; font-size: 10px; letter-spacing: 2px; text-transform: uppercase; color: #555;">TARAMA</p>
                    <p style="margin: 0; font-family: serif; font-style: italic; font-size: 32px; color: #00ff88;">{scans_count}</p>
                  </td>
                  <td width="50%" style="padding: 12px 0;">
                    <p style="margin: 0 0 4px; font-family: monospace; font-size: 10px; letter-spacing: 2px; text-transform: uppercase; color: #555;">ORT. SKOR</p>
                    <p style="margin: 0; font-family: serif; font-style: italic; font-size: 32px; color: {'#00ff88' if avg_score >= 70 else '#ffcc33' if avg_score >= 40 else '#ff4d4d'};">{avg_score}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          {risk_section}
          {savings_section}

          <!-- CTA -->
          <tr>
            <td style="padding: 24px;">
              <a href="https://btk-2026.vercel.app/dashboard" style="display: block; background: #00ff88; color: #000; padding: 14px 24px; font-family: monospace; font-size: 11px; letter-spacing: 2px; text-transform: uppercase; text-decoration: none; text-align: center;">
                Dashboard'a Git →
              </a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 16px 24px; border-top: 1px solid #2a2a2a;">
              <p style="margin: 0; font-family: monospace; font-size: 9px; letter-spacing: 1.5px; text-transform: uppercase; color: #555; text-align: center;">
                {_escape(user_email)} · <a href="https://btk-2026.vercel.app/settings" style="color: #00ff88; text-decoration: none;">e-posta ayarları</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""


def _escape(s: str) -> str:
    return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
