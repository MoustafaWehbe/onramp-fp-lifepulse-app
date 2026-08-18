import type { EmailProvider, SendEmailInput, SendEmailResult } from "../types";

const RESEND_ENDPOINT = "https://api.resend.com/emails";

/**
 * Resend's REST API is a single POST, so we call it with `fetch` rather than
 * pulling in the SDK. Node >= 20 (see the engines field) has global fetch.
 *
 * Free-tier note: Resend allows one verified sending domain. Until a domain is
 * verified, `from` must be `onboarding@resend.dev`, which can only deliver to
 * the address that owns the Resend account. Use the Brevo provider instead if
 * you need to mail arbitrary recipients without owning a domain.
 */
export function createResendProvider(apiKey: string, from: string): EmailProvider {
  return {
    name: "resend",

    async send({ to, subject, html, text }: SendEmailInput): Promise<SendEmailResult> {
      const response = await fetch(RESEND_ENDPOINT, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ from, to, subject, html, text }),
      });

      if (!response.ok) {
        // Surface the provider's message so BullMQ's retry logs are actionable.
        const body = await response.text();
        throw new Error(`Resend responded ${response.status}: ${body}`);
      }

      const payload = (await response.json()) as { id?: string };
      return { messageId: payload.id ?? "unknown" };
    },
  };
}
