import { LifeArea, Habit } from "../models";
import { createError } from "../middleware/error-handler";
import type { CreateAreaInput, UpdateAreaInput } from "../schemas/area.schemas";

type AreaWithHabits = LifeArea & { habits?: Habit[] };

interface AreaUpdatePayload {
  name?: string;
  color?: string;
  description?: string | null;
}

function serializeArea(area: LifeArea) {
  return {
    id: area.id,
    name: area.name,
    color: area.color,
    description: area.description ?? null,
    createdAt: area.createdAt,
    updatedAt: area.updatedAt,
  };
}

function serializeHabit(habit: Habit) {
  return {
    id: habit.id,
    name: habit.name,
    frequency: habit.frequency,
    notes: habit.notes ?? null,
    createdAt: habit.createdAt,
  };
}

export class AreaService {
  /**
   * Loads an area by id and asserts the caller owns it.
   * 404 when it does not exist, 403 when it belongs to someone else.
   */
  private async findOwned(userId: string, id: string): Promise<LifeArea> {
    const area = await LifeArea.findByPk(id);
    if (!area) throw createError("Area not found", 404);
    if (area.userId !== userId) throw createError("Forbidden", 403);
    return area;
  }

  async list(userId: string) {
    const areas = await LifeArea.findAll({
      where: { userId },
      order: [
        ["sortOrder", "ASC"],
        ["createdAt", "ASC"],
      ],
    });
    return areas.map(serializeArea);
  }

  async getById(userId: string, id: string) {
    await this.findOwned(userId, id);

    // Re-query with habits so ownership is settled before the join.
    const area = (await LifeArea.findByPk(id, {
      include: [
        {
          model: Habit,
          as: "habits",
          required: false,
          where: { archivedAt: null },
        },
      ],
      order: [[{ model: Habit, as: "habits" }, "createdAt", "ASC"]],
    })) as AreaWithHabits | null;

    if (!area) throw createError("Area not found", 404);

    return {
      ...serializeArea(area),
      habits: (area.habits ?? []).map(serializeHabit),
    };
  }

  async create(userId: string, input: CreateAreaInput) {
    // Append to the end of the user's existing areas.
    const maxOrder = (await LifeArea.max("sortOrder", {
      where: { userId },
    })) as number | null;

    const area = await LifeArea.create({
      userId,
      name: input.name,
      color: input.color,
      description: input.description,
      sortOrder: typeof maxOrder === "number" ? maxOrder + 1 : 0,
    });

    return serializeArea(area);
  }

  async update(userId: string, id: string, input: UpdateAreaInput) {
    const area = await this.findOwned(userId, id);

    const payload: AreaUpdatePayload = {};
    if (input.name !== undefined) payload.name = input.name;
    if (input.color !== undefined) payload.color = input.color;
    // An explicit null clears the description; an absent key leaves it alone.
    if (input.description !== undefined) payload.description = input.description;

    await area.update(payload);
    return serializeArea(area);
  }

  async remove(userId: string, id: string): Promise<void> {
    const area = await this.findOwned(userId, id);
    // habits + check-ins cascade via the FK constraints
    await area.destroy();
  }
}

export const areaService = new AreaService();
