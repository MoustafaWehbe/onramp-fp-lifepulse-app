import type { Request, Response, NextFunction } from "express";
import { coachesService } from "../services/coaches.service";

export const coachesController = {
  async listCoaches(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const coaches = await coachesService.listCoaches();

      res.json({ data: coaches });
    } catch (err) {
      next(err);
    }
  },

  async getCoach(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const coachId = Array.isArray(req.params.id)
        ? req.params.id[0]
        : req.params.id;

      if (!coachId) {
        res.status(400).json({
          message: "Coach ID is required",
        });
        return;
      }

      const coach = await coachesService.getCoach(coachId);

      res.json({ data: coach });
    } catch (err) {
      next(err);
    }
  },
};