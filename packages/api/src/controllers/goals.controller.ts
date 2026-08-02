import type { Request, Response, NextFunction } from "express";
import { goalsService } from "../services/goals.service";

export const goalsController = {
  async listGoals(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const goals = await goalsService.listGoals();
      res.json({ data: goals });
    } catch (err) {
      next(err);
    }
  },
};