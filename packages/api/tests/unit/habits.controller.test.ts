import request from "supertest";
import { signAccessToken } from "../../../shared/auth/jwt";
import { app } from "../../app";

// Mock the DB so we don't need a real database in unit tests
jest.mock("../../src/lib/db", () => ({
  initializeDatabase: jest.fn().mockResolvedValue(undefined),
  getDatabase: jest.fn(),
}));

jest.mock("../../src/services/habits.service", () => ({
  habitsService: {
    list: jest.fn(),
    getById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    archive: jest.fn(),
    restore: jest.fn(),
  },
}));

import { habitsService } from "../../src/services/habits.service";
const mockHabitsService = habitsService as jest.Mocked<typeof habitsService>;

const USER_ID = "11111111-1111-4111-8111-111111111111";
const AREA_ID = "22222222-2222-4222-8222-222222222222";
const HABIT_ID = "33333333-3333-4333-8333-333333333333";

const token = signAccessToken({
  userId: USER_ID,
  email: "alice@example.com",
  role: "user",
  sessionId: "44444444-4444-4444-8444-444444444444",
});

const authCookie = `accessToken=${token}`;

const sampleHabit = {
  id: HABIT_ID,
  areaId: AREA_ID,
  name: "Morning run",
  frequency: "daily",
  durationMinutes: 30,
  difficulty: "medium",
  notes: null,
  reminderEnabled: false,
  reminderTime: null,
  timezone: null,
  archivedAt: null,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
};

beforeEach(() => {
  jest.clearAllMocks();
});

// ─── GET /api/habits ──────────────────────────────────────────────────────────

describe("GET /api/habits", () => {
  it("returns 200 with the user's habits", async () => {
    mockHabitsService.list.mockResolvedValue([sampleHabit]);

    const res = await request(app).get("/api/habits").set("Cookie", authCookie);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(mockHabitsService.list).toHaveBeenCalledWith(USER_ID, {
      areaId: undefined,
      includeArchived: false,
    });
  });

  it("passes areaId and includeArchived query params through", async () => {
    mockHabitsService.list.mockResolvedValue([sampleHabit]);

    const res = await request(app)
      .get(`/api/habits?areaId=${AREA_ID}&includeArchived=true`)
      .set("Cookie", authCookie);

    expect(res.status).toBe(200);
    expect(mockHabitsService.list).toHaveBeenCalledWith(USER_ID, {
      areaId: AREA_ID,
      includeArchived: true,
    });
  });

  it("returns 401 without an auth cookie", async () => {
    const res = await request(app).get("/api/habits");

    expect(res.status).toBe(401);
    expect(mockHabitsService.list).not.toHaveBeenCalled();
  });
});

// ─── POST /api/habits ─────────────────────────────────────────────────────────

describe("POST /api/habits", () => {
  it("returns 201 with the created habit", async () => {
    mockHabitsService.create.mockResolvedValue(sampleHabit);

    const res = await request(app)
      .post("/api/habits")
      .set("Cookie", authCookie)
      .send({ areaId: AREA_ID, name: "Morning run", frequency: "daily" });

    expect(res.status).toBe(201);
    expect(res.body.data.id).toBe(HABIT_ID);
    expect(mockHabitsService.create).toHaveBeenCalledWith(USER_ID, {
      areaId: AREA_ID,
      name: "Morning run",
      frequency: "daily",
      reminderEnabled: false,
    });
  });

  it("returns 422 for an invalid frequency", async () => {
    const res = await request(app)
      .post("/api/habits")
      .set("Cookie", authCookie)
      .send({ areaId: AREA_ID, name: "Morning run", frequency: "hourly" });

    expect(res.status).toBe(422);
    expect(res.body.errors[0].field).toBe("frequency");
    expect(mockHabitsService.create).not.toHaveBeenCalled();
  });

  it("returns 422 when reminderEnabled is true but reminderTime/timezone are missing", async () => {
    const res = await request(app)
      .post("/api/habits")
      .set("Cookie", authCookie)
      .send({
        areaId: AREA_ID,
        name: "Morning run",
        frequency: "daily",
        reminderEnabled: true,
      });

    expect(res.status).toBe(422);
    expect(mockHabitsService.create).not.toHaveBeenCalled();
  });

  it("returns 422 for a malformed reminderTime", async () => {
    const res = await request(app)
      .post("/api/habits")
      .set("Cookie", authCookie)
      .send({
        areaId: AREA_ID,
        name: "Morning run",
        frequency: "daily",
        reminderEnabled: true,
        reminderTime: "7:30am",
        timezone: "America/New_York",
      });

    expect(res.status).toBe(422);
    expect(mockHabitsService.create).not.toHaveBeenCalled();
  });

  it("accepts a valid reminder configuration", async () => {
    mockHabitsService.create.mockResolvedValue({
      ...sampleHabit,
      reminderEnabled: true,
      reminderTime: "07:30",
      timezone: "America/New_York",
    });

    const res = await request(app)
      .post("/api/habits")
      .set("Cookie", authCookie)
      .send({
        areaId: AREA_ID,
        name: "Morning run",
        frequency: "daily",
        reminderEnabled: true,
        reminderTime: "07:30",
        timezone: "America/New_York",
      });

    expect(res.status).toBe(201);
    expect(mockHabitsService.create).toHaveBeenCalledWith(USER_ID, {
      areaId: AREA_ID,
      name: "Morning run",
      frequency: "daily",
      reminderEnabled: true,
      reminderTime: "07:30",
      timezone: "America/New_York",
    });
  });

  it("returns 401 without an auth cookie", async () => {
    const res = await request(app)
      .post("/api/habits")
      .send({ areaId: AREA_ID, name: "Morning run", frequency: "daily" });

    expect(res.status).toBe(401);
  });
});

// ─── GET /api/habits/:id ──────────────────────────────────────────────────────

describe("GET /api/habits/:id", () => {
  it("returns 200 with the habit", async () => {
    mockHabitsService.getById.mockResolvedValue(sampleHabit);

    const res = await request(app)
      .get(`/api/habits/${HABIT_ID}`)
      .set("Cookie", authCookie);

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(HABIT_ID);
    expect(mockHabitsService.getById).toHaveBeenCalledWith(USER_ID, HABIT_ID);
  });

  it("returns 422 for a non-uuid id", async () => {
    const res = await request(app).get("/api/habits/not-a-uuid").set("Cookie", authCookie);

    expect(res.status).toBe(422);
    expect(mockHabitsService.getById).not.toHaveBeenCalled();
  });

  it("propagates a 404 from the service", async () => {
    const err = Object.assign(new Error("Habit not found"), {
      statusCode: 404,
      isOperational: true,
    });
    mockHabitsService.getById.mockRejectedValue(err);

    const res = await request(app)
      .get(`/api/habits/${HABIT_ID}`)
      .set("Cookie", authCookie);

    expect(res.status).toBe(404);
    expect(res.body.error).toBe("Habit not found");
  });

  it("propagates a 403 when the habit belongs to someone else", async () => {
    const err = Object.assign(new Error("Forbidden"), {
      statusCode: 403,
      isOperational: true,
    });
    mockHabitsService.getById.mockRejectedValue(err);

    const res = await request(app)
      .get(`/api/habits/${HABIT_ID}`)
      .set("Cookie", authCookie);

    expect(res.status).toBe(403);
  });
});

// ─── PATCH /api/habits/:id ────────────────────────────────────────────────────

describe("PATCH /api/habits/:id", () => {
  it("returns 200 with the updated habit", async () => {
    mockHabitsService.update.mockResolvedValue({ ...sampleHabit, name: "Evening run" });

    const res = await request(app)
      .patch(`/api/habits/${HABIT_ID}`)
      .set("Cookie", authCookie)
      .send({ name: "Evening run" });

    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe("Evening run");
    expect(mockHabitsService.update).toHaveBeenCalledWith(USER_ID, HABIT_ID, {
      name: "Evening run",
    });
  });

  it("returns 422 for an empty body", async () => {
    const res = await request(app)
      .patch(`/api/habits/${HABIT_ID}`)
      .set("Cookie", authCookie)
      .send({});

    expect(res.status).toBe(422);
    expect(mockHabitsService.update).not.toHaveBeenCalled();
  });

  it("propagates a 422 raised by the service for an invalid reminder combination", async () => {
    const err = Object.assign(
      new Error("reminderTime and timezone are required when reminderEnabled is true"),
      { statusCode: 422, isOperational: true },
    );
    mockHabitsService.update.mockRejectedValue(err);

    const res = await request(app)
      .patch(`/api/habits/${HABIT_ID}`)
      .set("Cookie", authCookie)
      .send({ reminderEnabled: true });

    expect(res.status).toBe(422);
  });
});

// ─── DELETE /api/habits/:id ───────────────────────────────────────────────────

describe("DELETE /api/habits/:id", () => {
  it("returns 204 on success", async () => {
    mockHabitsService.remove.mockResolvedValue(undefined);

    const res = await request(app)
      .delete(`/api/habits/${HABIT_ID}`)
      .set("Cookie", authCookie);

    expect(res.status).toBe(204);
    expect(mockHabitsService.remove).toHaveBeenCalledWith(USER_ID, HABIT_ID);
  });

  it("returns 401 without an auth cookie", async () => {
    const res = await request(app).delete(`/api/habits/${HABIT_ID}`);

    expect(res.status).toBe(401);
    expect(mockHabitsService.remove).not.toHaveBeenCalled();
  });
});

// ─── POST /api/habits/:id/archive & /restore ──────────────────────────────────

describe("POST /api/habits/:id/archive", () => {
  it("returns 200 with the archived habit", async () => {
    mockHabitsService.archive.mockResolvedValue({
      ...sampleHabit,
      archivedAt: new Date("2026-02-01T00:00:00.000Z"),
    });

    const res = await request(app)
      .post(`/api/habits/${HABIT_ID}/archive`)
      .set("Cookie", authCookie);

    expect(res.status).toBe(200);
    expect(res.body.data.archivedAt).not.toBeNull();
    expect(mockHabitsService.archive).toHaveBeenCalledWith(USER_ID, HABIT_ID);
  });
});

describe("POST /api/habits/:id/restore", () => {
  it("returns 200 with the restored habit", async () => {
    mockHabitsService.restore.mockResolvedValue(sampleHabit);

    const res = await request(app)
      .post(`/api/habits/${HABIT_ID}/restore`)
      .set("Cookie", authCookie);

    expect(res.status).toBe(200);
    expect(res.body.data.archivedAt).toBeNull();
    expect(mockHabitsService.restore).toHaveBeenCalledWith(USER_ID, HABIT_ID);
  });
});
