import type { Request, Response, NextFunction } from "express";
import { adminService } from "../services/admin.service";

export const adminController = {
  async listUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const users = await adminService.listUsers();
      res.json({ data: users });
    } catch (err) {
      next(err);
    }
  },

  async updateUserRole(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.params.id as string;
      const user = await adminService.updateUserRole(userId, req.body.role);
      res.json({ data: user });
    } catch (err) {
      next(err);
    }
  },

  async listCoachApplicants(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const status = req.query.status as
        | "pending"
        | "verified"
        | "rejected"
        | undefined;
      const applicants = await adminService.listCoachApplicants(status);
      res.json({ data: applicants });
    } catch (err) {
      next(err);
    }
  },

  async updateCoachVerification(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.params.id as string;
      const profile = await adminService.updateCoachVerification(
        userId,
        req.body.verificationStatus,
      );
      res.json({ data: profile });
    } catch (err) {
      next(err);
    }
  },

  async updateCredentialVerification(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const credentialId = req.params.credentialId as string;
      const credential = await adminService.updateCredentialVerification(
        credentialId,
        req.body.verified,
      );
      res.json({ data: credential });
    } catch (err) {
      next(err);
    }
  },
};