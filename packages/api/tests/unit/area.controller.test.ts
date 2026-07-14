import request from "supertest";
import { signAccessToken } from "../../../shared/auth/jwt";
import { app } from "../../app";

// Mock the DB so we don't need a real database in unit tests
jest.mock("../../src/lib/db", () => ({
  initializeDatabase: jest.fn().mockResolvedValue(undefined),
  getDatabase: jest.fn(),
}));

jest.mock("../../src/services/area.service", () => ({
  areaService: {
    list: jest.fn(),
    getById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  },
}));

import { areaService } from "../../src/services/area.service";
const mockAreaService = areaService as jest.Mocked<typeof areaService>;

const USER_ID = "11111111-1111-4111-8111-111111111111";
const AREA_ID = "22222222-2222-4222-8222-222222222222";

const token = signAccessToken({
  userId: USER_ID,
  email: "alice@example.com",
  role: "user",
  sessionId: "33333333-3333-4333-8333-333333333333",
});

const authCookie = `accessToken=${token}`;

const sampleArea = {
  id: AREA_ID,
  name: "Health",
  color: "health",
  description: null,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
};

beforeEach(() => {
  jest.clearAllMocks();
});

// ─── GET /api/areas ───────────────────────────────────────────────────────────

describe("GET /api/areas", () => {
  it("returns 200 with the user's areas", async () => {
    mockAreaService.list.mockResolvedValue([sampleArea]);

    const res = await request(app).get("/api/areas").set("Cookie", authCookie);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].name).toBe("Health");
    expect(mockAreaService.list).toHaveBeenCalledWith(USER_ID);
  });

  it("returns 401 without an auth cookie", async () => {
    const res = await request(app).get("/api/areas");

    expect(res.status).toBe(401);
    expect(mockAreaService.list).not.toHaveBeenCalled();
  });
});

// ─── POST /api/areas ──────────────────────────────────────────────────────────

describe("POST /api/areas", () => {
  it("returns 201 with the created area", async () => {
    mockAreaService.create.mockResolvedValue(sampleArea);

    const res = await request(app)
      .post("/api/areas")
      .set("Cookie", authCookie)
      .send({ name: "Health", color: "health" });

    expect(res.status).toBe(201);
    expect(res.body.data.id).toBe(AREA_ID);
    expect(mockAreaService.create).toHaveBeenCalledWith(USER_ID, {
      name: "Health",
      color: "health",
    });
  });

  it("returns 422 for an invalid color", async () => {
    const res = await request(app)
      .post("/api/areas")
      .set("Cookie", authCookie)
      .send({ name: "Health", color: "neon" });

    expect(res.status).toBe(422);
    expect(res.body.errors[0].field).toBe("color");
    expect(mockAreaService.create).not.toHaveBeenCalled();
  });

  it("returns 422 when name is missing", async () => {
    const res = await request(app)
      .post("/api/areas")
      .set("Cookie", authCookie)
      .send({ color: "health" });

    expect(res.status).toBe(422);
    expect(mockAreaService.create).not.toHaveBeenCalled();
  });

  it("returns 401 without an auth cookie", async () => {
    const res = await request(app)
      .post("/api/areas")
      .send({ name: "Health", color: "health" });

    expect(res.status).toBe(401);
  });
});

// ─── GET /api/areas/:id ───────────────────────────────────────────────────────

describe("GET /api/areas/:id", () => {
  it("returns 200 with the area and its habits", async () => {
    mockAreaService.getById.mockResolvedValue({ ...sampleArea, habits: [] });

    const res = await request(app)
      .get(`/api/areas/${AREA_ID}`)
      .set("Cookie", authCookie);

    expect(res.status).toBe(200);
    expect(res.body.data.habits).toEqual([]);
    expect(mockAreaService.getById).toHaveBeenCalledWith(USER_ID, AREA_ID);
  });

  it("returns 422 for a non-uuid id", async () => {
    const res = await request(app)
      .get("/api/areas/not-a-uuid")
      .set("Cookie", authCookie);

    expect(res.status).toBe(422);
    expect(mockAreaService.getById).not.toHaveBeenCalled();
  });

  it("propagates a 404 from the service", async () => {
    const err = Object.assign(new Error("Area not found"), {
      statusCode: 404,
      isOperational: true,
    });
    mockAreaService.getById.mockRejectedValue(err);

    const res = await request(app)
      .get(`/api/areas/${AREA_ID}`)
      .set("Cookie", authCookie);

    expect(res.status).toBe(404);
    expect(res.body.error).toBe("Area not found");
  });

  it("propagates a 403 when the area belongs to someone else", async () => {
    const err = Object.assign(new Error("Forbidden"), {
      statusCode: 403,
      isOperational: true,
    });
    mockAreaService.getById.mockRejectedValue(err);

    const res = await request(app)
      .get(`/api/areas/${AREA_ID}`)
      .set("Cookie", authCookie);

    expect(res.status).toBe(403);
  });
});

// ─── PATCH /api/areas/:id ─────────────────────────────────────────────────────

describe("PATCH /api/areas/:id", () => {
  it("returns 200 with the updated area", async () => {
    mockAreaService.update.mockResolvedValue({
      ...sampleArea,
      name: "Fitness",
    });

    const res = await request(app)
      .patch(`/api/areas/${AREA_ID}`)
      .set("Cookie", authCookie)
      .send({ name: "Fitness" });

    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe("Fitness");
    expect(mockAreaService.update).toHaveBeenCalledWith(USER_ID, AREA_ID, {
      name: "Fitness",
    });
  });

  it("accepts a null description to clear it", async () => {
    mockAreaService.update.mockResolvedValue(sampleArea);

    const res = await request(app)
      .patch(`/api/areas/${AREA_ID}`)
      .set("Cookie", authCookie)
      .send({ description: null });

    expect(res.status).toBe(200);
    expect(mockAreaService.update).toHaveBeenCalledWith(USER_ID, AREA_ID, {
      description: null,
    });
  });

  it("returns 422 for an empty body", async () => {
    const res = await request(app)
      .patch(`/api/areas/${AREA_ID}`)
      .set("Cookie", authCookie)
      .send({});

    expect(res.status).toBe(422);
    expect(mockAreaService.update).not.toHaveBeenCalled();
  });
});

// ─── DELETE /api/areas/:id ────────────────────────────────────────────────────

describe("DELETE /api/areas/:id", () => {
  it("returns 204 on success", async () => {
    mockAreaService.remove.mockResolvedValue(undefined);

    const res = await request(app)
      .delete(`/api/areas/${AREA_ID}`)
      .set("Cookie", authCookie);

    expect(res.status).toBe(204);
    expect(res.body).toEqual({});
    expect(mockAreaService.remove).toHaveBeenCalledWith(USER_ID, AREA_ID);
  });

  it("returns 401 without an auth cookie", async () => {
    const res = await request(app).delete(`/api/areas/${AREA_ID}`);

    expect(res.status).toBe(401);
    expect(mockAreaService.remove).not.toHaveBeenCalled();
  });
});
