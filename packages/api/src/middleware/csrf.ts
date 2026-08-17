import crypto from "crypto";
import type { Request, Response, NextFunction } from "express";

export const CSRF_COOKIE = "csrfToken";
const CSRF_HEADER = "x-csrf-token";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/**
 * Endpoints reached without an existing session, so there is no cookie to
 * forge yet. `/auth/refresh` is included because a browser that has lost its
 * CSRF cookie still needs a way back in; it is protected instead by the
 * refresh cookie's narrow `path` scope and its own rate limiter.
 */
const EXEMPT_PATHS = new Set([
  "/auth/register",
  "/auth/login",
  "/auth/refresh",
  "/notifications/unsubscribe",
]);

/**
 * Double-submit cookie: the token is readable by our own JavaScript and echoed
 * back in a header, which a cross-origin page cannot do because it can neither
 * read our cookies nor set custom headers on a simple form post.
 */
export function issueCsrfToken(res: Response): string {
  const token = crypto.randomBytes(32).toString("base64url");
  res.cookie(CSRF_COOKIE, token, {
    // Deliberately readable: the client has to copy it into the header.
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 7 * 24 * 60 * 60 * 1_000,
  });
  return token;
}

export function clearCsrfToken(res: Response): void {
  res.clearCookie(CSRF_COOKIE, { path: "/" });
}

function matches(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

export function csrfProtection(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  // Controller tests drive the app through supertest, which has no cookie jar
  // to seed the token from. The middleware itself is covered by csrf.test.ts.
  if (process.env.NODE_ENV === "test") {
    next();
    return;
  }

  if (SAFE_METHODS.has(req.method) || EXEMPT_PATHS.has(req.path)) {
    next();
    return;
  }

  const cookieToken = req.cookies?.[CSRF_COOKIE] as string | undefined;
  const headerToken = req.get(CSRF_HEADER);

  if (!cookieToken || !headerToken || !matches(cookieToken, headerToken)) {
    res.status(403).json({ error: "Invalid or missing CSRF token" });
    return;
  }

  next();
}
