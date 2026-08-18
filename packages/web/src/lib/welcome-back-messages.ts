export interface WelcomeBackMessage {
  heading: string;
  body: (ctx: { daysAway: number; longestStreak: number }) => string;
}

/**
 * Copy for the returning-user popup and banner, grouped by how long the user
 * has been away. Warm, specific, and never scolding — someone opening the app
 * after a gap has already decided to come back, so the only job here is to
 * make the next check-in feel easy.
 *
 * Several variants per rung keep a second lapse from reading like a form
 * letter, while the tone stays matched to the length of the gap.
 */
export const WELCOME_BACK_MESSAGES: Record<number, WelcomeBackMessage[]> = {
  3: [
    {
      heading: "You're back",
      body: ({ daysAway }) =>
        `${daysAway} days off is nothing — life gets busy. One check-in today puts you right back on track.`,
    },
    {
      heading: "Good to see you",
      body: () =>
        "Nothing to catch up on and no streak to rebuild. Pick whichever habit is easiest and start there.",
    },
    {
      heading: "Right where you left off",
      body: ({ daysAway }) =>
        `Your list hasn't changed in ${daysAway} days. One check-in is a complete win today.`,
    },
  ],
  7: [
    {
      heading: "Welcome back",
      body: ({ longestStreak }) =>
        longestStreak > 1
          ? `A week off doesn't erase the ${longestStreak} days you strung together before. Start again with whichever habit feels easiest.`
          : "A week off doesn't undo anything. Start again with whichever habit feels easiest.",
    },
    {
      heading: "A week goes fast",
      body: () =>
        "Weeks disappear — that's a calendar problem, not a you problem. The smallest restart is a single check-in.",
    },
    {
      heading: "No verdict here",
      body: ({ longestStreak }) =>
        longestStreak > 1
          ? `Seven days away says nothing about the ${longestStreak} you managed before. Borrow a little momentum and check in once.`
          : "Seven days away says nothing about whether this works for you. Check in once and see.",
    },
  ],
  14: [
    {
      heading: "Good to see you again",
      body: () =>
        "Two weeks away changes nothing about what you're building. Check in on one habit today — that's a complete win.",
    },
    {
      heading: "Maybe start smaller",
      body: () =>
        "If a habit stopped happening, the habit is usually too big. Shrink one until it feels almost too easy, then build back up.",
    },
    {
      heading: "Two weeks, no judgement",
      body: () =>
        "This is a good moment to check whether these are still the right habits. A shorter list you keep beats a long one you don't.",
    },
  ],
  30: [
    {
      heading: "Welcome back",
      body: ({ longestStreak }) =>
        longestStreak > 1
          ? `It's been a while, and everything is exactly where you left it — including your ${longestStreak}-day best run. Pick one habit and start there.`
          : "It's been a while, and everything is exactly where you left it. Pick one habit and start there.",
    },
    {
      heading: "Everything is still here",
      body: ({ longestStreak }) =>
        longestStreak > 1
          ? `Your habits, your history, and your ${longestStreak}-day best run are all saved. Nothing expired while you were away.`
          : "Your habits, areas, and history are all saved. Nothing expired while you were away.",
    },
    {
      heading: "Pick up or start over",
      body: () =>
        "You can carry on exactly where you stopped, or clear the list and rebuild it around what matters now. Both are good options.",
    },
  ],
};

const RUNGS = [30, 14, 7, 3] as const;

/**
 * Stable pick for a given day: the popup must not swap wording every time
 * React re-renders, and a returning user should see one consistent message
 * until tomorrow.
 */
function dailyIndex(seed: string, length: number): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) % length;
}

export function welcomeBackMessage(
  daysAway: number,
  longestStreak: number,
  seed: string,
): { heading: string; body: string } {
  const rung = RUNGS.find((r) => daysAway >= r) ?? 3;
  const variants = WELCOME_BACK_MESSAGES[rung]!;
  const variant = variants[dailyIndex(`${seed}:${rung}`, variants.length)]!;

  return {
    heading: variant.heading,
    body: variant.body({ daysAway, longestStreak }),
  };
}
