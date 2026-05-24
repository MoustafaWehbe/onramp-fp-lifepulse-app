import type { Request, Response, NextFunction } from "express";
import { authService } from "../services/auth.service";

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
      const result = await authService.login({
        ...req.body,
        userAgent: req.headers["user-agent"],
        ipAddress: req.ip,
      });
      res.json({ data: result });
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
      const { refreshToken } = req.body as { refreshToken: string };
      const tokens = await authService.refresh(refreshToken);
      res.json({ data: tokens });
    } catch (err) {
      next(err);
    }
  },

  async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (req.user?.sessionId) {
        await authService.logout(req.user.sessionId);
      }
      res.json({ data: { message: "Logged out successfully" } });
    } catch (err) {
      next(err);
    }
  },

  async me(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await authService.getProfile(req.user!.userId);
      res.json({ data: user });
    } catch (err) {
      next(err);
    }
  },
};
