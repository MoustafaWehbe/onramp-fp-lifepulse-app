import type { EmailProvider, SendEmailInput, SendEmailResult } from "./types";
import { createResendProvider } from "./providers/resend";
import { createBrevoProvider } from "./providers/brevo";
import { createConsoleProvider } from "./providers/console";

const DEFAULT_FROM = "Kultivar <onboarding@resend.dev>";

let provider: EmailProvider | null = null;

function selectProvider(): EmailProvider {
  const from = process.env.EMAIL_FROM ?? DEFAULT_FROM;
  const configured = (process.env.EMAIL_PROVIDER ?? "").toLowerCase();

  // An explicit provider still needs its key; falling back to console rather
  // than throwing keeps a misconfigured deploy from failing every reminder job.
  if (configured === "resend" || (!configured && process.env.RESEND_API_KEY)) {
    const apiKey = process.env.RESEND_API_KEY;
    if (apiKey) return createResendProvider(apiKey, from);
  }

  if (configured === "brevo" || (!configured && process.env.BREVO_API_KEY)) {
    const apiKey = process.env.BREVO_API_KEY;
    if (apiKey) return createBrevoProvider(apiKey, from);
  }

  if (configured && configured !== "console") {
    console.warn(
      `[email] EMAIL_PROVIDER="${configured}" is set but its API key is missing — falling back to console output.`,
    );
  }

  return createConsoleProvider();
}

export function getEmailProvider(): EmailProvider {
  if (!provider) {
    provider = selectProvider();
  }
  return provider;
}

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  return getEmailProvider().send(input);
}

/** Base URL used to build links in emails (unsubscribe, deep links into the app). */
export function appUrl(path = ""): string {
  const base = (process.env.APP_URL ?? "http://localhost:5173").replace(/\/+$/, "");
  if (!path) return base;
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}
