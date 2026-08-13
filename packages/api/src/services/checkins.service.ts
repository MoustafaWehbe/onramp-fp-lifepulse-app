import { Op } from "sequelize";
import { todayInTimeZone, currentStreak, longestStreak } from "@starter-kit/shared";
import { HabitCompletion, Habit } from "../models";
import { createError } from "../middleware/error-handler";
import type { CreateCheckInInput } from "../schemas/checkins.schemas";

interface CheckInListFilters {
  from?: string;
  to?: string;
  habitId?: string;
}

const DEFAULT_RANGE_DAYS = 30;

/** A year of history is plenty for "longest streak" without scanning everything. */
const STREAK_LOOKBACK_DAYS = 365;

function serializeCheckIn(checkIn: HabitCompletion) {
  return {
    id: checkIn.id,
    habitId: checkIn.habitId,
    date: checkIn.completionDate,
    createdAt: checkIn.createdAt,
  };
}

function daysAgoISODate(days: number): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().slice(0, 10);
}

/** A habit's own timezone wins; otherwise fall back to the caller's browser
 * timezone (sent via the `X-Timezone` header), then UTC. This is what makes
 * "today" — and therefore when a check-in's tick disappears — match the
 * user's actual local day instead of the server's UTC day. */
function effectiveTimezone(habitTimezone: string | null | undefined, clientTimezone?: string): string {
  return habitTimezone || clientTimezone || "UTC";
}

export class CheckInsService {
  private async findOwned(userId: string, id: string): Promise<HabitCompletion> {
    const checkIn = await HabitCompletion.findByPk(id);
    if (!checkIn) throw createError("Check-in not found", 404);
    if (checkIn.userId !== userId) throw createError("Forbidden", 403);
    return checkIn;
  }

  private async getOwnedHabit(userId: string, habitId: string): Promise<Habit> {
    const habit = await Habit.findByPk(habitId);
    if (!habit) throw createError("Habit not found", 404);
    if (habit.userId !== userId) throw createError("Forbidden", 403);
    return habit;
  }

  async list(userId: string, filters: CheckInListFilters, clientTimezone?: string) {
    const to = filters.to ?? todayInTimeZone(clientTimezone || "UTC");
    const from = filters.from ?? daysAgoISODate(DEFAULT_RANGE_DAYS - 1);

    const where: Record<string, unknown> = {
      userId,
      completed: true,
      completionDate: { [Op.between]: [from, to] },
    };
    if (filters.habitId) where.habitId = filters.habitId;

    const checkIns = await HabitCompletion.findAll({
      where,
      order: [["completionDate", "DESC"]],
    });
    return checkIns.map(serializeCheckIn);
  }

  /**
   * Completions for "today", where "today" is computed per-habit using that
   * habit's own timezone (falling back to the caller's timezone, then UTC).
   * Most users only have one effective timezone across their habits, but
   * this stays correct even if a habit was explicitly configured otherwise.
   */
  async today(userId: string, clientTimezone?: string) {
    const habits = await Habit.findAll({
      where: { userId, archivedAt: null },
      attributes: ["id", "timezone"],
    });
    if (habits.length === 0) return [];

    const todayByHabitId = new Map<string, string>();
    const candidateDates = new Set<string>();
    for (const habit of habits) {
      const today = todayInTimeZone(effectiveTimezone(habit.timezone, clientTimezone));
      todayByHabitId.set(habit.id, today);
      candidateDates.add(today);
    }

    const checkIns = await HabitCompletion.findAll({
      where: {
        userId,
        completed: true,
        completionDate: { [Op.in]: Array.from(candidateDates) },
      },
    });

    return checkIns
      .filter((c) => todayByHabitId.get(c.habitId) === c.completionDate)
      .map(serializeCheckIn);
  }

  /**
   * Activity summary used by the welcome-back banner: how long the user has
   * been away, plus the streak figures that make the greeting concrete rather
   * than generic. `daysSinceLastCheckIn` is null for users who have never
   * checked in — they're new, not lapsed, and shouldn't be welcomed "back".
   */
  async activity(userId: string, clientTimezone?: string) {
    const today = todayInTimeZone(clientTimezone || "UTC");

    const completions = await HabitCompletion.findAll({
      where: {
        userId,
        completed: true,
        completionDate: { [Op.gte]: daysAgoISODate(STREAK_LOOKBACK_DAYS) },
      },
      attributes: ["completionDate"],
      order: [["completionDate", "DESC"]],
    });

    const dates = completions.map((c) => c.completionDate);
    const lastCheckInDate = dates[0] ?? null;

    return {
      lastCheckInDate,
      daysSinceLastCheckIn: lastCheckInDate
        ? Math.max(
            0,
            Math.round(
              (Date.parse(`${today}T00:00:00Z`) -
                Date.parse(`${lastCheckInDate}T00:00:00Z`)) /
                86_400_000,
            ),
          )
        : null,
      currentStreak: currentStreak(dates, today),
      longestStreak: longestStreak(dates),
    };
  }

  async create(
    userId: string,
    input: CreateCheckInInput,
    clientTimezone?: string,
  ): Promise<{ checkIn: ReturnType<typeof serializeCheckIn>; created: boolean }> {
    const habit = await this.getOwnedHabit(userId, input.habitId);
    const today = todayInTimeZone(effectiveTimezone(habit.timezone, clientTimezone));
    const date = input.date ?? today;

    if (date > today) {
      throw createError("Cannot check in for a future date", 400);
    }

    // Idempotent: ticking an already-ticked day is a no-op. Re-ticking a day
    // that was previously unticked (completed: false — see remove()) flips
    // the existing row back on instead of inserting a duplicate, since
    // (habitId, completionDate) is unique.
    const existing = await HabitCompletion.findOne({
      where: { habitId: input.habitId, completionDate: date },
    });
    if (existing) {
      const wasIncomplete = !existing.completed;
      if (wasIncomplete) {
        await existing.update({ completed: true });
      }
      return { checkIn: serializeCheckIn(existing), created: wasIncomplete };
    }

    const checkIn = await HabitCompletion.create({
      habitId: input.habitId,
      userId,
      completionDate: date,
      completed: true,
    });
    return { checkIn: serializeCheckIn(checkIn), created: true };
  }

  /**
   * Unticking a habit is a soft toggle (completed: false), not a delete.
   * The row — and its original createdAt — stays around for history/audit
   * instead of being destroyed, and the reminder job already treats a
   * completed:false row the same as "not checked in yet" for that day.
   */
  async remove(userId: string, id: string): Promise<void> {
    const checkIn = await this.findOwned(userId, id);
    if (checkIn.completed) {
      await checkIn.update({ completed: false });
    }
  }
}

export const checkInsService = new CheckInsService();
