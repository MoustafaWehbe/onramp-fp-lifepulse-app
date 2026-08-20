import { Op } from "sequelize";
import { currentStreak, daysAgoInTimeZone, todayInTimeZone } from "@starter-kit/shared";
import {
  CoachClientRequest,
  CoachFeedback,
  User,
  Habit,
  HabitCompletion,
  LifeArea,
} from "../models";
import { profileService } from "./profile.service";
import { habitsService } from "./habits.service";
import type { CoachUpdateHabitInput } from "../schemas/coach-requests.schemas";

import { createError } from "../middleware/error-handler";

interface SharingInput {
  shareHabits: boolean;
  shareProfile: boolean;
  editHabits: boolean;
}

interface CreateInput extends SharingInput {
  coachId: string;
}

/** How far back the coach's dashboard looks when scoring recent consistency. */
const WINDOW_DAYS = 30;

/** Streaks predate the window, so they're read over a longer history. */
const STREAK_LOOKBACK_DAYS = 365;

/** Inclusive list of ISO dates ending today — the x-axis of the coach's view. */
function windowDates(today: string, days: number): string[] {
  const end = new Date(`${today}T00:00:00Z`);
  const dates: string[] = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    const day = new Date(end);
    day.setUTCDate(day.getUTCDate() - i);
    dates.push(day.toISOString().slice(0, 10));
  }
  return dates;
}

const FREQUENCY_LABEL: Record<string, string> = {
  daily: "daily",
  weekdays: "weekdays",
  "5x": "5×/week",
  "3x": "3×/week",
  weekly: "weekly",
};

const WEEKDAY_LABEL = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

type HabitSnapshot = {
  name: string;
  frequency: string;
  daysOfWeek: number[] | null | undefined;
  durationMinutes: number | null | undefined;
  difficulty: string | null | undefined;
  notes: string | null | undefined;
};

function snapshot(habit: Habit): HabitSnapshot {
  return {
    name: habit.name,
    frequency: habit.frequency,
    daysOfWeek: habit.daysOfWeek,
    durationMinutes: habit.durationMinutes,
    difficulty: habit.difficulty,
    notes: habit.notes,
  };
}

function describeDays(days: number[] | null | undefined): string {
  if (!days || days.length === 0) return "no fixed days";
  return [...days].sort().map((d) => WEEKDAY_LABEL[d]).join(", ");
}

/**
 * A plain-language record of what the coach changed, written into the client's
 * thread. The client is told what happened to their plan in the same place
 * they read everything else from their coach — never silently.
 */
function describeHabitChanges(before: HabitSnapshot, after: HabitSnapshot): string | null {
  const changes: string[] = [];

  if (before.name !== after.name) {
    changes.push(`renamed to "${after.name}"`);
  }
  if (before.frequency !== after.frequency) {
    changes.push(
      `frequency ${FREQUENCY_LABEL[before.frequency] ?? before.frequency} → ${
        FREQUENCY_LABEL[after.frequency] ?? after.frequency
      }`,
    );
  }
  if (JSON.stringify(before.daysOfWeek ?? null) !== JSON.stringify(after.daysOfWeek ?? null)) {
    changes.push(`days ${describeDays(before.daysOfWeek)} → ${describeDays(after.daysOfWeek)}`);
  }
  if ((before.durationMinutes ?? null) !== (after.durationMinutes ?? null)) {
    const from = before.durationMinutes ? `${before.durationMinutes} min` : "no duration";
    const to = after.durationMinutes ? `${after.durationMinutes} min` : "no duration";
    changes.push(`duration ${from} → ${to}`);
  }
  if ((before.difficulty ?? null) !== (after.difficulty ?? null)) {
    changes.push(`difficulty ${before.difficulty ?? "unset"} → ${after.difficulty ?? "unset"}`);
  }
  if ((before.notes ?? null) !== (after.notes ?? null)) {
    changes.push(after.notes ? "notes updated" : "notes cleared");
  }

  if (changes.length === 0) return null;
  return `Updated "${before.name}": ${changes.join("; ")}.`;
}

export class CoachRequestsService {
  async createRequest(requesterId: string, input: CreateInput) {
    const coach = await User.findByPk(input.coachId);
    if (!coach || coach.role !== "coach") {
      throw createError("Coach not found", 404);
    }
    if (input.coachId === requesterId) {
      throw createError("Cannot request coaching from yourself", 422);
    }

    const grant = {
      shareHabits: input.shareHabits,
      shareProfile: input.shareProfile,
      editHabits: input.editHabits && input.shareHabits,
    };

    const existing = await CoachClientRequest.findOne({
      where: { requesterId, coachId: input.coachId },
    });

    if (existing) {
      // Re-sending to a coach who already accepted is the user adjusting what
      // they share, not starting over: resetting to "pending" here would
      // silently drop a live coaching relationship back into a queue.
      await existing.update({
        status: existing.status === "accepted" ? "accepted" : "pending",
        ...grant,
      });
      return existing;
    }

    return CoachClientRequest.create({
      requesterId,
      coachId: input.coachId,
      ...grant,
    });
  }

  /**
   * The user owns the permission grant, so they can narrow or widen it at any
   * time without involving the coach. Access is read at request time
   * (see getClientData / updateClientHabit), so a change takes effect
   * immediately.
   */
  async updateSharing(
    requestId: string,
    requesterId: string,
    input: SharingInput,
  ) {
    const request = await CoachClientRequest.findByPk(requestId);
    if (!request) throw createError("Request not found", 404);
    if (request.requesterId !== requesterId) {
      throw createError("Insufficient permissions", 403);
    }

    await request.update({
      shareHabits: input.shareHabits,
      shareProfile: input.shareProfile,
      // Withdrawing visibility withdraws editing with it, so the two can't
      // drift apart even if a client only toggles one of them.
      editHabits: input.editHabits && input.shareHabits,
    });

    return request;
  }

  /**
   * Ends the relationship outright: the coach loses access and the shared
   * notes go with it (coach_feedback cascades). Users need a way out that
   * doesn't depend on the coach agreeing to it.
   */
  async revoke(requestId: string, requesterId: string) {
    const request = await CoachClientRequest.findByPk(requestId);
    if (!request) throw createError("Request not found", 404);
    if (request.requesterId !== requesterId) {
      throw createError("Insufficient permissions", 403);
    }

    await request.destroy();
  }

  async listSent(requesterId: string) {
    return CoachClientRequest.findAll({
      where: { requesterId },
      include: [{ model: User, as: "coach", attributes: ["id", "name"] }],
      order: [["createdAt", "DESC"]],
    });
  }

  async listReceived(coachId: string) {
    return CoachClientRequest.findAll({
      where: { coachId },
      include: [
        { model: User, as: "requester", attributes: ["id", "name", "email"] },
      ],
      order: [["createdAt", "DESC"]],
    });
  }

  async updateStatus(
    requestId: string,
    coachId: string,
    status: "accepted" | "declined",
  ) {
    const request = await CoachClientRequest.findByPk(requestId);
    if (!request) throw createError("Request not found", 404);

    if (request.coachId !== coachId) {
      throw createError("Insufficient permissions", 403);
    }
    if (request.status !== "pending") {
      throw createError("Request has already been responded to", 422);
    }
    await request.update({ status });
    return request;
  }

  /** Loads an accepted request the given coach owns, or throws. */
  private async findActiveRequestOrThrow(requestId: string, coachId: string) {
    const request = await CoachClientRequest.findByPk(requestId);
    if (!request) throw createError("Request not found", 404);
    if (request.coachId !== coachId) {
      throw createError("Insufficient permissions", 403);
    }
    if (request.status !== "accepted") {
      throw createError("Request has not been accepted", 403);
    }
    return request;
  }

  /**
   * Everything the coach is allowed to see, shaped the way their dashboard
   * reads it: habits grouped under the client's own life areas, each with the
   * raw completion dates behind it so the client and coach views compute
   * consistency with the same code rather than two divergent formulas.
   */
  async getClientData(requestId: string, coachId: string, timezone?: string) {
    const request = await this.findActiveRequestOrThrow(requestId, coachId);

    const result: {
      canEditHabits: boolean;
      windowDates?: string[];
      areas?: unknown;
      profile?: unknown;
    } = { canEditHabits: request.editHabits && request.shareHabits };

    if (request.shareHabits) {
      const today = todayInTimeZone(timezone || "UTC");
      const dates = windowDates(today, WINDOW_DAYS);

      const [areas, habits, completions] = await Promise.all([
        LifeArea.findAll({
          where: { userId: request.requesterId },
          order: [
            ["sortOrder", "ASC"],
            ["createdAt", "ASC"],
          ],
        }),
        Habit.findAll({
          where: { userId: request.requesterId, archivedAt: null },
          order: [["createdAt", "ASC"]],
        }),
        HabitCompletion.findAll({
          where: {
            userId: request.requesterId,
            completed: true,
            completionDate: {
              [Op.gte]: daysAgoInTimeZone(STREAK_LOOKBACK_DAYS, timezone || "UTC"),
            },
          },
          attributes: ["habitId", "completionDate"],
        }),
      ]);

      const datesByHabit = new Map<string, string[]>();
      for (const completion of completions) {
        const list = datesByHabit.get(completion.habitId) ?? [];
        list.push(completion.completionDate);
        datesByHabit.set(completion.habitId, list);
      }

      const from = dates[0]!;
      const serializeHabit = (habit: Habit) => {
        const all = datesByHabit.get(habit.id) ?? [];
        const inWindow = all.filter((d) => d >= from && d <= today);
        const sorted = [...all].sort();

        return {
          id: habit.id,
          areaId: habit.areaId,
          name: habit.name,
          frequency: habit.frequency,
          daysOfWeek: habit.daysOfWeek ?? null,
          durationMinutes: habit.durationMinutes ?? null,
          difficulty: habit.difficulty ?? null,
          notes: habit.notes ?? null,
          // Dates rather than a percentage: the coach UI feeds these into the
          // same completion helper the client's own Progress page uses.
          completionDates: inWindow,
          currentStreak: currentStreak(all, today),
          lastCompletedOn: sorted[sorted.length - 1] ?? null,
        };
      };

      const habitsByArea = new Map<string, ReturnType<typeof serializeHabit>[]>();
      for (const habit of habits) {
        const list = habitsByArea.get(habit.areaId) ?? [];
        list.push(serializeHabit(habit));
        habitsByArea.set(habit.areaId, list);
      }

      result.windowDates = dates;
      result.areas = areas.map((area) => ({
        id: area.id,
        name: area.name,
        color: area.color,
        description: area.description ?? null,
        habits: habitsByArea.get(area.id) ?? [],
      }));
    }

    if (request.shareProfile) {
      result.profile = await profileService.getProfile(request.requesterId);
    }

    return result;
  }

  /**
   * A coach adjusting a client's plan. Reuses habitsService.update under the
   * client's own id, so ownership, reminder rescheduling and cross-field
   * validation behave exactly as they do when the client edits it themselves —
   * the only difference is who asked.
   */
  async updateClientHabit(
    requestId: string,
    coachId: string,
    habitId: string,
    input: CoachUpdateHabitInput,
  ) {
    const request = await this.findActiveRequestOrThrow(requestId, coachId);

    if (!request.shareHabits || !request.editHabits) {
      throw createError(
        "This client has not given you permission to edit their habits",
        403,
      );
    }

    const habit = await Habit.findByPk(habitId);
    if (!habit || habit.userId !== request.requesterId) {
      throw createError("Habit not found", 404);
    }

    const before = snapshot(habit);
    const updated = await habitsService.update(request.requesterId, habitId, input);
    const summary = describeHabitChanges(before, {
      name: updated.name,
      frequency: updated.frequency,
      daysOfWeek: updated.daysOfWeek,
      durationMinutes: updated.durationMinutes,
      difficulty: updated.difficulty,
      notes: updated.notes,
    });

    // A no-op edit leaves no trace: a thread full of "changed nothing" would
    // bury the entries that matter.
    if (summary) {
      await CoachFeedback.create({
        coachRequestId: request.id,
        coachId,
        kind: "habit_change",
        body: summary,
      });
    }

    return updated;
  }
}

export const coachRequestsService = new CoachRequestsService();
