import type { Request, Response, NextFunction } from "express";
import { habitsService } from "../services/habits.service";

export const habitsController = {
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { areaId, includeArchived } = req.query as {
        areaId?: string;
        includeArchived?: string;
      };
      const habits = await habitsService.list(req.user!.userId, {
        areaId,
        includeArchived: includeArchived === "true",
      });
      res.json({ data: habits });
    } catch (err) {
      next(err);
    }
  },

  async get(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const habit = await habitsService.getById(req.user!.userId, req.params.id);
      res.json({ data: habit });
    } catch (err) {
      next(err);
    }
  },

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const habit = await habitsService.create(req.user!.userId, req.body);
      res.status(201).json({ data: habit });
    } catch (err) {
      next(err);
    }
  },

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const habit = await habitsService.update(
        req.user!.userId,
        req.params.id,
        req.body,
      );
      res.json({ data: habit });
    } catch (err) {
      next(err);
    }
  },

  async remove(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await habitsService.remove(req.user!.userId, req.params.id);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },

  async archive(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const habit = await habitsService.archive(req.user!.userId, req.params.id);
      res.json({ data: habit });
    } catch (err) {
      next(err);
    }
  },

  async restore(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const habit = await habitsService.restore(req.user!.userId, req.params.id);
      res.json({ data: habit });
    } catch (err) {
      next(err);
    }
  },
};
