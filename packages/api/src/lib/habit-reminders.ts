import { remindersQueue } from "./queue";
import type { Habit } from "../models";

/**
 * Builds a 6-field BullMQ/cron-parser pattern ("sec min hour dom month dow")
 * that fires once a day at the habit's reminderTime, restricted to the days
 * implied by its frequency where that's unambiguous (daily / weekdays).
 *
 * "3x" / "5x" / "weekly" habits don't pin down *which* days, so we fire the
 * reminder every day at the chosen time and let the worker suppress it when
 * the habit has already been checked in for the day — see
 * packages/workers/src/jobs/reminders.job.ts.
 */
function buildCronPattern(reminderTime: string, frequency: Habit["frequency"]): string {
  const [hourStr, minuteStr] = reminderTime.split(":");
  const hour = Number(hourStr);
  const minute = Number(minuteStr);
  const dayOfWeek = frequency === "weekdays" ? "1-5" : "*";
  return `0 ${minute} ${hour} * * ${dayOfWeek}`;
}

/**
 * Creates, updates, or removes the BullMQ Job Scheduler that drives reminders
 * for this habit, based on its current reminderEnabled/reminderTime/timezone/
 * archivedAt fields. The scheduler id is always the habit's own id, so calling
 * this again with new settings transparently replaces the previous schedule
 * (upsertJobScheduler is idempotent by id).
 *
 * Scheduling is a best-effort side effect of habit CRUD: callers should catch
 * errors here (e.g. Redis unavailable) and log rather than fail the request,
 * since the habit row in Postgres remains the source of truth and a
 * reconciliation job can re-sync schedules later if needed.
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

  const pattern = buildCronPattern(habit.reminderTime!.slice(0, 5), habit.frequency);

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
