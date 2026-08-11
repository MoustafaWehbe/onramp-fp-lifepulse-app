import type { Request } from "express";
import rateLimit from "express-rate-limit";

export const rateLimiter = rateLimit({
  windowMs: 15 * 60 * 1_000, // 15 minutes
  max: 100,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later." },
});

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1_000,
  max: 10, // stricter limit for auth endpoints
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    error: "Too many authentication attempts, please try again later.",
  },
});

/**
 * Guards POST /ai/suggestions against rapid double-clicks / retry bursts.
 * This is a request-throttle safety net, not the real cost control — the
 * actual "one batch per user per hour" business rule lives in
 * ai-suggestions.service.ts's DB-backed cooldown, which only records a
 * timestamp once a batch is *successfully* generated. Without this limiter,
 * several quick clicks could all sneak past that check simultaneously
 * (since none of them has written a row yet) and fire off multiple
 * concurrent OpenAI calls. Keyed by user id (route runs behind
 * `authenticate`), not IP, so it can't be triggered by other users sharing
 * a NAT/office network.
 */
export const aiGenerateRateLimiter = rateLimit({
  windowMs: 5 * 60 * 1_000, // 5 minutes
  max: 5,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  keyGenerator: (req: Request) => req.user?.userId ?? req.ip ?? "unknown",
  message: {
    error: "Too many generation attempts, please slow down and try again shortly.",
  },
});
