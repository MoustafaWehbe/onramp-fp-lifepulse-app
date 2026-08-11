import type { Request, Response, NextFunction } from "express";
import { aiSuggestionsService } from "../services/ai-suggestions.service";

export const aiSuggestionsController = {
  async generate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const suggestions = await aiSuggestionsService.generate(req.user!.userId);
      res.status(201).json({ data: suggestions });
    } catch (err) {
      next(err);
    }
  },

  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const suggestions = await aiSuggestionsService.list(req.user!.userId);
      res.json({ data: suggestions });
    } catch (err) {
      next(err);
    }
  },

  async accept(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const suggestion = await aiSuggestionsService.accept(req.user!.userId, req.params.id);
      res.json({ data: suggestion });
    } catch (err) {
      next(err);
    }
  },

  async acceptAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const suggestions = await aiSuggestionsService.acceptAll(req.user!.userId);
      res.json({ data: suggestions });
    } catch (err) {
      next(err);
    }
  },

  async dismiss(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const suggestion = await aiSuggestionsService.dismiss(req.user!.userId, req.params.id);
      res.json({ data: suggestion });
    } catch (err) {
      next(err);
    }
  },
};
