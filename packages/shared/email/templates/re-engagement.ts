import type { RenderedEmail } from "../types";
import { appUrl } from "../client";
import { escapeHtml, renderLayout, renderTextFooter } from "./layout";

export interface ReEngagementVariables {
  name?: string;
  daysInactive: string;
  longestStreak?: string;
  topHabit?: string;
  areaName?: string;
  /**
   * Index into the variant list. Omitted in normal sends, where one is picked
   * at random; set by previews and tests that need a stable result.
   */
  variant?: string;
}

interface Variant {
  subject: (ctx: Copy) => string;
  heading: (ctx: Copy) => string;
  lines: (ctx: Copy) => string[];
  cta: string;
}

interface Copy {
  firstName: string;
  daysInactive: number;
  longestStreak: number;
  topHabit?: string;
  areaName?: string;
}

/**
 * Sent once, after a month of silence. The tone is deliberately final and
 * low-pressure: it offers an exit as readily as a restart, and never implies
 * failure — someone who stopped already feels it.
 *
 * Several variants exist so the message doesn't read like a form letter across
 * users or across a second lapse. One is chosen at random per send.
 */
const VARIANTS: Variant[] = [
  {
    subject: () => "Still worth keeping?",
    heading: () => "A month later",
    lines: ({ longestStreak }) => [
      "This is the only nudge we'll send — we'd rather be useful than noisy.",
      longestStreak > 1
        ? `Your best run was ${longestStreak} days. That progress is still saved if you want to pick it back up.`
        : "Everything you set up is still saved if you want to pick it back up.",
      "If these habits aren't the right ones anymore, archiving them is a perfectly good outcome too.",
    ],
    cta: "Take a look",
  },
  {
    subject: () => "Everything is still saved",
    heading: () => "One month on",
    lines: ({ longestStreak, topHabit }) => [
      "We won't keep emailing after this one.",
      longestStreak > 1
        ? `Your ${longestStreak}-day best run is still on record, along with everything else.`
        : "Your habits, areas, and history are all exactly where you left them.",
      topHabit
        ? `If you ever want back in, ${topHabit} is the obvious place to start.`
        : "If you ever want back in, start with whichever habit feels smallest.",
    ],
    cta: "Open Kultivar",
  },
  {
    subject: () => "A clean slate, if you want one",
    heading: () => "It's been a month",
    lines: () => [
      "Last message from us — no more after this.",
      "You can pick up exactly where you stopped, or clear the list and start over with habits that suit you now.",
      "Both are fine. Walking away is fine too.",
    ],
    cta: "Decide later",
  },
  {
    subject: ({ topHabit }) =>
      topHabit ? `${topHabit} takes one minute` : "One minute is enough",
    heading: () => "The smallest way back",
    lines: ({ topHabit }) => [
      "A month off makes returning feel like a big commitment. It isn't.",
      topHabit
        ? `One check-in on ${topHabit} is the whole ask. Not a week of them — one.`
        : "One check-in on your easiest habit is the whole ask. Not a week of them — one.",
      "There's no backlog to clear and nothing to make up for.",
    ],
    cta: "Check in once",
  },
  {
    subject: () => "Did something change?",
    heading: () => "Maybe these aren't the right habits",
    lines: ({ areaName }) => [
      "When something stops happening for a month, it's usually the plan, not the person.",
      areaName
        ? `If ${areaName} matters less than it did, change the list. That's a good decision, not a defeat.`
        : "If your priorities moved, change the list to match. That's a good decision, not a defeat.",
      "A short list you actually keep beats an ambitious one you don't.",
    ],
    cta: "Rework my habits",
  },
  {
    subject: ({ longestStreak }) =>
      longestStreak > 1 ? `Your ${longestStreak}-day run is still here` : "Your history is intact",
    heading: () => "Nothing expired",
    lines: ({ longestStreak, areaName }) => [
      longestStreak > 1
        ? `You once kept this going for ${longestStreak} days. That happened, and it's still recorded.`
        : "Everything you tracked is still recorded, exactly as you left it.",
      areaName
        ? `Your ${areaName} habits are waiting, unchanged.`
        : "Your habits are waiting, unchanged.",
      "Starting again is a much shorter trip than starting the first time.",
    ],
    cta: "See my history",
  },
  {
    subject: () => "No catching up required",
    heading: () => "There's no backlog",
    lines: ({ topHabit }) => [
      "A month away doesn't leave you behind — this isn't the kind of thing you can fall behind on.",
      topHabit
        ? `Open the app, tick ${topHabit}, close the app. That's a complete day.`
        : "Open the app, tick one habit, close the app. That's a complete day.",
      "The counter starts from today, not from where you stopped.",
    ],
    cta: "Start from today",
  },
  {
    subject: () => "Last note from us",
    heading: ({ firstName }) => (firstName ? `Take care, ${firstName}` : "Take care"),
    lines: () => [
      "You haven't checked in for a month, so this is where we stop emailing.",
      "Your account stays exactly as it is — habits, areas, and history all intact — for whenever you want it.",
      "No hard feelings either way. The door stays open.",
    ],
    cta: "Come back any time",
  },
];

/** How many variants exist. Used to enumerate them in previews. */
export const RE_ENGAGEMENT_VARIANT_COUNT = VARIANTS.length;

function pickVariant(requested?: string): Variant {
  const index = Number(requested);
  if (requested !== undefined && Number.isInteger(index) && VARIANTS[index]) {
    return VARIANTS[index]!;
  }
  return VARIANTS[Math.floor(Math.random() * VARIANTS.length)]!;
}

export function renderReEngagement(
  variables: Record<string, string>,
  unsubscribeUrl?: string,
): RenderedEmail {
  const vars = variables as unknown as ReEngagementVariables;

  const copy: Copy = {
    firstName: (vars.name ?? "").trim().split(/\s+/)[0] ?? "",
    daysInactive: Number(vars.daysInactive ?? 0),
    longestStreak: Number(vars.longestStreak ?? 0),
    topHabit: vars.topHabit || undefined,
    areaName: vars.areaName || undefined,
  };

  const variant = pickVariant(vars.variant);
  const lines = variant.lines(copy);
  const ctaUrl = appUrl("/today");

  const bodyHtml = lines
    .map((line, i) => {
      const margin = i === lines.length - 1 ? "0" : "0 0 12px";
      return `<p style="margin:${margin};">${escapeHtml(line)}</p>`;
    })
    .join("\n    ");

  return {
    subject: variant.subject(copy),
    html: renderLayout({
      preheader: lines[0] ?? "",
      heading: variant.heading(copy),
      bodyHtml,
      cta: { label: variant.cta, url: ctaUrl },
      unsubscribeUrl,
    }),
    text: [...lines, "", `${variant.cta}: ${ctaUrl}`, renderTextFooter(unsubscribeUrl)].join("\n"),
  };
}
