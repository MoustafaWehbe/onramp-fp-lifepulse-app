// Mock the DB so we don't need a real database in unit tests
jest.mock("../../src/lib/db", () => ({
  initializeDatabase: jest.fn().mockResolvedValue(undefined),
  getDatabase: jest.fn(),
}));

jest.mock("../../src/models", () => ({
  AiSuggestion: {
    max: jest.fn(),
    findAll: jest.fn(),
    findByPk: jest.fn(),
    update: jest.fn(),
    bulkCreate: jest.fn(),
    sequelize: { transaction: jest.fn() },
  },
  LifeArea: {
    findAll: jest.fn(),
  },
  Habit: {
    findAll: jest.fn(),
    create: jest.fn(),
  },
}));

jest.mock("../../src/services/profile.service", () => ({
  profileService: {
    getProfile: jest.fn(),
  },
}));

jest.mock("../../src/lib/ai", () => ({
  chatCompletionStructured: jest.fn(),
}));

import { AiSuggestion, LifeArea, Habit } from "../../src/models";
import { profileService } from "../../src/services/profile.service";
import { chatCompletionStructured } from "../../src/lib/ai";
import { aiSuggestionsService } from "../../src/services/ai-suggestions.service";

const mockAiSuggestion = AiSuggestion as unknown as {
  max: jest.Mock;
  findAll: jest.Mock;
  findByPk: jest.Mock;
  update: jest.Mock;
  bulkCreate: jest.Mock;
  sequelize: { transaction: jest.Mock };
};
const mockLifeArea = LifeArea as unknown as { findAll: jest.Mock };
const mockHabit = Habit as unknown as { findAll: jest.Mock; create: jest.Mock };
const mockGetProfile = profileService.getProfile as jest.Mock;
const mockChatCompletionStructured = chatCompletionStructured as jest.Mock;

const USER_ID = "11111111-1111-4111-8111-111111111111";

function makeArea(id: string, name = `Area ${id}`) {
  return {
    id,
    name,
    color: "health",
    description: null,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
  };
}

const emptyProfile = {
  goals: [] as string[],
};

beforeEach(() => {
  jest.clearAllMocks();
  // Sensible defaults that most tests don't care about.
  mockAiSuggestion.findAll.mockResolvedValue([]);
  mockAiSuggestion.update.mockResolvedValue([0]);
  mockHabit.findAll.mockResolvedValue([]);
  mockGetProfile.mockResolvedValue(emptyProfile);
});

// ─── Cooldown enforcement ──────────────────────────────────────────────────────

describe("generate — cooldown", () => {
  it("rejects with a 429 and retryAfterSeconds when the last batch was too recent", async () => {
    mockAiSuggestion.max.mockResolvedValue(new Date());

    await expect(aiSuggestionsService.generate(USER_ID)).rejects.toMatchObject({
      statusCode: 429,
      retryAfterSeconds: expect.any(Number),
    });

    // The cooldown check should short-circuit before touching areas at all.
    expect(mockLifeArea.findAll).not.toHaveBeenCalled();
  });

  it("does not enforce a cooldown when no previous batch exists", async () => {
    mockAiSuggestion.max.mockResolvedValue(null);
    mockLifeArea.findAll.mockResolvedValue([]);

    await expect(aiSuggestionsService.generate(USER_ID)).rejects.toMatchObject({
      statusCode: 422, // fails later, on "no life areas" — proves cooldown wasn't the blocker
    });
  });

  it("does not enforce a cooldown once the configured window has elapsed", async () => {
    process.env.AI_SUGGESTIONS_COOLDOWN_MINUTES = "60";
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    mockAiSuggestion.max.mockResolvedValue(twoHoursAgo);
    mockLifeArea.findAll.mockResolvedValue([]);

    await expect(aiSuggestionsService.generate(USER_ID)).rejects.toMatchObject({
      statusCode: 422,
    });
    delete process.env.AI_SUGGESTIONS_COOLDOWN_MINUTES;
  });
});

// ─── Area selection / cap ───────────────────────────────────────────────────────

describe("generate — area cap", () => {
  it("requires at least one life area", async () => {
    mockAiSuggestion.max.mockResolvedValue(null);
    mockLifeArea.findAll.mockResolvedValue([]);

    await expect(aiSuggestionsService.generate(USER_ID)).rejects.toMatchObject({
      statusCode: 422,
    });
  });

  it("caps generation to the 5 areas with the fewest existing habits", async () => {
    mockAiSuggestion.max.mockResolvedValue(null);

    // 7 areas; a1..a5 should be picked (0-4 habits each), a6/a7 (5-6 habits) skipped.
    const areas = Array.from({ length: 7 }, (_, i) => makeArea(`a${i + 1}`));
    mockLifeArea.findAll.mockResolvedValue(areas);

    const habitCounts: Record<string, number> = {
      a1: 0,
      a2: 1,
      a3: 2,
      a4: 3,
      a5: 4,
      a6: 5,
      a7: 6,
    };
    const habitRows = Object.entries(habitCounts).flatMap(([areaId, count]) =>
      Array.from({ length: count }, (_, i) => ({ areaId, name: `Habit ${areaId}-${i}` })),
    );
    mockHabit.findAll.mockResolvedValue(habitRows);

    // The model "hallucinates" suggestions for every area, including the
    // excluded a6/a7 — generate() must filter those out.
    mockChatCompletionStructured.mockResolvedValue({
      suggestions: areas.map((a) => ({
        areaId: a.id,
        suggestedName: `Suggested habit for ${a.id}`,
        frequency: "daily",
        durationMinutes: 10,
        difficulty: "easy",
        rationale: "Because reasons.",
      })),
    });

    mockAiSuggestion.bulkCreate.mockImplementation(async (rows: Array<Record<string, unknown>>) =>
      rows.map((row, i) => ({
        ...row,
        id: `sugg-${i}`,
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
      })),
    );

    const result = await aiSuggestionsService.generate(USER_ID);

    const insertedAreaIds = new Set(result.map((s) => s.areaId));
    expect(insertedAreaIds).toEqual(new Set(["a1", "a2", "a3", "a4", "a5"]));
    expect(insertedAreaIds.has("a6")).toBe(false);
    expect(insertedAreaIds.has("a7")).toBe(false);

    // Old pending suggestions are superseded rather than piling up.
    expect(mockAiSuggestion.update).toHaveBeenCalledWith(
      { status: "dismissed" },
      { where: { userId: USER_ID, status: "pending" } },
    );
  });

  it("uses every area as-is when there are 5 or fewer", async () => {
    mockAiSuggestion.max.mockResolvedValue(null);
    const areas = [makeArea("a1"), makeArea("a2")];
    mockLifeArea.findAll.mockResolvedValue(areas);
    mockChatCompletionStructured.mockResolvedValue({
      suggestions: [
        {
          areaId: "a1",
          suggestedName: "Habit",
          frequency: "daily",
          durationMinutes: null,
          difficulty: null,
          rationale: "Rationale",
        },
      ],
    });
    mockAiSuggestion.bulkCreate.mockImplementation(async (rows: Array<Record<string, unknown>>) =>
      rows.map((row, i) => ({ ...row, id: `sugg-${i}`, createdAt: new Date() })),
    );

    const result = await aiSuggestionsService.generate(USER_ID);
    expect(result).toHaveLength(1);
    expect(result[0].areaId).toBe("a1");
  });
});

// ─── OpenAI not configured (503 fallback) ──────────────────────────────────────

describe("generate — AI not configured", () => {
  it("surfaces a 503 when the OpenAI API key is missing", async () => {
    mockAiSuggestion.max.mockResolvedValue(null);
    mockLifeArea.findAll.mockResolvedValue([makeArea("a1")]);
    mockChatCompletionStructured.mockRejectedValue(new Error("OPENAI_API_KEY is not configured"));

    await expect(aiSuggestionsService.generate(USER_ID)).rejects.toMatchObject({
      statusCode: 503,
    });
  });

  it("surfaces a 502 for any other AI failure", async () => {
    mockAiSuggestion.max.mockResolvedValue(null);
    mockLifeArea.findAll.mockResolvedValue([makeArea("a1")]);
    mockChatCompletionStructured.mockRejectedValue(new Error("network blip"));

    await expect(aiSuggestionsService.generate(USER_ID)).rejects.toMatchObject({
      statusCode: 502,
    });
  });
});

// ─── Ownership checks ───────────────────────────────────────────────────────────

describe("accept", () => {
  const SUGGESTION_ID = "22222222-2222-4222-8222-222222222222";

  it("returns 404 when the suggestion doesn't exist", async () => {
    mockAiSuggestion.findByPk.mockResolvedValue(null);

    await expect(aiSuggestionsService.accept(USER_ID, SUGGESTION_ID)).rejects.toMatchObject({
      statusCode: 404,
    });
  });

  it("returns 403 when the suggestion belongs to another user", async () => {
    mockAiSuggestion.findByPk.mockResolvedValue({
      id: SUGGESTION_ID,
      userId: "someone-else",
      status: "pending",
      update: jest.fn(),
    });

    await expect(aiSuggestionsService.accept(USER_ID, SUGGESTION_ID)).rejects.toMatchObject({
      statusCode: 403,
    });
  });

  it("returns 409 when the suggestion is no longer pending", async () => {
    mockAiSuggestion.findByPk.mockResolvedValue({
      id: SUGGESTION_ID,
      userId: USER_ID,
      status: "dismissed",
      update: jest.fn(),
    });

    await expect(aiSuggestionsService.accept(USER_ID, SUGGESTION_ID)).rejects.toMatchObject({
      statusCode: 409,
    });
  });

  it("creates a habit and marks the suggestion accepted for the owning user", async () => {
    const update = jest.fn().mockImplementation(function (
      this: Record<string, unknown>,
      patch: Record<string, unknown>,
    ) {
      Object.assign(this, patch);
      return Promise.resolve(this);
    });
    const suggestion = {
      id: SUGGESTION_ID,
      userId: USER_ID,
      areaId: "a1",
      suggestedName: "Read 10 pages",
      rationale: "You mentioned wanting to read more.",
      frequency: "daily",
      durationMinutes: 15,
      difficulty: "easy",
      status: "pending",
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      update,
    };
    mockAiSuggestion.findByPk.mockResolvedValue(suggestion);
    mockHabit.create.mockResolvedValue({ id: "habit-1" });

    const result = await aiSuggestionsService.accept(USER_ID, SUGGESTION_ID);

    expect(mockHabit.create).toHaveBeenCalledWith({
      userId: USER_ID,
      areaId: "a1",
      name: "Read 10 pages",
      frequency: "daily",
      durationMinutes: 15,
      difficulty: "easy",
      reminderEnabled: false,
    });
    expect(update).toHaveBeenCalledWith({ status: "accepted", acceptedHabitId: "habit-1" });
    expect(result.status).toBe("accepted");
  });
});

describe("dismiss", () => {
  const SUGGESTION_ID = "33333333-3333-4333-8333-333333333333";

  it("returns 403 when the suggestion belongs to another user", async () => {
    mockAiSuggestion.findByPk.mockResolvedValue({
      id: SUGGESTION_ID,
      userId: "someone-else",
      status: "pending",
      update: jest.fn(),
    });

    await expect(aiSuggestionsService.dismiss(USER_ID, SUGGESTION_ID)).rejects.toMatchObject({
      statusCode: 403,
    });
  });

  it("marks an owned, pending suggestion as dismissed", async () => {
    const update = jest.fn().mockImplementation(function (
      this: Record<string, unknown>,
      patch: Record<string, unknown>,
    ) {
      Object.assign(this, patch);
      return Promise.resolve(this);
    });
    mockAiSuggestion.findByPk.mockResolvedValue({
      id: SUGGESTION_ID,
      userId: USER_ID,
      status: "pending",
      update,
    });

    const result = await aiSuggestionsService.dismiss(USER_ID, SUGGESTION_ID);

    expect(update).toHaveBeenCalledWith({ status: "dismissed" });
    expect(result.status).toBe("dismissed");
  });
});
