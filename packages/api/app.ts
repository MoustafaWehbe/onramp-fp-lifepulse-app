import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import swaggerUi from "swagger-ui-express";
import yaml from "js-yaml";
import fs from "fs";
import path from "path";
import cookieParser from "cookie-parser";
import { errorHandler } from "./src/middleware/error-handler";
import { originGuard } from "./src/middleware/origin-guard";
import { rateLimiter } from "./src/middleware/rate-limiter";
import { csrfProtection } from "./src/middleware/csrf";
import { authenticate } from "./src/middleware/authenticate";
import { authorize } from "./src/middleware/authorize";
import { router } from "./src/routes";
import { healthReport } from "./src/lib/health";

const app = express();

// ─── Proxy awareness ──────────────────────────────────────────────────────────
// In production this process sits behind CloudFront, so the socket peer is an
// edge server rather than the user. Without this, req.ip resolves to that edge
// server and every user in a region shares a single rate-limit bucket — the API
// would start 429-ing under trivial load. express-rate-limit also refuses to
// start (ERR_ERL_UNEXPECTED_X_FORWARDED_FOR) when it sees a forwarded header it
// has been told not to trust.
//
// Exactly one hop: CloudFront is the only proxy, and it overwrites
// X-Forwarded-For with the real viewer address.
app.set("trust proxy", 1);

// ─── Security ─────────────────────────────────────────────────────────────────
// Behind a reverse proxy (nginx, a load balancer) req.ip is otherwise the
// proxy's address, which would make rate limiting global and record the wrong
// IP on every session.
if (process.env.TRUST_PROXY !== "false") {
  app.set("trust proxy", Number(process.env.TRUST_PROXY ?? 1));
}

app.use(helmet());
app.use(originGuard);
app.use(
  cors({
    origin: process.env.CORS_ORIGIN ?? "http://localhost:5173",
    credentials: true,
  }),
);

// ─── Cookie parsing ───────────────────────────────────────────────────────────
app.use(cookieParser());

// ─── Body parsing ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

// ─── Logging ──────────────────────────────────────────────────────────────────
if (process.env.NODE_ENV !== "test") {
  // Health probes fire constantly and would otherwise drown out real traffic.
  app.use(morgan("dev", { skip: (req) => req.url.startsWith("/health") }));
}

// ─── Rate limiting ────────────────────────────────────────────────────────────
app.use("/api/", rateLimiter);

// ─── CSRF ─────────────────────────────────────────────────────────────────────
// Auth rides on cookies, which browsers attach to cross-site requests too.
app.use("/api", csrfProtection);

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use("/api", router);

// ─── OpenAPI / Swagger UI ─────────────────────────────────────────────────────
const openApiSpec = yaml.load(
  fs.readFileSync(path.join(__dirname, "openapi.yaml"), "utf8"),
) as object;

// The schema enumerates every endpoint and payload shape — handy in dev, free
// reconnaissance in production.
const docsGuard =
  process.env.NODE_ENV === "production"
    ? [authenticate, authorize("admin")]
    : ([] as never[]);

app.get("/api/openapi.yaml", ...docsGuard, (_req, res) =>
  res.sendFile(path.join(__dirname, "openapi.yaml")),
);
app.use(
  "/api/docs",
  ...docsGuard,
  swaggerUi.serve,
  swaggerUi.setup(openApiSpec),
);

// ─── Health checks ────────────────────────────────────────────────────────────
// Liveness: is the process up at all? Never touches a dependency, so a database
// blip can't get the container killed and restarted into the same blip.
app.get("/health/live", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Readiness: can this instance actually serve traffic? 503 pulls it out of the
// load balancer rotation while Postgres or Redis is unreachable.
app.get("/health", async (_req, res, next) => {
  try {
    const report = await healthReport();
    res.status(report.status === "ok" ? 200 : 503).json(report);
  } catch (error) {
    next(error);
  }
});

// ─── Error handling (must be last) ────────────────────────────────────────────
app.use(errorHandler);

export { app };
