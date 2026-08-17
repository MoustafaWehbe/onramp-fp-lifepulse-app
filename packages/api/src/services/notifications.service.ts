import { fn, col } from "sequelize";
import {
  getOrCreatePreferences,
  longestStreak,
  todayInTimeZone,
} from "@starter-kit/shared";
import {
  Habit,
  HabitCompletion,
  LifeArea,
  NotificationPreference,
  User,
} from "../models";
import { emailQueue } from "../lib/queue";
import { createError } from "../middleware/error-handler";
import type { UpdatePreferencesInput } from "../schemas/notifications.schemas";

function serializePreferences(preference: NotificationPreference) {
  return {
    emailRemindersEnabled: preference.emailRemindersEnabled,
    reengagementEnabled: preference.reengagementEnabled,
    quietHoursStart: preference.quietHoursStart ?? null,
    quietHoursEnd: preference.quietHoursEnd ?? null,
    timezone: preference.timezone ?? null,
  };
}

export class NotificationsService {
  async getPreferences(userId: string) {
    const preference = await getOrCreatePreferences(userId);
    return serializePreferences(preference);
  }

  async updatePreferences(userId: string, input: UpdatePreferencesInput) {
    const preference = await getOrCreatePreferences(userId);
    await preference.update(input);
    return serializePreferences(preference);
  }

  /**
   * Queues the encouragement email to the caller, with their own habit data,
   * ignoring both the 30-day lapse requirement and the once-per-lapse cap.
   *
   * Purely a demo affordance — the route is disabled in production. It writes
   * no notification log, so it can be run repeatedly and never interferes with
   * the real sweep's idea of what has already been sent.
   */
  async sendDemoEncouragement(userId: string): Promise<{ to: string }> {
    const user = await User.findByPk(userId);
    if (!user) throw createError("User not found", 404);

    const today = todayInTimeZone("UTC");

    const [completions, mostCompleted] = await Promise.all([
      HabitCompletion.findAll({
        where: { userId, completed: true },
        attributes: ["completionDate"],
      }),
      HabitCompletion.findAll({
        where: { userId, completed: true },
        attributes: ["habitId", [fn("COUNT", col("habit_id")), "total"]],
        group: ["habitId"],
        order: [[fn("COUNT", col("habit_id")), "DESC"]],
        limit: 1,
        raw: true,
      }) as unknown as Promise<{ habitId: string }[]>,
    ]);

    const dates = completions.map((c) => c.completionDate);
    const lastCheckIn = dates.length > 0 ? dates.slice().sort().at(-1)! : null;
    const daysInactive = lastCheckIn
      ? Math.max(
          0,
          Math.round(
            (Date.parse(`${today}T00:00:00Z`) - Date.parse(`${lastCheckIn}T00:00:00Z`)) /
              86_400_000,
          ),
        )
      : 30;

    let topHabit: string | undefined;
    let areaName: string | undefined;
    const topHabitId = mostCompleted[0]?.habitId;
    if (topHabitId) {
      const habit = await Habit.findByPk(topHabitId, {
        include: [{ model: LifeArea, as: "lifeArea", attributes: ["name"] }],
        attributes: ["name", "archivedAt"],
      });
      if (habit && !habit.archivedAt) {
        topHabit = habit.name;
        areaName = (habit as Habit & { lifeArea?: LifeArea }).lifeArea?.name;
      }
    }

    await emailQueue.add("re-engagement", {
      to: user.email,
      // Overridden by the template; kept for the fallback renderer and logs.
      subject: "Your habits are still here",
      template: "re-engagement",
      userId: user.id,
      variables: {
        name: user.name,
        daysInactive: String(daysInactive),
        longestStreak: String(longestStreak(dates)),
        ...(topHabit ? { topHabit } : {}),
        ...(areaName ? { areaName } : {}),
      },
    });

    return { to: user.email };
  }

  /**
   * Token-based opt-out for email footers — deliberately unauthenticated, since
   * the user is clicking from their inbox. The token only disables re-engagement
   * and email reminders; it can't read or change anything else.
   */
  async unsubscribeByToken(token: string): Promise<void> {
    const preference = await NotificationPreference.findOne({
      where: { unsubscribeToken: token },
    });
    if (!preference) {
      throw createError("This unsubscribe link is no longer valid", 404);
    }
    await preference.update({
      reengagementEnabled: false,
      emailRemindersEnabled: false,
    });
  }
}

export const notificationsService = new NotificationsService();
