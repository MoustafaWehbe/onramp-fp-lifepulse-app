import type { Request, Response, NextFunction } from "express";
import { coachProfileService } from "../services/coach-profile.service";

export const coachProfileController = {
  async getMyProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const profile = await coachProfileService.getMyProfile(req.user!.userId);
      res.json({ data: profile });
    } catch (err) {
      next(err);
    }
  },

  async updateMyProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const profile = await coachProfileService.updateMyProfile(
        req.user!.userId,
        req.body,
      );
      res.json({ data: profile });
    } catch (err) {
      next(err);
    }
  },

  async addCredential(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const profile = await coachProfileService.addCredential(
        req.user!.userId,
        req.body,
      );
      res.status(201).json({ data: profile });
    } catch (err) {
      next(err);
    }
  },

  async removeCredential(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const credentialId = req.params.credentialId as string;
      const profile = await coachProfileService.removeCredential(
        req.user!.userId,
        credentialId,
      );
      res.json({ data: profile });
    } catch (err) {
      next(err);
    }
  },
};