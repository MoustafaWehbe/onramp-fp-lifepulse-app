import request from "supertest";
import { signAccessToken } from "../../../shared/auth/jwt";
import { app } from "../../app";

// Mock the DB so we don't need a real database in unit tests
jest.mock("../../src/lib/db", () => ({
  initializeDatabase: jest.fn().mockResolvedValue(undefined),
  getDatabase: jest.fn(),
}));

jest.mock("../../src/services/coach-requests.service", () => ({
  coachRequestsService: {
    createRequest: jest.fn(),
    listSent: jest.fn(),
    listReceived: jest.fn(),
    updateStatus: jest.fn(),
    updateSharing: jest.fn(),
    revoke: jest.fn(),
    getClientData: jest.fn(),
    updateClientHabit: jest.fn(),
  },
}));

jest.mock("../../src/services/coach-feedback.service", () => ({
  coachFeedbackService: {
    addFeedback: jest.fn(),
    listFeedback: jest.fn(),
  },
}));

import { coachRequestsService } from "../../src/services/coach-requests.service";
import { coachFeedbackService } from "../../src/services/coach-feedback.service";

const mockRequests = coachRequestsService as jest.Mocked<
  typeof coachRequestsService
>;
const mockFeedback = coachFeedbackService as jest.Mocked<
  typeof coachFeedbackService
>;

const USER_ID = "11111111-1111-4111-8111-111111111111";
const COACH_ID = "22222222-2222-4222-8222-222222222222";
const REQUEST_ID = "33333333-3333-4333-8333-333333333333";

function cookieFor(role: "user" | "coach") {
  const token = signAccessToken({
    userId: role === "coach" ? COACH_ID : USER_ID,
    email: `${role}@example.com`,
    role,
    sessionId: "44444444-4444-4444-8444-444444444444",
  });
  return `accessToken=${token}`;
}

const asUser = cookieFor("user");
const asCoach = cookieFor("coach");

const HABIT_ID = "55555555-5555-4555-8555-555555555555";

const sampleRequest = {
  id: REQUEST_ID,
  requesterId: USER_ID,
  coachId: COACH_ID,
  status: "accepted",
  shareHabits: true,
  shareProfile: false,
  editHabits: false,
};

beforeEach(() => {
  jest.clearAllMocks();
});

// ─── Client-only endpoints ────────────────────────────────────────────────────

describe("POST /api/coach-requests", () => {
  it("creates a request for a user", async () => {
    mockRequests.createRequest.mockResolvedValue(sampleRequest as never);

    const res = await request(app)
      .post("/api/coach-requests")
      .set("Cookie", asUser)
      .send({ coachId: COACH_ID, shareHabits: true, shareProfile: false });

    expect(res.status).toBe(201);
    expect(mockRequests.createRequest).toHaveBeenCalledWith(USER_ID, {
      coachId: COACH_ID,
      shareHabits: true,
      shareProfile: false,
      editHabits: false,
    });
  });

  it("refuses edit permission without habit visibility", async () => {
    const res = await request(app)
      .post("/api/coach-requests")
      .set("Cookie", asUser)
      .send({
        coachId: COACH_ID,
        shareHabits: false,
        shareProfile: true,
        editHabits: true,
      });

    expect(res.status).toBe(422);
    expect(res.body.errors[0].field).toBe("editHabits");
    expect(mockRequests.createRequest).not.toHaveBeenCalled();
  });

  it("refuses a coach — the coach experience has no client half", async () => {
    const res = await request(app)
      .post("/api/coach-requests")
      .set("Cookie", asCoach)
      .send({ coachId: COACH_ID, shareHabits: true, shareProfile: false });

    expect(res.status).toBe(403);
    expect(mockRequests.createRequest).not.toHaveBeenCalled();
  });

  it("requires authentication", async () => {
    const res = await request(app)
      .post("/api/coach-requests")
      .send({ coachId: COACH_ID });

    expect(res.status).toBe(401);
  });
});

describe("PATCH /api/coach-requests/:id/sharing", () => {
  it("updates what the requester shares", async () => {
    mockRequests.updateSharing.mockResolvedValue({
      ...sampleRequest,
      shareProfile: true,
    } as never);

    const res = await request(app)
      .patch(`/api/coach-requests/${REQUEST_ID}/sharing`)
      .set("Cookie", asUser)
      .send({ shareHabits: true, shareProfile: true, editHabits: true });

    expect(res.status).toBe(200);
    expect(mockRequests.updateSharing).toHaveBeenCalledWith(REQUEST_ID, USER_ID, {
      shareHabits: true,
      shareProfile: true,
      editHabits: true,
    });
  });

  it("refuses to leave edit permission behind when habits stop being shared", async () => {
    const res = await request(app)
      .patch(`/api/coach-requests/${REQUEST_ID}/sharing`)
      .set("Cookie", asUser)
      .send({ shareHabits: false, shareProfile: false, editHabits: true });

    expect(res.status).toBe(422);
    expect(mockRequests.updateSharing).not.toHaveBeenCalled();
  });

  it("rejects a partial grant — every flag must be stated", async () => {
    const res = await request(app)
      .patch(`/api/coach-requests/${REQUEST_ID}/sharing`)
      .set("Cookie", asUser)
      .send({ shareHabits: true });

    expect(res.status).toBe(422);
    expect(mockRequests.updateSharing).not.toHaveBeenCalled();
  });

  it("refuses a coach — the grant belongs to the client", async () => {
    const res = await request(app)
      .patch(`/api/coach-requests/${REQUEST_ID}/sharing`)
      .set("Cookie", asCoach)
      .send({ shareHabits: false, shareProfile: false, editHabits: false });

    expect(res.status).toBe(403);
    expect(mockRequests.updateSharing).not.toHaveBeenCalled();
  });
});

describe("DELETE /api/coach-requests/:id", () => {
  it("revokes the relationship and returns 204", async () => {
    mockRequests.revoke.mockResolvedValue(undefined);

    const res = await request(app)
      .delete(`/api/coach-requests/${REQUEST_ID}`)
      .set("Cookie", asUser);

    expect(res.status).toBe(204);
    expect(mockRequests.revoke).toHaveBeenCalledWith(REQUEST_ID, USER_ID);
  });

  it("refuses a coach — only the client can end the relationship", async () => {
    const res = await request(app)
      .delete(`/api/coach-requests/${REQUEST_ID}`)
      .set("Cookie", asCoach);

    expect(res.status).toBe(403);
    expect(mockRequests.revoke).not.toHaveBeenCalled();
  });
});

// ─── Coach-only endpoints ─────────────────────────────────────────────────────

describe("GET /api/coach-requests/received", () => {
  it("lists the coach's incoming requests", async () => {
    mockRequests.listReceived.mockResolvedValue([sampleRequest] as never);

    const res = await request(app)
      .get("/api/coach-requests/received")
      .set("Cookie", asCoach);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(mockRequests.listReceived).toHaveBeenCalledWith(COACH_ID);
  });

  it("refuses a user", async () => {
    const res = await request(app)
      .get("/api/coach-requests/received")
      .set("Cookie", asUser);

    expect(res.status).toBe(403);
    expect(mockRequests.listReceived).not.toHaveBeenCalled();
  });
});

describe("PATCH /api/coach-requests/:id", () => {
  it("lets the coach accept", async () => {
    mockRequests.updateStatus.mockResolvedValue(sampleRequest as never);

    const res = await request(app)
      .patch(`/api/coach-requests/${REQUEST_ID}`)
      .set("Cookie", asCoach)
      .send({ status: "accepted" });

    expect(res.status).toBe(200);
    expect(mockRequests.updateStatus).toHaveBeenCalledWith(
      REQUEST_ID,
      COACH_ID,
      "accepted",
    );
  });

  it("refuses a user accepting on the coach's behalf", async () => {
    const res = await request(app)
      .patch(`/api/coach-requests/${REQUEST_ID}`)
      .set("Cookie", asUser)
      .send({ status: "accepted" });

    expect(res.status).toBe(403);
    expect(mockRequests.updateStatus).not.toHaveBeenCalled();
  });
});

describe("GET /api/coach-requests/:id/client-data", () => {
  it("returns the shared data to the coach, grouped by life area", async () => {
    mockRequests.getClientData.mockResolvedValue({
      canEditHabits: true,
      windowDates: ["2026-08-01"],
      areas: [
        {
          id: "a1",
          name: "Health",
          color: "health",
          description: null,
          habits: [
            {
              id: "h1",
              areaId: "a1",
              name: "Walk",
              frequency: "daily",
              completionDates: ["2026-08-01"],
              currentStreak: 3,
            },
          ],
        },
      ],
    });

    const res = await request(app)
      .get(`/api/coach-requests/${REQUEST_ID}/client-data`)
      .set("Cookie", asCoach)
      .set("X-Timezone", "Europe/Paris");

    expect(res.status).toBe(200);
    expect(res.body.data.areas).toHaveLength(1);
    expect(res.body.data.areas[0].habits[0].name).toBe("Walk");
    // The caller's timezone decides where the 30-day window ends.
    expect(mockRequests.getClientData).toHaveBeenCalledWith(
      REQUEST_ID,
      COACH_ID,
      "Europe/Paris",
    );
  });

  it("refuses a user reading through the coach endpoint", async () => {
    const res = await request(app)
      .get(`/api/coach-requests/${REQUEST_ID}/client-data`)
      .set("Cookie", asUser);

    expect(res.status).toBe(403);
    expect(mockRequests.getClientData).not.toHaveBeenCalled();
  });
});

describe("PATCH /api/coach-requests/:id/habits/:habitId", () => {
  it("lets a coach adjust a client's habit", async () => {
    mockRequests.updateClientHabit.mockResolvedValue({
      id: HABIT_ID,
      name: "Morning walk",
      frequency: "3x",
    } as never);

    const res = await request(app)
      .patch(`/api/coach-requests/${REQUEST_ID}/habits/${HABIT_ID}`)
      .set("Cookie", asCoach)
      .send({ frequency: "3x", durationMinutes: 25 });

    expect(res.status).toBe(200);
    expect(mockRequests.updateClientHabit).toHaveBeenCalledWith(
      REQUEST_ID,
      COACH_ID,
      HABIT_ID,
      { frequency: "3x", durationMinutes: 25 },
    );
  });

  it("refuses a user editing through the coach endpoint", async () => {
    const res = await request(app)
      .patch(`/api/coach-requests/${REQUEST_ID}/habits/${HABIT_ID}`)
      .set("Cookie", asUser)
      .send({ name: "Renamed by the wrong person" });

    expect(res.status).toBe(403);
    expect(mockRequests.updateClientHabit).not.toHaveBeenCalled();
  });

  it("rejects fields a coach may not touch", async () => {
    // Reminders and the habit's life area belong to the client. An unknown key
    // is stripped by the schema rather than forwarded, so the service never
    // sees an attempt to set one.
    const res = await request(app)
      .patch(`/api/coach-requests/${REQUEST_ID}/habits/${HABIT_ID}`)
      .set("Cookie", asCoach)
      .send({ name: "Morning walk", reminderTime: "07:00", areaId: REQUEST_ID });

    expect(res.status).toBe(200);
    expect(mockRequests.updateClientHabit).toHaveBeenCalledWith(
      REQUEST_ID,
      COACH_ID,
      HABIT_ID,
      { name: "Morning walk" },
    );
  });

  it("rejects an empty patch", async () => {
    const res = await request(app)
      .patch(`/api/coach-requests/${REQUEST_ID}/habits/${HABIT_ID}`)
      .set("Cookie", asCoach)
      .send({});

    expect(res.status).toBe(422);
    expect(mockRequests.updateClientHabit).not.toHaveBeenCalled();
  });

  it("rejects a frequency the app doesn't have", async () => {
    const res = await request(app)
      .patch(`/api/coach-requests/${REQUEST_ID}/habits/${HABIT_ID}`)
      .set("Cookie", asCoach)
      .send({ frequency: "hourly" });

    expect(res.status).toBe(422);
    expect(mockRequests.updateClientHabit).not.toHaveBeenCalled();
  });

  it("surfaces the service's refusal when the client withdrew edit access", async () => {
    mockRequests.updateClientHabit.mockRejectedValue(
      Object.assign(new Error("This client has not given you permission to edit their habits"), {
        statusCode: 403,
      }),
    );

    const res = await request(app)
      .patch(`/api/coach-requests/${REQUEST_ID}/habits/${HABIT_ID}`)
      .set("Cookie", asCoach)
      .send({ name: "Evening walk" });

    expect(res.status).toBe(403);
  });
});

// ─── Feedback: written by the coach, read by both ─────────────────────────────

describe("/api/coach-requests/:id/feedback", () => {
  it("lets the coach add a note", async () => {
    mockFeedback.addFeedback.mockResolvedValue({
      id: "f1",
      body: "Nice consistency this week.",
    } as never);

    const res = await request(app)
      .post(`/api/coach-requests/${REQUEST_ID}/feedback`)
      .set("Cookie", asCoach)
      .send({ body: "Nice consistency this week." });

    expect(res.status).toBe(201);
    expect(mockFeedback.addFeedback).toHaveBeenCalledWith(
      REQUEST_ID,
      COACH_ID,
      "Nice consistency this week.",
    );
  });

  it("refuses a user writing feedback to themselves", async () => {
    const res = await request(app)
      .post(`/api/coach-requests/${REQUEST_ID}/feedback`)
      .set("Cookie", asUser)
      .send({ body: "Doing great!" });

    expect(res.status).toBe(403);
    expect(mockFeedback.addFeedback).not.toHaveBeenCalled();
  });

  it("lets the client read the thread", async () => {
    mockFeedback.listFeedback.mockResolvedValue([] as never);

    const res = await request(app)
      .get(`/api/coach-requests/${REQUEST_ID}/feedback`)
      .set("Cookie", asUser);

    expect(res.status).toBe(200);
    expect(mockFeedback.listFeedback).toHaveBeenCalledWith(REQUEST_ID, USER_ID);
  });
});
