import type { Request, Response, NextFunction } from "express";
import { notificationsService } from "../services/notifications.service";

/** Minimal self-contained page shown after a one-click email unsubscribe. */
function unsubscribeConfirmationPage(appUrl: string): string {
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Unsubscribed</title>
  </head>
  <body style="margin:0;display:flex;min-height:100vh;align-items:center;justify-content:center;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0f172a;">
    <div style="max-width:420px;padding:32px;text-align:center;">
      <h1 style="font-size:20px;margin:0 0 12px;">You're unsubscribed</h1>
      <p style="font-size:15px;line-height:1.6;color:#475569;margin:0 0 24px;">
        We won't email you reminders or check-in nudges anymore. Your habits and history are untouched,
        and you can turn emails back on any time from your profile.
      </p>
      <a href="${appUrl}/profile" style="display:inline-block;background:#16a34a;color:#fff;text-decoration:none;font-weight:600;padding:12px 24px;border-radius:8px;">Back to Kultivar</a>
    </div>
  </body>
</html>`;
}

export const notificationsController = {
  async getPreferences(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const preferences = await notificationsService.getPreferences(req.user!.userId);
      res.json({ data: preferences });
    } catch (err) {
      next(err);
    }
  },

  async updatePreferences(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const preferences = await notificationsService.updatePreferences(
        req.user!.userId,
        req.body,
      );
      res.json({ data: preferences });
    } catch (err) {
      next(err);
    }
  },

  async sendDemoEncouragement(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const result = await notificationsService.sendDemoEncouragement(req.user!.userId);
      res.status(202).json({ data: result });
    } catch (err) {
      next(err);
    }
  },

  async unsubscribeByToken(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { token } = req.query as { token: string };
      await notificationsService.unsubscribeByToken(token);
      const appUrl = (process.env.APP_URL ?? "http://localhost:5173").replace(/\/+$/, "");
      res.status(200).type("html").send(unsubscribeConfirmationPage(appUrl));
    } catch (err) {
      next(err);
    }
  },
};
