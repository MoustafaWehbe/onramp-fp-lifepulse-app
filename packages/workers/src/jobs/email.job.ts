import type { Job } from "bullmq";
import {
  getOrCreatePreferences,
  renderTemplate,
  sendEmail,
  unsubscribeUrl,
} from "@starter-kit/shared";
import type { EmailJobData, EmailJobResult } from "@starter-kit/shared";

/**
 * Renders the named template and hands it to whichever provider is configured
 * (see packages/shared/email/client.ts). Transient provider failures throw so
 * BullMQ's retry policy — 3 attempts with exponential backoff — can handle them.
 */
export async function processEmailJob(
  job: Job<EmailJobData, EmailJobResult>,
): Promise<EmailJobResult> {
  const { to, subject, template, variables, userId } = job.data;

  // Only known recipients get an unsubscribe link; anonymous transactional
  // mail (if any) has nothing to opt out of.
  let optOutUrl: string | undefined;
  if (userId) {
    const preferences = await getOrCreatePreferences(userId);
    optOutUrl = unsubscribeUrl(preferences.unsubscribeToken);
  }

  const rendered = renderTemplate(template, subject, variables ?? {}, optOutUrl);

  const { messageId } = await sendEmail({
    to,
    subject: rendered.subject,
    html: rendered.html,
    text: rendered.text,
  });

  console.info(`[email] Sent "${rendered.subject}" to ${to} (${messageId})`);

  return { messageId };
}
