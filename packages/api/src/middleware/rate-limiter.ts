import type { Request } from "express";
import rateLimit, { type Options } from "express-rate-limit";
import { RedisRateLimitStore } from "../lib/redis-rate-limit-store";

/**
 * Tests run without a Redis server, and the in-memory store is fine there since
 * there's only ever one process.
 */
function makeLimiter(prefix: string, options: Partial<Options>) {
  return rateLimit({
    standardHeaders: "draft-7",
    legacyHeaders: false,
    ...(process.env.NODE_ENV === "test"
      ? {}
      : { store: new RedisRateLimitStore(prefix) }),
    ...options,
  });
}

/**
 * A crude abuse guard on total traffic per IP, not a per-user quota. The
 * ceiling has to account for a single-page app: one screen can fan out into a
 * dozen requests, React Query refetches on window focus, and every tab shares
 * the caller's IP. Anything near 100/15min throttles ordinary use — and because
 * the counter now lives in Redis it survives restarts, so a too-low limit locks
 * a real person out for the rest of the window.
 */
export const rateLimiter = makeLimiter("global", {
  windowMs: 15 * 60 * 1_000, // 15 minutes
  max: Number(process.env.RATE_LIMIT_MAX ?? 1_000),
  message: { error: "Too many requests, please try again later." },
});

export const authRateLimiter = makeLimiter("auth", {
  windowMs: 15 * 60 * 1_000,
  max: 10, // stricter limit for auth endpoints
  message: {
    error: "Too many authentication attempts, please try again later.",
  },
});

/**
 * Refresh is unauthenticated (it's the cookie itself that authenticates) and
 * mints new tokens, so an unthrottled endpoint is a free oracle for anyone
 * testing stolen refresh cookies. The ceiling is generous because a legitimate
 * client only refreshes every ~15 minutes.
 */
export const refreshRateLimiter = makeLimiter("refresh", {
  windowMs: 15 * 60 * 1_000,
  max: 30,
  message: { error: "Too many refresh attempts, please try again later." },
});

/**
 * Catches concurrent clicks that would all pass ai-suggestions.service.ts's
 * hourly cooldown at once (none has written its timestamp row yet) and fire
 * off parallel OpenAI calls. Keyed by user id, not IP, so users behind one
 * NAT can't throttle each other.
 */
export const aiGenerateRateLimiter = makeLimiter("ai-generate", {
  windowMs: 5 * 60 * 1_000, // 5 minutes
  max: 5,
  keyGenerator: (req: Request) => req.user?.userId ?? req.ip ?? "unknown",
  message: {
    error: "Too many generation attempts, please slow down and try again shortly.",
  },
});
