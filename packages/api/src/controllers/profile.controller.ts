import type { Request, Response, NextFunction } from "express";
import { profileService } from "../services/profile.service";

export const profileController = {
  async getProfile(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const profile = await profileService.getProfile(req.user!.userId);
      res.json({ data: profile });
    } catch (err) {
      next(err);
    }
  },

  async updateProfile(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const profile = await profileService.updateProfile(
        req.user!.userId,
        req.body,
      );
      res.json({ data: profile });
    } catch (err) {
      next(err);
    }
  },

  async completeOnboarding(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const profile = await profileService.completeOnboarding(
        req.user!.userId,
        req.body,
      );
      res.json({ data: profile });
    } catch (err) {
      next(err);
    }
  },
};