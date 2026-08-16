import type { RenderedEmail } from "../types";
import { renderHabitReminder } from "./habit-reminder";
import { renderReEngagement, RE_ENGAGEMENT_VARIANT_COUNT } from "./re-engagement";
import { renderLayout, renderTextFooter, escapeHtml } from "./layout";

export type TemplateRenderer = (
  variables: Record<string, string>,
  unsubscribeUrl?: string,
) => RenderedEmail;

export const EMAIL_TEMPLATES = {
  "habit-reminder": renderHabitReminder,
  "re-engagement": renderReEngagement,
} satisfies Record<string, TemplateRenderer>;

export type EmailTemplateName = keyof typeof EMAIL_TEMPLATES;

/**
 * Renders a named template. Unknown names fall back to a plain message built
 * from the job's subject so a typo degrades to a deliverable email rather than
 * a permanently failing job.
 */
export function renderTemplate(
  name: string,
  subject: string,
  variables: Record<string, string> = {},
  unsubscribeUrl?: string,
): RenderedEmail {
  const renderer = EMAIL_TEMPLATES[name as EmailTemplateName];

  if (renderer) {
    return renderer(variables, unsubscribeUrl);
  }

  console.warn(`[email] Unknown template "${name}" — sending a plain fallback.`);
  return {
    subject,
    html: renderLayout({
      preheader: subject,
      heading: subject,
      bodyHtml: `<p style="margin:0;">${escapeHtml(subject)}</p>`,
      unsubscribeUrl,
    }),
    text: `${subject}\n${renderTextFooter(unsubscribeUrl)}`,
  };
}

export {
  renderHabitReminder,
  renderReEngagement,
  RE_ENGAGEMENT_VARIANT_COUNT,
  renderLayout,
  renderTextFooter,
  escapeHtml,
};
