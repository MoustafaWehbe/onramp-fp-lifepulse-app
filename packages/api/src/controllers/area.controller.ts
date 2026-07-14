import type { Request, Response, NextFunction } from "express";
import { areaService } from "../services/area.service";

export const areaController = {
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const areas = await areaService.list(req.user!.userId);
      res.json({ data: areas });
    } catch (err) {
      next(err);
    }
  },

  async get(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const area = await areaService.getById(req.user!.userId, req.params.id);
      res.json({ data: area });
    } catch (err) {
      next(err);
    }
  },

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const area = await areaService.create(req.user!.userId, req.body);
      res.status(201).json({ data: area });
    } catch (err) {
      next(err);
    }
  },

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const area = await areaService.update(
        req.user!.userId,
        req.params.id,
        req.body,
      );
      res.json({ data: area });
    } catch (err) {
      next(err);
    }
  },

  async remove(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await areaService.remove(req.user!.userId, req.params.id);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },
};
