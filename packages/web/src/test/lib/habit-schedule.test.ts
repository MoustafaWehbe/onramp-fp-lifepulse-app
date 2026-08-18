import { describe, expect, it } from "vitest";
import {
  dueCompletionOn,
  expectedSlots,
  habitCompletion,
  habitsCompletion,
  isHabitDueOn,
  weekdayOf,
  type SchedulableHabit,
} from "../../lib/habit-schedule";

function habit(
  overrides: Partial<SchedulableHabit> & Pick<SchedulableHabit, "id" | "frequency">,
): SchedulableHabit {
  return { daysOfWeek: null, ...overrides };
}

/** Mon 10 Aug 2026 → Sun 16 Aug 2026. */
const WEEK = [
  "2026-08-10",
  "2026-08-11",
  "2026-08-12",
  "2026-08-13",
  "2026-08-14",
  "2026-08-15",
  "2026-08-16",
];

const FORTNIGHT = [
  "2026-08-03",
  "2026-08-04",
  "2026-08-05",
  "2026-08-06",
  "2026-08-07",
  "2026-08-08",
  "2026-08-09",
  ...WEEK,
];

describe("weekdayOf", () => {
  it("matches Date#getDay (0=Sun)", () => {
    expect(weekdayOf("2026-08-10")).toBe(1); // Monday
    expect(weekdayOf("2026-08-16")).toBe(0); // Sunday
  });
});

describe("isHabitDueOn", () => {
  it("marks every day for a daily habit", () => {
    const daily = habit({ id: "d", frequency: "daily" });
    expect(WEEK.every((date) => isHabitDueOn(daily, date))).toBe(true);
  });

  it("marks Mon–Fri for weekdays", () => {
    const weekdays = habit({ id: "w", frequency: "weekdays" });
    expect(WEEK.filter((date) => isHabitDueOn(weekdays, date))).toEqual(
      WEEK.slice(0, 5),
    );
  });

  it("honours explicit daysOfWeek over the frequency quota", () => {
    const mondayOnly = habit({
      id: "m",
      frequency: "weekly",
      daysOfWeek: [1],
    });
    expect(WEEK.filter((date) => isHabitDueOn(mondayOnly, date))).toEqual([
      "2026-08-10",
    ]);
  });

  it("does not pin unpinned 3x / 5x / weekly habits to a calendar day", () => {
    const weekly = habit({ id: "q", frequency: "weekly" });
    expect(WEEK.some((date) => isHabitDueOn(weekly, date))).toBe(false);
  });
});

describe("expectedSlots", () => {
  it("counts every day for daily habits", () => {
    expect(expectedSlots(habit({ id: "d", frequency: "daily" }), FORTNIGHT)).toBe(
      14,
    );
  });

  it("counts Mon–Fri for weekdays habits", () => {
    expect(
      expectedSlots(habit({ id: "w", frequency: "weekdays" }), FORTNIGHT),
    ).toBe(10);
  });

  it("uses a weekly quota for unpinned weekly / 3x / 5x habits", () => {
    expect(expectedSlots(habit({ id: "1", frequency: "weekly" }), FORTNIGHT)).toBe(
      2,
    );
    expect(expectedSlots(habit({ id: "3", frequency: "3x" }), FORTNIGHT)).toBe(6);
    expect(expectedSlots(habit({ id: "5", frequency: "5x" }), WEEK)).toBe(5);
  });

  it("returns 0 for an empty window", () => {
    expect(expectedSlots(habit({ id: "d", frequency: "daily" }), [])).toBe(0);
  });

  it("counts matching weekdays when daysOfWeek is set", () => {
    const mondays = habit({
      id: "m",
      frequency: "weekly",
      daysOfWeek: [1],
    });
    expect(expectedSlots(mondays, FORTNIGHT)).toBe(2);
  });
});

describe("habitCompletion", () => {
  const weekly = habit({ id: "yoga", frequency: "weekly" });

  it("caps extra check-ins at the expected quota", () => {
    const stats = habitCompletion(weekly, FORTNIGHT, [
      { habitId: "yoga", date: "2026-08-03" },
      { habitId: "yoga", date: "2026-08-05" },
      { habitId: "yoga", date: "2026-08-12" },
    ]);
    expect(stats).toEqual({ expected: 2, done: 2, pct: 100 });
  });

  it("ignores check-ins outside the window", () => {
    const stats = habitCompletion(weekly, WEEK, [
      { habitId: "yoga", date: "2026-08-03" },
      { habitId: "yoga", date: "2026-08-12" },
    ]);
    expect(stats).toEqual({ expected: 1, done: 1, pct: 100 });
  });

  it("returns 0% when nothing was done", () => {
    expect(habitCompletion(weekly, FORTNIGHT, [])).toEqual({
      expected: 2,
      done: 0,
      pct: 0,
    });
  });
});

describe("habitsCompletion", () => {
  it("sums per-habit capped totals so one overachiever cannot mask a miss", () => {
    const daily = habit({ id: "water", frequency: "daily" });
    const weekly = habit({ id: "yoga", frequency: "weekly" });
    const stats = habitsCompletion([daily, weekly], WEEK, [
      { habitId: "yoga", date: "2026-08-10" },
      { habitId: "yoga", date: "2026-08-11" },
      { habitId: "yoga", date: "2026-08-12" },
    ]);
    // daily: 0/7, weekly: 1/1 → 1/8
    expect(stats).toEqual({ expected: 8, done: 1, pct: 13 });
  });
});

describe("dueCompletionOn", () => {
  const daily = habit({ id: "water", frequency: "daily" });
  const weekly = habit({ id: "yoga", frequency: "weekly" });

  it("gaps the chart when nothing was due and nothing was done", () => {
    expect(dueCompletionOn([weekly], "2026-08-11", [])).toEqual({
      expected: 0,
      done: 0,
      pct: null,
    });
  });

  it("treats an unpinned check-in as a full day rather than a miss", () => {
    expect(
      dueCompletionOn([weekly], "2026-08-11", [
        { habitId: "yoga", date: "2026-08-11" },
      ]),
    ).toEqual({ expected: 0, done: 1, pct: 100 });
  });

  it("measures pinned habits against that day's due list", () => {
    expect(
      dueCompletionOn([daily, weekly], "2026-08-11", [
        { habitId: "water", date: "2026-08-11" },
      ]),
    ).toEqual({ expected: 1, done: 1, pct: 100 });
  });

  it("does not let an unpinned extra check-in hide a due miss", () => {
    expect(
      dueCompletionOn([daily, weekly], "2026-08-11", [
        { habitId: "yoga", date: "2026-08-11" },
      ]),
    ).toEqual({ expected: 1, done: 0, pct: 0 });
  });
});
