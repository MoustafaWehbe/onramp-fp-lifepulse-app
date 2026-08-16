/** Habit names and other user-supplied values end up inside email HTML. */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export interface LayoutOptions {
  /** Short line under the heading, shown in most inbox previews. */
  preheader: string;
  heading: string;
  /** Pre-escaped HTML for the message body. */
  bodyHtml: string;
  cta?: { label: string; url: string };
  /** Omitted for transactional mail that users cannot opt out of. */
  unsubscribeUrl?: string;
}

/**
 * Table-based layout with inline styles — the only markup that renders
 * consistently across Gmail, Outlook, and Apple Mail.
 */
export function renderLayout({
  preheader,
  heading,
  bodyHtml,
  cta,
  unsubscribeUrl,
}: LayoutOptions): string {
  const ctaHtml = cta
    ? `<tr><td style="padding:8px 32px 32px;">
         <a href="${escapeHtml(cta.url)}" style="display:inline-block;background:#16a34a;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:12px 24px;border-radius:8px;">${escapeHtml(cta.label)}</a>
       </td></tr>`
    : "";

  const unsubscribeHtml = unsubscribeUrl
    ? `<p style="margin:8px 0 0;">
         <a href="${escapeHtml(unsubscribeUrl)}" style="color:#94a3b8;text-decoration:underline;">Unsubscribe from these emails</a>
       </p>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(heading)}</title>
  </head>
  <body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(preheader)}</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;border:1px solid #e2e8f0;">
            <tr>
              <td style="padding:32px 32px 0;">
                <p style="margin:0;font-size:13px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#16a34a;">Kultivar</p>
                <h1 style="margin:12px 0 0;font-size:22px;line-height:1.3;color:#0f172a;">${escapeHtml(heading)}</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 32px 0;font-size:15px;line-height:1.6;color:#334155;">${bodyHtml}</td>
            </tr>
            ${ctaHtml}
          </table>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
            <tr>
              <td style="padding:20px 32px;font-size:12px;line-height:1.5;color:#94a3b8;text-align:center;">
                <p style="margin:0;">You're receiving this because you have an account on Kultivar.</p>
                ${unsubscribeHtml}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

/** Appends the plain-text equivalent of the layout footer. */
export function renderTextFooter(unsubscribeUrl?: string): string {
  const lines = ["", "—", "You're receiving this because you have an account on Kultivar."];
  if (unsubscribeUrl) {
    lines.push(`Unsubscribe: ${unsubscribeUrl}`);
  }
  return lines.join("\n");
}
