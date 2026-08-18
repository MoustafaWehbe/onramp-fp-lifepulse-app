import type { EmailProvider, SendEmailInput, SendEmailResult } from "../types";

const BREVO_ENDPOINT = "https://api.brevo.com/v3/smtp/email";

/** Splits `"Kultivar <hi@example.com>"` into its name and address parts. */
function parseFrom(from: string): { email: string; name?: string } {
  const match = /^\s*(.*?)\s*<([^>]+)>\s*$/.exec(from);
  if (match) {
    return { email: match[2]!, name: match[1] || undefined };
  }
  return { email: from.trim() };
}

/**
 * Brevo's free tier (300 emails/day) allows sending from a single verified
 * sender address rather than requiring a verified domain, which makes it the
 * practical choice when you don't own a domain yet.
 */
export function createBrevoProvider(apiKey: string, from: string): EmailProvider {
  const sender = parseFrom(from);

  return {
    name: "brevo",

    async send({ to, subject, html, text }: SendEmailInput): Promise<SendEmailResult> {
      const response = await fetch(BREVO_ENDPOINT, {
        method: "POST",
        headers: {
          "api-key": apiKey,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          sender,
          to: [{ email: to }],
          subject,
          htmlContent: html,
          textContent: text,
        }),
      });

      if (!response.ok) {
        const body = await response.text();
        throw new Error(`Brevo responded ${response.status}: ${body}`);
      }

      const payload = (await response.json()) as { messageId?: string };
      return { messageId: payload.messageId ?? "unknown" };
    },
  };
}
