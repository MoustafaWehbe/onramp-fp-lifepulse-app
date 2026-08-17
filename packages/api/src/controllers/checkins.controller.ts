import type { Request, Response, NextFunction } from "express";
import { checkInsService } from "../services/checkins.service";
import { pathParam } from "../lib/request";

/** Browser-resolved IANA timezone sent by the frontend, used as a fallback
 * "today" boundary for habits that don't have their own timezone set. */
function clientTimezone(req: Request): string | undefined {
  const header = req.get("x-timezone");
  return header && header.trim() ? header.trim() : undefined;
}

export const checkInsController = {
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { from, to, habitId } = req.query as {
        from?: string;
        to?: string;
        habitId?: string;
      };
      const checkIns = await checkInsService.list(
        req.user!.userId,
        { from, to, habitId },
        clientTimezone(req),
      );
      res.json({ data: checkIns });
    } catch (err) {
      next(err);
    }
  },

  async today(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const checkIns = await checkInsService.today(req.user!.userId, clientTimezone(req));
      res.json({ data: checkIns });
    } catch (err) {
      next(err);
    }
  },

  async activity(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const activity = await checkInsService.activity(
        req.user!.userId,
        clientTimezone(req),
      );
      res.json({ data: activity });
    } catch (err) {
      next(err);
    }
  },

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { checkIn, created } = await checkInsService.create(
        req.user!.userId,
        req.body,
        clientTimezone(req),
      );
      res.status(created ? 201 : 200).json({ data: checkIn });
    } catch (err) {
      next(err);
    }
  },

  async remove(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await checkInsService.remove(req.user!.userId, pathParam(req, "id"));
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },
};
