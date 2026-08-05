import { Habit, LifeArea } from "../models";
import { createError } from "../middleware/error-handler";
import { syncHabitReminder, cancelHabitReminder } from "../lib/habit-reminders";
import type { CreateHabitInput, UpdateHabitInput } from "../schemas/habits.schemas";

interface HabitListFilters {
  areaId?: string;
  includeArchived?: boolean;
}

const UPDATABLE_FIELDS = [
  "areaId",
  "name",
  "frequency",
  "durationMinutes",
  "difficulty",
  "notes",
  "reminderEnabled",
  "reminderTime",
  "timezone",
] as const;

function serializeHabit(habit: Habit) {
  return {
    id: habit.id,
    areaId: habit.areaId,
    name: habit.name,
    frequency: habit.frequency,
    durationMinutes: habit.durationMinutes ?? null,
    difficulty: habit.difficulty ?? null,
    notes: habit.notes ?? null,
    reminderEnabled: habit.reminderEnabled,
    // Strip Postgres's seconds precision so responses always echo back "HH:mm".
    reminderTime: habit.reminderTime ? habit.reminderTime.slice(0, 5) : null,
    timezone: habit.timezone ?? null,
    archivedAt: habit.archivedAt ?? null,
    createdAt: habit.createdAt,
    updatedAt: habit.updatedAt,
  };
}

export class HabitsService {
  /** Loads a habit by id and asserts the caller owns it: 404 if missing, 403 if someone else's. */
  private async findOwned(userId: string, id: string): Promise<Habit> {
    const habit = await Habit.findByPk(id);
    if (!habit) throw createError("Habit not found", 404);
    if (habit.userId !== userId) throw createError("Forbidden", 403);
    return habit;
  }

  private async assertAreaOwnership(userId: string, areaId: string): Promise<void> {
    const area = await LifeArea.findByPk(areaId);
    if (!area) throw createError("Area not found", 404);
    if (area.userId !== userId) throw createError("Forbidden", 403);
  }

  /** Schedules/reschedules/cancels the reminder job. Best-effort: logs rather than throws. */
  private async syncReminder(habit: Habit): Promise<void> {
    try {
      await syncHabitReminder(habit);
    } catch (err) {
      console.error(`[habits] failed to sync reminder schedule for habit ${habit.id}`, err);
    }
  }

  private async cancelReminder(habitId: string): Promise<void> {
    try {
      await cancelHabitReminder(habitId);
    } catch (err) {
      console.error(`[habits] failed to cancel reminder schedule for habit ${habitId}`, err);
    }
  }

  async list(userId: string, filters: HabitListFilters) {
    const where: Record<string, unknown> = { userId };
    if (filters.areaId) where.areaId = filters.areaId;
    if (!filters.includeArchived) where.archivedAt = null;

    const habits = await Habit.findAll({ where, order: [["createdAt", "ASC"]] });
    return habits.map(serializeHabit);
  }

  async getById(userId: string, id: string) {
    const habit = await this.findOwned(userId, id);
    return serializeHabit(habit);
  }

  async create(userId: string, input: CreateHabitInput) {
    await this.assertAreaOwnership(userId, input.areaId);

    const habit = await Habit.create({
      userId,
      areaId: input.areaId,
      name: input.name,
      frequency: input.frequency,
      durationMinutes: input.durationMinutes,
      difficulty: input.difficulty,
      notes: input.notes,
      reminderEnabled: input.reminderEnabled ?? false,
      reminderTime: input.reminderTime,
      timezone: input.timezone,
    });

    await this.syncReminder(habit);
    return serializeHabit(habit);
  }

  async update(userId: string, id: string, input: UpdateHabitInput) {
    const habit = await this.findOwned(userId, id);

    if (input.areaId !== undefined) {
      await this.assertAreaOwnership(userId, input.areaId);
    }

    // Cross-field reminder validation needs the *merged* result, since a PATCH
    // may only touch one of the three reminder fields at a time.
    const mergedReminderEnabled = input.reminderEnabled ?? habit.reminderEnabled;
    const mergedReminderTime =
      input.reminderTime !== undefined ? input.reminderTime : habit.reminderTime;
    const mergedTimezone = input.timezone !== undefined ? input.timezone : habit.timezone;

    if (mergedReminderEnabled && (!mergedReminderTime || !mergedTimezone)) {
      throw createError(
        "reminderTime and timezone are required when reminderEnabled is true",
        422,
      );
    }

    const payload: Record<string, unknown> = {};
    for (const field of UPDATABLE_FIELDS) {
      if (input[field] !== undefined) payload[field] = input[field];
    }

    await habit.update(payload);
    await this.syncReminder(habit);
    return serializeHabit(habit);
  }

  async remove(userId: string, id: string): Promise<void> {
    const habit = await this.findOwned(userId, id);
    await this.cancelReminder(habit.id);
    await habit.destroy();
  }

  async archive(userId: string, id: string) {
    const habit = await this.findOwned(userId, id);
    await habit.update({ archivedAt: new Date() });
    await this.cancelReminder(habit.id);
    return serializeHabit(habit);
  }

  async restore(userId: string, id: string) {
    const habit = await this.findOwned(userId, id);
    await habit.update({ archivedAt: null });
    await this.syncReminder(habit);
    return serializeHabit(habit);
  }
}

export const habitsService = new HabitsService();
