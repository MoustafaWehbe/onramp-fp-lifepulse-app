import type { Frequency } from "@/lib/store";

/**
 * The fields the Progress page needs to know whether a day (or a window)
 * counted as an expected check-in for a habit. Kept narrow so the maths can
 * be unit-tested without spinning up the habits hook.
 */
export interface SchedulableHabit {
  id: string;
  frequency: Frequency;
  /** 0=Sun..6=Sat. When set, these days are the schedule — frequency is only a quota. */
  daysOfWeek: number[] | null;
}

export interface DatedCheckIn {
  habitId: string;
  date: string;
}

export interface CompletionStats {
  expected: number;
  /** Check-ins in the window, capped at `expected` so extras can't push past 100%. */
  done: number;
  pct: number;
}

const TIMES_PER_WEEK: Record<Frequency, number> = {
  daily: 7,
  weekdays: 5,
  "5x": 5,
  "3x": 3,
  weekly: 1,
};

/** Parse YYYY-MM-DD as a local calendar day, matching `daysAgoStr`. */
function parseLocalDate(isoDate: string): Date {
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Date(year, month - 1, day);
}

/** 0=Sun..6=Sat, matching Habit.daysOfWeek and Date#getDay(). */
export function weekdayOf(isoDate: string): number {
  return parseLocalDate(isoDate).getDay();
}

function timesPerWeek(habit: SchedulableHabit): number {
  return TIMES_PER_WEEK[habit.frequency];
}

/**
 * True when the habit is pinned to specific calendar days, so expected slots
 * are a count of matching weekdays rather than a weekly quota smeared across
 * the window.
 */
function isPinnedToWeekdays(habit: SchedulableHabit): boolean {
  if (habit.daysOfWeek && habit.daysOfWeek.length > 0) return true;
  return habit.frequency === "daily" || habit.frequency === "weekdays";
}

/**
 * Whether this habit was due on `isoDate`. Quota frequencies (3x / 5x / weekly)
 * without an explicit `daysOfWeek` are not due on any particular day — they
 * contribute to the window total, not to a single cell of the heatmap.
 */
export function isHabitDueOn(habit: SchedulableHabit, isoDate: string): boolean {
  if (habit.daysOfWeek && habit.daysOfWeek.length > 0) {
    return habit.daysOfWeek.includes(weekdayOf(isoDate));
  }
  if (habit.frequency === "weekdays") {
    const day = weekdayOf(isoDate);
    return day >= 1 && day <= 5;
  }
  if (habit.frequency === "daily") return true;
  return false;
}

function uniqueCheckInsInWindow(
  habitId: string,
  dates: readonly string[],
  checkIns: readonly DatedCheckIn[],
): number {
  const window = new Set(dates);
  const seen = new Set<string>();
  for (const checkIn of checkIns) {
    if (checkIn.habitId === habitId && window.has(checkIn.date)) {
      seen.add(checkIn.date);
    }
  }
  return seen.size;
}

function pctOf(done: number, expected: number): number {
  if (expected <= 0) return 0;
  return Math.round((Math.min(done, expected) / expected) * 100);
}

/**
 * Expected check-ins for a habit across `dates`.
 *
 * Pinned schedules (daily, weekdays, or an explicit `daysOfWeek`) count the
 * matching calendar days. Unpinned 3x / 5x / weekly habits use a weekly quota
 * scaled to the window length, so a weekly habit over 14 days expects 2, not 14.
 */
export function expectedSlots(
  habit: SchedulableHabit,
  dates: readonly string[],
): number {
  if (dates.length === 0) return 0;
  if (isPinnedToWeekdays(habit)) {
    return dates.filter((date) => isHabitDueOn(habit, date)).length;
  }
  return Math.round((dates.length * timesPerWeek(habit)) / 7);
}

export function habitCompletion(
  habit: SchedulableHabit,
  dates: readonly string[],
  checkIns: readonly DatedCheckIn[],
): CompletionStats {
  const expected = expectedSlots(habit, dates);
  const raw = uniqueCheckInsInWindow(habit.id, dates, checkIns);
  const done = Math.min(raw, expected);
  return { expected, done, pct: pctOf(done, expected) };
}

export function habitsCompletion(
  habits: readonly SchedulableHabit[],
  dates: readonly string[],
  checkIns: readonly DatedCheckIn[],
): CompletionStats {
  return habits.reduce<CompletionStats>(
    (acc, habit) => {
      const next = habitCompletion(habit, dates, checkIns);
      const expected = acc.expected + next.expected;
      const done = acc.done + next.done;
      return { expected, done, pct: pctOf(done, expected) };
    },
    { expected: 0, done: 0, pct: 0 },
  );
}

/**
 * Due-habit completion for a single calendar day. `pct` is null when nothing
 * was due and nothing was checked in, so a chart can gap rather than plot a
 * fake 0% miss for a weekly habit on a Tuesday.
 */
export function dueCompletionOn(
  habits: readonly SchedulableHabit[],
  isoDate: string,
  checkIns: readonly DatedCheckIn[],
): { expected: number; done: number; pct: number | null } {
  const due = habits.filter((habit) => isHabitDueOn(habit, isoDate));
  const dueDone = due.filter((habit) =>
    checkIns.some((c) => c.habitId === habit.id && c.date === isoDate),
  ).length;
  const extra = habits.filter(
    (habit) =>
      !isHabitDueOn(habit, isoDate) &&
      checkIns.some((c) => c.habitId === habit.id && c.date === isoDate),
  ).length;

  if (due.length === 0) {
    if (extra === 0) return { expected: 0, done: 0, pct: null };
    return { expected: 0, done: extra, pct: 100 };
  }

  return {
    expected: due.length,
    done: dueDone,
    pct: pctOf(dueDone, due.length),
  };
}
