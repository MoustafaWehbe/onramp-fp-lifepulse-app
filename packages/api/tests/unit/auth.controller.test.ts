import request from "supertest";
import { app } from "../../app";

// Mock the DB so we don't need a real database in unit tests
jest.mock("../../src/lib/db", () => ({
  initializeDatabase: jest.fn().mockResolvedValue(undefined),
  getDatabase: jest.fn(),
}));

jest.mock("../../src/services/auth.service", () => ({
  authService: {
    register: jest.fn(),
    login: jest.fn(),
    refresh: jest.fn(),
    logout: jest.fn(),
    getProfile: jest.fn(),
  },
}));

import { authService } from "../../src/services/auth.service";
const mockAuthService = authService as jest.Mocked<typeof authService>;

beforeEach(() => {
  jest.clearAllMocks();
});

// ─── POST /api/auth/register ──────────────────────────────────────────────────

describe("POST /api/auth/register", () => {
  it("returns 201 with user data on success", async () => {
    mockAuthService.register.mockResolvedValue({
      id: "uuid-1",
      email: "alice@example.com",
      name: "Alice",
      role: "user",
    });

    const res = await request(app).post("/api/auth/register").send({
      email: "alice@example.com",
      password: "SecurePass1",
      name: "Alice",
    });

    expect(res.status).toBe(201);
    expect(res.body.data.email).toBe("alice@example.com");
  });

  it("returns 422 when email is invalid", async () => {
    const res = await request(app).post("/api/auth/register").send({
      email: "not-an-email",
      password: "SecurePass1",
      name: "Alice",
    });

    expect(res.status).toBe(422);
    expect(res.body.errors[0].field).toBe("email");
  });

  it("returns 422 when password is too weak", async () => {
    const res = await request(app).post("/api/auth/register").send({
      email: "alice@example.com",
      password: "short",
      name: "Alice",
    });

    expect(res.status).toBe(422);
  });

  it("defaults to the user role when none is given", async () => {
    mockAuthService.register.mockResolvedValue({
      id: "uuid-1",
      email: "alice@example.com",
      name: "Alice",
      role: "user",
    });

    await request(app).post("/api/auth/register").send({
      email: "alice@example.com",
      password: "SecurePass1",
      name: "Alice",
    });

    expect(mockAuthService.register).toHaveBeenCalledWith(
      expect.objectContaining({ role: "user" }),
    );
  });

  it("passes the coach's profile details through when registering as a coach", async () => {
    mockAuthService.register.mockResolvedValue({
      id: "uuid-2",
      email: "coach@example.com",
      name: "Sam",
      role: "coach",
    });

    const res = await request(app).post("/api/auth/register").send({
      email: "coach@example.com",
      password: "SecurePass1",
      name: "Sam",
      role: "coach",
      coachingTitle: "Habit & Wellbeing Coach",
      specialties: ["Burnout recovery"],
      yearsExperience: 6,
    });

    expect(res.status).toBe(201);
    expect(res.body.data.role).toBe("coach");
    expect(mockAuthService.register).toHaveBeenCalledWith(
      expect.objectContaining({
        role: "coach",
        coachingTitle: "Habit & Wellbeing Coach",
        specialties: ["Burnout recovery"],
        yearsExperience: 6,
      }),
    );
  });

  it("rejects a coach signup with no coaching title", async () => {
    const res = await request(app).post("/api/auth/register").send({
      email: "coach@example.com",
      password: "SecurePass1",
      name: "Sam",
      role: "coach",
    });

    expect(res.status).toBe(422);
    expect(res.body.errors[0].field).toBe("coachingTitle");
    expect(mockAuthService.register).not.toHaveBeenCalled();
  });

  it("rejects a role that no longer exists", async () => {
    const res = await request(app).post("/api/auth/register").send({
      email: "alice@example.com",
      password: "SecurePass1",
      name: "Alice",
      role: "admin",
    });

    expect(res.status).toBe(422);
    expect(mockAuthService.register).not.toHaveBeenCalled();
  });
});

// ─── POST /api/auth/login ─────────────────────────────────────────────────────

describe("POST /api/auth/login", () => {
  it("returns 200 with the user, and sets tokens as httpOnly cookies (not in the body)", async () => {
    mockAuthService.login.mockResolvedValue({
      user: {
        id: "uuid-1",
        email: "alice@example.com",
        name: "Alice",
        role: "user",
      },
      accessToken: "access.token.here",
      refreshToken: "refresh.token.here",
    });

    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "alice@example.com", password: "SecurePass1" });

    expect(res.status).toBe(200);
    expect(res.body.data.user.email).toBe("alice@example.com");
    // Tokens are never exposed to client-side JS — they only ever travel as
    // httpOnly cookies, so the response body must not carry them at all.
    expect(res.body.data).not.toHaveProperty("accessToken");
    expect(res.body.data).not.toHaveProperty("refreshToken");

    const cookies = res.headers["set-cookie"] as unknown as string[];
    expect(cookies.some((c) => c.startsWith("accessToken=access.token.here"))).toBe(true);
    expect(cookies.some((c) => c.startsWith("refreshToken=refresh.token.here"))).toBe(true);
    expect(cookies.find((c) => c.startsWith("accessToken="))).toEqual(
      expect.stringContaining("HttpOnly"),
    );
    // The refresh cookie is scoped to /api/auth/refresh so it isn't sent on every request.
    expect(cookies.find((c) => c.startsWith("refreshToken="))).toEqual(
      expect.stringContaining("Path=/api/auth/refresh"),
    );
  });

  it("returns 422 when body is missing", async () => {
    const res = await request(app).post("/api/auth/login").send({});
    expect(res.status).toBe(422);
  });
});
