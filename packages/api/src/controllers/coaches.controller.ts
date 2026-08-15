import type { Request, Response, NextFunction } from "express";
import { coachesService } from "../services/coaches.service";

export const coachesController = {
  async listCoaches(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const coaches = await coachesService.listCoaches();
      res.json({ data: coaches });
    } catch (err) {
      next(err);
    }
  },
};