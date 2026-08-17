import type { HabitFrequency, HabitDifficulty } from "@starter-kit/shared";
import { AiSuggestion, LifeArea, Habit } from "../models";
import { createError, type AppError } from "../middleware/error-handler";
import { chatCompletionStructured } from "../lib/ai";
import {
  buildSuggestionMessages,
  suggestionResponseSchema,
  SUGGESTIONS_PER_AREA,
  type SuggestionAreaContext,
  type SuggestionProfileContext,
} from "../lib/ai-suggestions-prompt";
import { profileService } from "./profile.service";

const DEFAULT_COOLDOWN_MINUTES = 60;
const MAX_AREAS_PER_BATCH = 5;
const DISMISSED_CONTEXT_LIMIT = 20;

function getCooldownMs(): number {
  const configured = Number(process.env.AI_SUGGESTIONS_COOLDOWN_MINUTES);
  const minutes = Number.isFinite(configured) && configured > 0 ? configured : DEFAULT_COOLDOWN_MINUTES;
  return minutes * 60_000;
}

function getModel(): string {
  return process.env.OPENAI_SUGGESTIONS_MODEL || "gpt-4o-mini";
}

function serializeSuggestion(suggestion: AiSuggestion) {
  return {
    id: suggestion.id,
    areaId: suggestion.areaId,
    suggestedName: suggestion.suggestedName,
    rationale: suggestion.rationale ?? null,
    frequency: suggestion.frequency,
    durationMinutes: suggestion.durationMinutes ?? null,
    difficulty: suggestion.difficulty ?? null,
    status: suggestion.status,
    createdAt: suggestion.createdAt,
  };
}

export class AiSuggestionsService {
  private async findOwnedSuggestion(userId: string, id: string): Promise<AiSuggestion> {
    const suggestion = await AiSuggestion.findByPk(id);
    if (!suggestion) throw createError("Suggestion not found", 404);
    if (suggestion.userId !== userId) throw createError("Forbidden", 403);
    return suggestion;
  }

  /** Throws a 429 with `retryAfterSeconds` if the user generated a batch too recently.
   * Computed from the existing `createdAt` column rather than a new field, so it works
   * across server restarts / multiple API instances without any schema change. */
  private async assertCooldownElapsed(userId: string): Promise<void> {
    const lastCreatedAt = (await AiSuggestion.max("createdAt", {
      where: { userId },
    })) as Date | null;
    if (!lastCreatedAt) return;

    const cooldownMs = getCooldownMs();
    const elapsedMs = Date.now() - new Date(lastCreatedAt).getTime();
    if (elapsedMs < cooldownMs) {
      const retryAfterSeconds = Math.ceil((cooldownMs - elapsedMs) / 1000);
      const retryAfterMinutes = Math.ceil(retryAfterSeconds / 60);
      const error: AppError = createError(
        `Please wait before generating more suggestions (try again in ${retryAfterMinutes}m).`,
        429,
      );
      error.retryAfterSeconds = retryAfterSeconds;
      throw error;
    }
  }

  /** Picks which areas to generate for. Caps at MAX_AREAS_PER_BATCH, prioritizing
   * areas with the fewest existing habits (they benefit the most), to keep a single
   * generation's cost/latency bounded regardless of how many areas a user has. */
  private async selectTargetAreas(userId: string): Promise<LifeArea[]> {
    const areas = await LifeArea.findAll({ where: { userId }, order: [["createdAt", "ASC"]] });
    if (areas.length === 0) {
      throw createError("Create a life area before generating suggestions", 422);
    }
    if (areas.length <= MAX_AREAS_PER_BATCH) return areas;

    const areaIds = areas.map((a) => a.id);
    const habits = await Habit.findAll({
      where: { areaId: areaIds, archivedAt: null },
      attributes: ["areaId"],
    });
    const habitCountByArea = new Map<string, number>();
    for (const habit of habits) {
      habitCountByArea.set(habit.areaId, (habitCountByArea.get(habit.areaId) ?? 0) + 1);
    }

    return [...areas]
      .sort((a, b) => (habitCountByArea.get(a.id) ?? 0) - (habitCountByArea.get(b.id) ?? 0))
      .slice(0, MAX_AREAS_PER_BATCH);
  }

  private async buildAreaContexts(
    userId: string,
    areas: LifeArea[],
  ): Promise<SuggestionAreaContext[]> {
    const areaIds = areas.map((a) => a.id);

    const [existingHabits, dismissedSuggestions] = await Promise.all([
      Habit.findAll({
        where: { areaId: areaIds, archivedAt: null },
        attributes: ["areaId", "name"],
      }),
      AiSuggestion.findAll({
        where: { userId, areaId: areaIds, status: "dismissed" },
        order: [["createdAt", "DESC"]],
        attributes: ["areaId", "suggestedName"],
      }),
    ]);

    const habitNamesByArea = new Map<string, string[]>();
    for (const habit of existingHabits) {
      const names = habitNamesByArea.get(habit.areaId) ?? [];
      names.push(habit.name);
      habitNamesByArea.set(habit.areaId, names);
    }

    const dismissedByArea = new Map<string, string[]>();
    for (const suggestion of dismissedSuggestions) {
      const names = dismissedByArea.get(suggestion.areaId) ?? [];
      if (names.length < DISMISSED_CONTEXT_LIMIT) names.push(suggestion.suggestedName);
      dismissedByArea.set(suggestion.areaId, names);
    }

    return areas.map((area) => ({
      id: area.id,
      name: area.name,
      color: area.color,
      description: area.description,
      existingHabitNames: habitNamesByArea.get(area.id) ?? [],
      recentlyDismissedNames: dismissedByArea.get(area.id) ?? [],
    }));
  }

  private async buildProfileContext(userId: string): Promise<SuggestionProfileContext> {
    const profile = await profileService.getProfile(userId);
    return {
      ageRange: profile.ageRange ?? null,
      energyPattern: profile.energyPattern ?? null,
      stressBaseline: profile.stressBaseline ?? null,
      stressLevel: profile.stressLevel ?? null,
      sleepHours: profile.sleepHours ?? null,
      workloadIntensity: profile.workloadIntensity ?? null,
      motivationDriver: profile.motivationDriver ?? null,
      dailyFreeTime: profile.dailyFreeTime ?? null,
      topValues: profile.topValues ?? null,
      badHabits: profile.badHabits ?? null,
      goals: profile.goals ?? [],
    };
  }

  async generate(userId: string) {
    await this.assertCooldownElapsed(userId);
    const areas = await this.selectTargetAreas(userId);

    const [profileContext, areaContexts] = await Promise.all([
      this.buildProfileContext(userId),
      this.buildAreaContexts(userId, areas),
    ]);

    const messages = buildSuggestionMessages(profileContext, areaContexts);
    const model = getModel();

    let parsed;
    try {
      parsed = await chatCompletionStructured(messages, suggestionResponseSchema, "habit_suggestions", {
        model,
        temperature: 0.8,
      });
    } catch (err) {
      if (err instanceof Error && err.message === "OPENAI_API_KEY is not configured") {
        throw createError("AI suggestions aren't configured yet", 503);
      }
      console.error("[ai-suggestions] generation failed", err);
      throw createError("Couldn't generate suggestions right now, please try again", 502);
    }

    const validAreaIds = new Set(areaContexts.map((a) => a.id));
    const countByArea = new Map<string, number>();
    const rows: Array<{
      userId: string;
      areaId: string;
      suggestedName: string;
      rationale: string;
      frequency: HabitFrequency;
      durationMinutes?: number;
      difficulty?: HabitDifficulty;
      status: "pending";
      model: string;
    }> = [];

    for (const suggestion of parsed.suggestions) {
      // Defense against the model hallucinating an id that isn't one we asked about.
      if (!validAreaIds.has(suggestion.areaId)) continue;
      const count = countByArea.get(suggestion.areaId) ?? 0;
      if (count >= SUGGESTIONS_PER_AREA) continue;
      countByArea.set(suggestion.areaId, count + 1);

      rows.push({
        userId,
        areaId: suggestion.areaId,
        suggestedName: suggestion.suggestedName,
        rationale: suggestion.rationale,
        frequency: suggestion.frequency,
        durationMinutes: suggestion.durationMinutes ?? undefined,
        difficulty: suggestion.difficulty ?? undefined,
        status: "pending",
        model,
      });
    }

    if (rows.length === 0) {
      throw createError("AI didn't return any usable suggestions, please try again", 502);
    }

    // Regenerating supersedes the previous batch instead of piling up — old
    // pending rows become dismissed so they still feed the "don't repeat" context.
    await AiSuggestion.update({ status: "dismissed" }, { where: { userId, status: "pending" } });
    const created = await AiSuggestion.bulkCreate(rows);

    return created.map(serializeSuggestion);
  }

  async list(userId: string) {
    const suggestions = await AiSuggestion.findAll({
      where: { userId, status: "pending" },
      order: [["createdAt", "ASC"]],
    });
    return suggestions.map(serializeSuggestion);
  }

  async accept(userId: string, id: string) {
    const suggestion = await this.findOwnedSuggestion(userId, id);
    if (suggestion.status !== "pending") {
      throw createError("This suggestion is no longer pending", 409);
    }

    const habit = await Habit.create({
      userId,
      areaId: suggestion.areaId,
      name: suggestion.suggestedName,
      frequency: suggestion.frequency,
      durationMinutes: suggestion.durationMinutes,
      difficulty: suggestion.difficulty,
      reminderEnabled: false,
    });
    await suggestion.update({ status: "accepted", acceptedHabitId: habit.id });

    return serializeSuggestion(suggestion);
  }

  async acceptAll(userId: string) {
    const pending = await AiSuggestion.findAll({ where: { userId, status: "pending" } });
    if (pending.length === 0) return [];

    const sequelize = AiSuggestion.sequelize;
    if (!sequelize) throw createError("Database connection unavailable", 500);

    return sequelize.transaction(async (transaction) => {
      const results = [];
      for (const suggestion of pending) {
        const habit = await Habit.create(
          {
            userId,
            areaId: suggestion.areaId,
            name: suggestion.suggestedName,
            frequency: suggestion.frequency,
            durationMinutes: suggestion.durationMinutes,
            difficulty: suggestion.difficulty,
            reminderEnabled: false,
          },
          { transaction },
        );
        await suggestion.update(
          { status: "accepted", acceptedHabitId: habit.id },
          { transaction },
        );
        results.push(serializeSuggestion(suggestion));
      }
      return results;
    });
  }

  async dismiss(userId: string, id: string) {
    const suggestion = await this.findOwnedSuggestion(userId, id);
    if (suggestion.status !== "pending") {
      throw createError("This suggestion is no longer pending", 409);
    }
    await suggestion.update({ status: "dismissed" });
    return serializeSuggestion(suggestion);
  }
}

export const aiSuggestionsService = new AiSuggestionsService();
