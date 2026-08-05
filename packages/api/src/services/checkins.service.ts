import { Op } from "sequelize";
import { HabitCompletion, Habit } from "../models";
import { createError } from "../middleware/error-handler";
import type { CreateCheckInInput } from "../schemas/checkins.schemas";

interface CheckInListFilters {
  from?: string;
  to?: string;
  habitId?: string;
}

const DEFAULT_RANGE_DAYS = 30;

function serializeCheckIn(checkIn: HabitCompletion) {
  return {
    id: checkIn.id,
    habitId: checkIn.habitId,
    date: checkIn.completionDate,
    createdAt: checkIn.createdAt,
  };
}

function todayISODate(): string {
  return new Date().toISOString().slice(0, 10);
}

function daysAgoISODate(days: number): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().slice(0, 10);
}

export class CheckInsService {
  private async findOwned(userId: string, id: string): Promise<HabitCompletion> {
    const checkIn = await HabitCompletion.findByPk(id);
    if (!checkIn) throw createError("Check-in not found", 404);
    if (checkIn.userId !== userId) throw createError("Forbidden", 403);
    return checkIn;
  }

  private async assertHabitOwnership(userId: string, habitId: string): Promise<void> {
    const habit = await Habit.findByPk(habitId);
    if (!habit) throw createError("Habit not found", 404);
    if (habit.userId !== userId) throw createError("Forbidden", 403);
  }

  async list(userId: string, filters: CheckInListFilters) {
    const from = filters.from ?? daysAgoISODate(DEFAULT_RANGE_DAYS - 1);
    const to = filters.to ?? todayISODate();

    const where: Record<string, unknown> = {
      userId,
      completionDate: { [Op.between]: [from, to] },
    };
    if (filters.habitId) where.habitId = filters.habitId;

    const checkIns = await HabitCompletion.findAll({
      where,
      order: [["completionDate", "DESC"]],
    });
    return checkIns.map(serializeCheckIn);
  }

  async today(userId: string) {
    const checkIns = await HabitCompletion.findAll({
      where: { userId, completionDate: todayISODate() },
    });
    return checkIns.map(serializeCheckIn);
  }

  async create(
    userId: string,
    input: CreateCheckInInput,
  ): Promise<{ checkIn: ReturnType<typeof serializeCheckIn>; created: boolean }> {
    if (input.date > todayISODate()) {
      throw createError("Cannot check in for a future date", 400);
    }

    await this.assertHabitOwnership(userId, input.habitId);

    // Idempotent: a second check-in for the same habit + date just returns the existing row.
    const existing = await HabitCompletion.findOne({
      where: { habitId: input.habitId, completionDate: input.date },
    });
    if (existing) {
      return { checkIn: serializeCheckIn(existing), created: false };
    }

    const checkIn = await HabitCompletion.create({
      habitId: input.habitId,
      userId,
      completionDate: input.date,
      completed: true,
    });
    return { checkIn: serializeCheckIn(checkIn), created: true };
  }

  async remove(userId: string, id: string): Promise<void> {
    const checkIn = await this.findOwned(userId, id);
    await checkIn.destroy();
  }
}

export const checkInsService = new CheckInsService();
