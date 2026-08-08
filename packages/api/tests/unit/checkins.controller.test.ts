import request from "supertest";
import { signAccessToken } from "../../../shared/auth/jwt";
import { app } from "../../app";

// Mock the DB so we don't need a real database in unit tests
jest.mock("../../src/lib/db", () => ({
  initializeDatabase: jest.fn().mockResolvedValue(undefined),
  getDatabase: jest.fn(),
}));

jest.mock("../../src/services/checkins.service", () => ({
  checkInsService: {
    list: jest.fn(),
    today: jest.fn(),
    create: jest.fn(),
    remove: jest.fn(),
  },
}));

import { checkInsService } from "../../src/services/checkins.service";
const mockCheckInsService = checkInsService as jest.Mocked<typeof checkInsService>;

const USER_ID = "11111111-1111-4111-8111-111111111111";
const HABIT_ID = "22222222-2222-4222-8222-222222222222";
const CHECKIN_ID = "33333333-3333-4333-8333-333333333333";

const token = signAccessToken({
  userId: USER_ID,
  email: "alice@example.com",
  role: "user",
  sessionId: "44444444-4444-4444-8444-444444444444",
});

const authCookie = `accessToken=${token}`;

const sampleCheckIn = {
  id: CHECKIN_ID,
  habitId: HABIT_ID,
  date: "2026-06-26",
  createdAt: new Date("2026-06-26T08:00:00.000Z"),
};

beforeEach(() => {
  jest.clearAllMocks();
});

// ─── GET /api/check-ins ───────────────────────────────────────────────────────

describe("GET /api/check-ins", () => {
  it("returns 200 with the user's check-ins", async () => {
    mockCheckInsService.list.mockResolvedValue([sampleCheckIn]);

    const res = await request(app).get("/api/check-ins").set("Cookie", authCookie);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(mockCheckInsService.list).toHaveBeenCalledWith(
      USER_ID,
      { from: undefined, to: undefined, habitId: undefined },
      undefined,
    );
  });

  it("forwards the X-Timezone header to the service", async () => {
    mockCheckInsService.list.mockResolvedValue([sampleCheckIn]);

    await request(app)
      .get("/api/check-ins")
      .set("Cookie", authCookie)
      .set("X-Timezone", "America/New_York");

    expect(mockCheckInsService.list).toHaveBeenCalledWith(
      USER_ID,
      { from: undefined, to: undefined, habitId: undefined },
      "America/New_York",
    );
  });

  it("returns 422 when from is after to", async () => {
    const res = await request(app)
      .get("/api/check-ins?from=2026-06-26&to=2026-06-01")
      .set("Cookie", authCookie);

    expect(res.status).toBe(422);
    expect(mockCheckInsService.list).not.toHaveBeenCalled();
  });

  it("returns 401 without an auth cookie", async () => {
    const res = await request(app).get("/api/check-ins");

    expect(res.status).toBe(401);
    expect(mockCheckInsService.list).not.toHaveBeenCalled();
  });
});

// ─── GET /api/check-ins/today ─────────────────────────────────────────────────

describe("GET /api/check-ins/today", () => {
  it("returns 200 with today's check-ins", async () => {
    mockCheckInsService.today.mockResolvedValue([sampleCheckIn]);

    const res = await request(app).get("/api/check-ins/today").set("Cookie", authCookie);

    expect(res.status).toBe(200);
    expect(mockCheckInsService.today).toHaveBeenCalledWith(USER_ID, undefined);
  });
});

// ─── POST /api/check-ins ──────────────────────────────────────────────────────

describe("POST /api/check-ins", () => {
  it("returns 201 when a new check-in is created", async () => {
    mockCheckInsService.create.mockResolvedValue({ checkIn: sampleCheckIn, created: true });

    const res = await request(app)
      .post("/api/check-ins")
      .set("Cookie", authCookie)
      .send({ habitId: HABIT_ID, date: "2026-06-26" });

    expect(res.status).toBe(201);
    expect(mockCheckInsService.create).toHaveBeenCalledWith(
      USER_ID,
      { habitId: HABIT_ID, date: "2026-06-26" },
      undefined,
    );
  });

  it("defaults the date server-side when omitted from the body", async () => {
    mockCheckInsService.create.mockResolvedValue({ checkIn: sampleCheckIn, created: true });

    const res = await request(app)
      .post("/api/check-ins")
      .set("Cookie", authCookie)
      .send({ habitId: HABIT_ID });

    expect(res.status).toBe(201);
    expect(mockCheckInsService.create).toHaveBeenCalledWith(
      USER_ID,
      { habitId: HABIT_ID },
      undefined,
    );
  });

  it("returns 200 (idempotent) when the check-in already existed", async () => {
    mockCheckInsService.create.mockResolvedValue({ checkIn: sampleCheckIn, created: false });

    const res = await request(app)
      .post("/api/check-ins")
      .set("Cookie", authCookie)
      .send({ habitId: HABIT_ID, date: "2026-06-26" });

    expect(res.status).toBe(200);
  });

  it("returns 422 for a malformed date", async () => {
    const res = await request(app)
      .post("/api/check-ins")
      .set("Cookie", authCookie)
      .send({ habitId: HABIT_ID, date: "06/26/2026" });

    expect(res.status).toBe(422);
    expect(mockCheckInsService.create).not.toHaveBeenCalled();
  });

  it("propagates a 400 when the service rejects a future date", async () => {
    const err = Object.assign(new Error("Cannot check in for a future date"), {
      statusCode: 400,
      isOperational: true,
    });
    mockCheckInsService.create.mockRejectedValue(err);

    const res = await request(app)
      .post("/api/check-ins")
      .set("Cookie", authCookie)
      .send({ habitId: HABIT_ID, date: "2099-01-01" });

    expect(res.status).toBe(400);
  });

  it("returns 401 without an auth cookie", async () => {
    const res = await request(app)
      .post("/api/check-ins")
      .send({ habitId: HABIT_ID, date: "2026-06-26" });

    expect(res.status).toBe(401);
  });
});

// ─── DELETE /api/check-ins/:id ────────────────────────────────────────────────

describe("DELETE /api/check-ins/:id", () => {
  it("returns 204 on success", async () => {
    mockCheckInsService.remove.mockResolvedValue(undefined);

    const res = await request(app)
      .delete(`/api/check-ins/${CHECKIN_ID}`)
      .set("Cookie", authCookie);

    expect(res.status).toBe(204);
    expect(mockCheckInsService.remove).toHaveBeenCalledWith(USER_ID, CHECKIN_ID);
  });

  it("returns 401 without an auth cookie", async () => {
    const res = await request(app).delete(`/api/check-ins/${CHECKIN_ID}`);

    expect(res.status).toBe(401);
    expect(mockCheckInsService.remove).not.toHaveBeenCalled();
  });
});
