import type { Request, Response, NextFunction } from "express";
import { authService } from "../services/auth.service";
import { CSRF_COOKIE, clearCsrfToken, issueCsrfToken } from "../middleware/csrf";

const isProduction = process.env.NODE_ENV === "production";

const ACCESS_COOKIE = "accessToken";
const REFRESH_COOKIE = "refreshToken";

const ACCESS_MAX_AGE = 15 * 60 * 1000; // 15 minutes
const REFRESH_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days

function setAuthCookies(
  res: Response,
  accessToken: string,
  refreshToken: string,
): void {
  res.cookie(ACCESS_COOKIE, accessToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    path: "/api",
    maxAge: ACCESS_MAX_AGE,
  });
  res.cookie(REFRESH_COOKIE, refreshToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    path: "/api/auth/refresh",
    maxAge: REFRESH_MAX_AGE,
  });
  issueCsrfToken(res);
}

function clearAuthCookies(res: Response): void {
  res.clearCookie(ACCESS_COOKIE, { path: "/api" });
  res.clearCookie(REFRESH_COOKIE, { path: "/api/auth/refresh" });
  clearCsrfToken(res);
}

export const authController = {
  async register(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const user = await authService.register(req.body);
      res.status(201).json({ data: user });
    } catch (err) {
      next(err);
    }
  },

  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { user, accessToken, refreshToken } = await authService.login({
        ...req.body,
        userAgent: req.headers["user-agent"],
        ipAddress: req.ip,
      });
      setAuthCookies(res, accessToken, refreshToken);
      res.json({ data: { user } });
    } catch (err) {
      next(err);
    }
  },

  async refresh(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const refreshToken = req.cookies?.[REFRESH_COOKIE] as string | undefined;
      if (!refreshToken) {
        res.status(401).json({ error: "Missing refresh token" });
        return;
      }
      const tokens = await authService.refresh(refreshToken);
      setAuthCookies(res, tokens.accessToken, tokens.refreshToken);
      res.json({ data: { message: "Token refreshed" } });
    } catch (err) {
      next(err);
    }
  },

  async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (req.user?.sessionId) {
        await authService.logout(req.user.sessionId);
      }
      clearAuthCookies(res);
      res.json({ data: { message: "Logged out successfully" } });
    } catch (err) {
      next(err);
    }
  },

  async me(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await authService.getProfile(req.user!.userId);
      // Sessions outlive the CSRF cookie's browser lifetime in some cases (and
      // predate this feature entirely), so reissue on the session probe rather
      // than forcing a re-login.
      if (!req.cookies?.[CSRF_COOKIE]) issueCsrfToken(res);
      res.json({ data: user });
    } catch (err) {
      next(err);
    }
  },
};
