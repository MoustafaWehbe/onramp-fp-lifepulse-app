import type { RenderedEmail } from "../types";
import { appUrl } from "../client";
import { escapeHtml, renderLayout, renderTextFooter } from "./layout";

export interface HabitReminderVariables {
  habitName: string;
  reminderTime?: string;
  areaName?: string;
  /** Current streak in days, rendered only when it's worth protecting. */
  streak?: string;
}

export function renderHabitReminder(
  variables: Record<string, string>,
  unsubscribeUrl?: string,
): RenderedEmail {
  const { habitName, reminderTime, areaName, streak } =
    variables as unknown as HabitReminderVariables;

  const streakDays = Number(streak ?? 0);
  const ctaUrl = appUrl("/today");

  const context = areaName ? ` in ${areaName}` : "";
  const streakLine =
    streakDays > 1
      ? `You're on a ${streakDays}-day streak. One check-in keeps it alive.`
      : "It only takes a moment to check in.";

  const subject = `Time for: ${habitName}`;
  const heading = `Time for ${habitName}`;

  const bodyHtml = `
    <p style="margin:0 0 12px;">This is your${reminderTime ? ` ${escapeHtml(reminderTime)}` : ""} reminder for <strong>${escapeHtml(habitName)}</strong>${escapeHtml(context)}.</p>
    <p style="margin:0;">${escapeHtml(streakLine)}</p>`;

  const text = [
    `This is your${reminderTime ? ` ${reminderTime}` : ""} reminder for ${habitName}${context}.`,
    streakLine,
    "",
    `Check in: ${ctaUrl}`,
    renderTextFooter(unsubscribeUrl),
  ].join("\n");

  return {
    subject,
    html: renderLayout({
      preheader: streakLine,
      heading,
      bodyHtml,
      cta: { label: "Check in now", url: ctaUrl },
      unsubscribeUrl,
    }),
    text,
  };
}
