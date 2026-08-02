// packages/api/src/services/goals.service.ts
import { Goal } from "../models";

export class GoalsService {
  async listGoals() {
    const goals = await Goal.findAll({ order: [["label", "ASC"]] });
    return goals.map((g) => ({ slug: g.slug, label: g.label }));
  }
}

export const goalsService = new GoalsService();