import type { Request, Response, NextFunction } from "express";
import { coachRequestsService } from "../services/coach-requests.service";
import { coachFeedbackService } from "../services/coach-feedback.service";
export const coachRequestsController = {
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const request = await coachRequestsService.createRequest(
        req.user!.userId,
        req.body,
      );
      res.status(201).json({ data: request });
    } catch (err) {
      next(err);
    }
  },

  async listSent(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const requests = await coachRequestsService.listSent(req.user!.userId);
      res.json({ data: requests });
    } catch (err) {
      next(err);
    }
  },

  async updateSharing(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const requestId = req.params.id as string;
      const request = await coachRequestsService.updateSharing(
        requestId,
        req.user!.userId,
        req.body,
      );
      res.json({ data: request });
    } catch (err) {
      next(err);
    }
  },

  async revoke(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const requestId = req.params.id as string;
      await coachRequestsService.revoke(requestId, req.user!.userId);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },

  async listReceived(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const requests = await coachRequestsService.listReceived(req.user!.userId);
      res.json({ data: requests });
    } catch (err) {
      next(err);
    }
  },

  async updateStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const requestId = req.params.id as string;
      const request = await coachRequestsService.updateStatus(
        requestId,
        req.user!.userId,
        req.body.status,
      );
      res.json({ data: request });
    } catch (err) {
      next(err);
    }
  },

  async getClientData(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const requestId = req.params.id as string;
      const data = await coachRequestsService.getClientData(
        requestId,
        req.user!.userId,
        req.get("x-timezone") ?? undefined,
      );
      res.json({ data });
    } catch (err) {
      next(err);
    }
  },

  async updateClientHabit(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id, habitId } = req.params as { id: string; habitId: string };
      const habit = await coachRequestsService.updateClientHabit(
        id,
        req.user!.userId,
        habitId,
        req.body,
      );
      res.json({ data: habit });
    } catch (err) {
      next(err);
    }
  },

  async addFeedback(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const requestId = req.params.id as string;
      const feedback = await coachFeedbackService.addFeedback(
        requestId,
        req.user!.userId,
        req.body.body,
      );
      res.status(201).json({ data: feedback });
    } catch (err) {
      next(err);
    }
  },

  async listFeedback(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const requestId = req.params.id as string;
      const feedback = await coachFeedbackService.listFeedback(requestId, req.user!.userId);
      res.json({ data: feedback });
    } catch (err) {
      next(err);
    }
  },
};