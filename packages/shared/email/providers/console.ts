import type { EmailProvider, SendEmailInput, SendEmailResult } from "../types";

/**
 * Fallback used when no provider is configured. Keeps local development and
 * tests working without network access or API keys — the email is logged
 * instead of sent.
 */
export function createConsoleProvider(): EmailProvider {
  return {
    name: "console",

    async send({ to, subject, text }: SendEmailInput): Promise<SendEmailResult> {
      console.info(
        `[email:console] To: ${to}\n[email:console] Subject: ${subject}\n${text}`,
      );
      return { messageId: `console-${Date.now()}` };
    },
  };
}
