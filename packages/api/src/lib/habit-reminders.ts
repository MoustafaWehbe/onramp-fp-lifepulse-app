import { remindersQueue } from "./queue";
import type { Habit } from "../models";

/**
 * Builds a 6-field BullMQ/cron-parser pattern ("sec min hour dom month dow")
 * that fires once a day at the habit's reminderTime, restricted to the days
 * implied by its frequency where that's unambiguous (daily / weekdays), or
 * to the habit's explicit `daysOfWeek` when set.
 *
 * "3x" / "5x" / "weekly" habits don't pin down *which* days on their own —
 * if the user hasn't picked explicit days for them via `daysOfWeek`, we fall
 * back to firing every day and let the worker suppress it once the habit has
 * already been checked in for the day — see
 * packages/workers/src/jobs/reminders.job.ts.
 */
function buildCronPattern(
  reminderTime: string,
  frequency: Habit["frequency"],
  daysOfWeek?: number[] | null,
): string {
  const [hourStr, minuteStr] = reminderTime.split(":");
  const hour = Number(hourStr);
  const minute = Number(minuteStr);

  let dayOfWeek = "*";
  if (daysOfWeek && daysOfWeek.length > 0) {
    dayOfWeek = daysOfWeek.join(",");
  } else if (frequency === "weekdays") {
    dayOfWeek = "1-5";
  }

  return `0 ${minute} ${hour} * * ${dayOfWeek}`;
}

/**
 * Creates, updates, or removes this habit's BullMQ Job Scheduler to match its
 * current reminder fields. The scheduler id is the habit's own id, so calling
 * this again transparently replaces the previous schedule.
 *
 * Best-effort: callers should catch errors here (e.g. Redis down) and log
 * rather than fail the request — Postgres stays the source of truth.
 */
export async function syncHabitReminder(habit: Habit): Promise<void> {
  const shouldSchedule =
    habit.reminderEnabled &&
    !!habit.reminderTime &&
    !!habit.timezone &&
    !habit.archivedAt;

  if (!shouldSchedule) {
    await cancelHabitReminder(habit.id);
    return;
  }

  const pattern = buildCronPattern(
    habit.reminderTime!.slice(0, 5),
    habit.frequency,
    habit.daysOfWeek,
  );

  await remindersQueue.upsertJobScheduler(
    habit.id,
    { pattern, tz: habit.timezone! },
    {
      name: "habit-reminder",
      data: { habitId: habit.id },
      opts: {
        removeOnComplete: { count: 50 },
        removeOnFail: { count: 100 },
      },
    },
  );
}

/** Removes the reminder scheduler for a habit, if one exists. Safe to call unconditionally. */
export async function cancelHabitReminder(habitId: string): Promise<void> {
  await remindersQueue.removeJobScheduler(habitId);
}
