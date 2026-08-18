import { daysBetweenIsoDates } from "./date";

/** Sorts ascending and drops duplicates so streak maths can assume clean input. */
function normalize(dates: string[]): string[] {
  return Array.from(new Set(dates)).sort();
}

/**
 * Longest run of consecutive calendar days present in `dates`
 * (ISO "YYYY-MM-DD" strings, in any order).
 */
export function longestStreak(dates: string[]): number {
  const sorted = normalize(dates);
  if (sorted.length === 0) return 0;

  let longest = 1;
  let run = 1;

  for (let i = 1; i < sorted.length; i += 1) {
    if (daysBetweenIsoDates(sorted[i - 1]!, sorted[i]!) === 1) {
      run += 1;
      longest = Math.max(longest, run);
    } else {
      run = 1;
    }
  }

  return longest;
}

/**
 * Run of consecutive days ending today or yesterday. Yesterday still counts as
 * "current" because a day isn't a miss until it's over — otherwise every
 * streak would read as broken until the user checks in each morning.
 */
export function currentStreak(dates: string[], today: string): number {
  const sorted = normalize(dates);
  if (sorted.length === 0) return 0;

  const last = sorted[sorted.length - 1]!;
  const gap = daysBetweenIsoDates(last, today);
  if (gap > 1) return 0;

  let streak = 1;
  for (let i = sorted.length - 1; i > 0; i -= 1) {
    if (daysBetweenIsoDates(sorted[i - 1]!, sorted[i]!) !== 1) break;
    streak += 1;
  }
  return streak;
}
