import express from "express";
import cookieParser from "cookie-parser";
import request from "supertest";
import { csrfProtection, issueCsrfToken, CSRF_COOKIE } from "../../src/middleware/csrf";

// The middleware short-circuits under NODE_ENV=test so the controller suites can
// use supertest without a cookie jar; this suite exercises the real behaviour.
function buildApp(): express.Express {
  const app = express();
  app.use(cookieParser());
  app.use(express.json());
  app.get("/token", (_req, res) => {
    res.json({ token: issueCsrfToken(res) });
  });
  app.use(csrfProtection);
  app.get("/safe", (_req, res) => res.json({ ok: true }));
  app.post("/auth/login", (_req, res) => res.json({ ok: true }));
  app.post("/guarded", (_req, res) => res.json({ ok: true }));
  return app;
}

const app = buildApp();
const originalEnv = process.env.NODE_ENV;

beforeAll(() => {
  process.env.NODE_ENV = "development";
});

afterAll(() => {
  process.env.NODE_ENV = originalEnv;
});

describe("csrfProtection", () => {
  it("allows safe methods without a token", async () => {
    const res = await request(app).get("/safe");
    expect(res.status).toBe(200);
  });

  it("allows exempt paths that run before a session exists", async () => {
    const res = await request(app).post("/auth/login");
    expect(res.status).toBe(200);
  });

  it("rejects a state-changing request with no token at all", async () => {
    const res = await request(app).post("/guarded");
    expect(res.status).toBe(403);
  });

  it("rejects a header that does not match the cookie", async () => {
    const res = await request(app)
      .post("/guarded")
      .set("Cookie", `${CSRF_COOKIE}=aaaaaaaa`)
      .set("x-csrf-token", "bbbbbbbb");
    expect(res.status).toBe(403);
  });

  it("rejects a cookie with no matching header", async () => {
    const res = await request(app)
      .post("/guarded")
      .set("Cookie", `${CSRF_COOKIE}=aaaaaaaa`);
    expect(res.status).toBe(403);
  });

  it("accepts a header that matches the issued cookie", async () => {
    const issued = await request(app).get("/token");
    const token = issued.body.token as string;

    const res = await request(app)
      .post("/guarded")
      .set("Cookie", `${CSRF_COOKIE}=${token}`)
      .set("x-csrf-token", token);

    expect(res.status).toBe(200);
  });
});
