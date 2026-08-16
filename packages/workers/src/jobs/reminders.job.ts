import type { Job } from "bullmq";
import { Op } from "sequelize";
import {
  Habit,
  HabitCompletion,
  LifeArea,
  User,
  currentStreak,
  emailQueue,
  getOrCreatePreferences,
  isWithinQuietHours,
  todayInTimeZone,
} from "@starter-kit/shared";
import type {
  HabitReminderJobData,
  HabitReminderJobResult,
} from "@starter-kit/shared";

/** Enough history for a 60-day streak, which is well past any copy we render. */
const STREAK_LOOKBACK_DAYS = 90;

/**
 * Fired once per day (per the habit's cron pattern) by the Job Scheduler that
 * habits.service.ts upserts on remindersQueue. Always re-reads the habit and
 * its completions instead of trusting the job payload, since reminder
 * settings or check-ins may have changed since the scheduler last fired.
 *
 * Delivery is email only. The in-app popup on /today is driven separately by
 * the client, which already knows each habit's reminder time — it needs no
 * server round trip and shows whenever the app is open.
 */
export async function processReminderJob(
  job: Job<HabitReminderJobData>,
): Promise<HabitReminderJobResult> {
  const { habitId } = job.data;

  const habit = await Habit.findByPk(habitId, {
    include: [
      { model: User, as: "user" },
      { model: LifeArea, as: "lifeArea" },
    ],
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

  const timezone = habit.timezone ?? "UTC";
  const today = todayInTimeZone(timezone);
  const existingCompletion = await HabitCompletion.findOne({
    where: { habitId: habit.id, completionDate: today },
  });

  // Don't nag about a habit the user has already checked in for today.
  if (existingCompletion?.completed) {
    console.info(`[reminders] Skipping habit ${habit.id} — already checked in today`);
    return { notified: false };
  }

  const preferences = await getOrCreatePreferences(user.id);

  if (isWithinQuietHours(preferences, timezone)) {
    console.info(`[reminders] Skipping habit ${habit.id} — inside quiet hours`);
    return { notified: false };
  }

  const streak = await habitStreak(habit.id, today);
  const areaName = (habit as Habit & { lifeArea?: LifeArea }).lifeArea?.name;

  if (!preferences.emailRemindersEnabled) {
    console.info(`[reminders] Skipping habit ${habit.id} — email reminders disabled`);
    return { notified: false };
  }

  await emailQueue.add("habit-reminder", {
    to: user.email,
    subject: `Time for: ${habit.name}`,
    template: "habit-reminder",
    userId: user.id,
    variables: {
      habitName: habit.name,
      reminderTime: habit.reminderTime?.slice(0, 5) ?? "",
      ...(areaName ? { areaName } : {}),
      streak: String(streak),
    },
  });

  return { notified: true };
}

async function habitStreak(habitId: string, today: string): Promise<number> {
  const since = new Date(Date.parse(`${today}T00:00:00Z`));
  since.setUTCDate(since.getUTCDate() - STREAK_LOOKBACK_DAYS);

  const completions = await HabitCompletion.findAll({
    where: {
      habitId,
      completed: true,
      completionDate: { [Op.gte]: since.toISOString().slice(0, 10) },
    },
    attributes: ["completionDate"],
  });

  return currentStreak(
    completions.map((c) => c.completionDate),
    today,
  );
}
