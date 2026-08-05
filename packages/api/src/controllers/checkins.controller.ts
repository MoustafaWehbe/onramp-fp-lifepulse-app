import type { Request, Response, NextFunction } from "express";
import { checkInsService } from "../services/checkins.service";

export const checkInsController = {
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { from, to, habitId } = req.query as {
        from?: string;
        to?: string;
        habitId?: string;
      };
      const checkIns = await checkInsService.list(req.user!.userId, { from, to, habitId });
      res.json({ data: checkIns });
    } catch (err) {
      next(err);
    }
  },

  async today(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const checkIns = await checkInsService.today(req.user!.userId);
      res.json({ data: checkIns });
    } catch (err) {
      next(err);
    }
  },

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { checkIn, created } = await checkInsService.create(req.user!.userId, req.body);
      res.status(created ? 201 : 200).json({ data: checkIn });
    } catch (err) {
      next(err);
    }
  },

  async remove(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await checkInsService.remove(req.user!.userId, req.params.id);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },
};
