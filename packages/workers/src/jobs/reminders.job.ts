import type { Job } from "bullmq";
import { Habit, HabitCompletion, User, emailQueue } from "@starter-kit/shared";
import type { HabitReminderJobData, HabitReminderJobResult } from "@starter-kit/shared";

/** Returns "YYYY-MM-DD" for "now" as seen from the given IANA timezone. */
function todayInTimeZone(timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/**
 * Fired once per day (per the habit's cron pattern) by the Job Scheduler that
 * habits.service.ts upserts on remindersQueue. Always re-reads the habit and
 * its completions instead of trusting the job payload, since reminder
 * settings or check-ins may have changed since the scheduler last fired.
 */
export async function processReminderJob(
  job: Job<HabitReminderJobData>,
): Promise<HabitReminderJobResult> {
  const { habitId } = job.data;

  const habit = await Habit.findByPk(habitId, {
    include: [{ model: User, as: "user" }],
  });

  // Habit may have been deleted, archived, or had reminders disabled after
  // the scheduler fired but before this job was picked up — bail out quietly.
  if (!habit || habit.archivedAt || !habit.reminderEnabled) {
    return { notified: false };
  }

  const user = (habit as Habit & { user?: User }).user;
  if (!user) {
    return { notified: false };
  }

  const today = todayInTimeZone(habit.timezone ?? "UTC");
  const existingCompletion = await HabitCompletion.findOne({
    where: { habitId: habit.id, completionDate: today },
  });

  // Don't nag about a habit the user has already checked in for today.
  if (existingCompletion?.completed) {
    console.info(`[reminders] Skipping habit ${habit.id} — already checked in today`);
    return { notified: false };
  }

  await emailQueue.add("habit-reminder", {
    to: user.email,
    subject: `Time for: ${habit.name}`,
    template: "habit-reminder",
    variables: {
      habitName: habit.name,
      reminderTime: habit.reminderTime?.slice(0, 5) ?? "",
    },
  });

  return { notified: true };
}
