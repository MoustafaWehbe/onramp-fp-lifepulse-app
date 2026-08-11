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
import { router } from "./src/routes";

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
  app.use(morgan("dev"));
}

// ─── Rate limiting ────────────────────────────────────────────────────────────
app.use("/api/", rateLimiter);

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use("/api", router);

// ─── OpenAPI / Swagger UI ─────────────────────────────────────────────────────
const openApiSpec = yaml.load(
  fs.readFileSync(path.join(__dirname, "openapi.yaml"), "utf8"),
) as object;
app.get("/api/openapi.yaml", (_req, res) =>
  res.sendFile(path.join(__dirname, "openapi.yaml")),
);
app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(openApiSpec));



// ─── Health check ─────────────────────────────────────────────────────────────
app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ─── Error handling (must be last) ────────────────────────────────────────────
app.use(errorHandler);

export { app };
