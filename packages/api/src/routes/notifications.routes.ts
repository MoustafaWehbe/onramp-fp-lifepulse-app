import { Router } from "express";
import rateLimit from "express-rate-limit";
import { notificationsController } from "../controllers/notifications.controller";
import { validate } from "../middleware/validate";
import { authenticate } from "../middleware/authenticate";
import {
  updatePreferencesSchema,
  unsubscribeQuerySchema,
} from "../schemas/notifications.schemas";

const router = Router();

/**
 * Unauthenticated because it's clicked from an email client, so it needs its
 * own limiter — the token is unguessable, but this stops enumeration attempts.
 * Registered before `authenticate` so the rest of the router stays protected.
 */
const unsubscribeRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1_000,
  max: 20,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later." },
});

router.get(
  "/unsubscribe",
  unsubscribeRateLimiter,
  validate(unsubscribeQuerySchema, "query"),
  notificationsController.unsubscribeByToken,
);

router.use(authenticate);

router.get("/preferences", notificationsController.getPreferences);
router.patch(
  "/preferences",
  validate(updatePreferencesSchema),
  notificationsController.updatePreferences,
);

/**
 * Demo-only: emails the caller the encouragement message on demand, skipping
 * the 30-day lapse it normally requires. Registered only outside production so
 * a live deployment can't be used to bypass the send rules.
 */
if (process.env.NODE_ENV !== "production") {
  router.post(
    "/demo/encouragement",
    rateLimit({
      windowMs: 60 * 1_000,
      max: 5,
      standardHeaders: "draft-7",
      legacyHeaders: false,
      message: { error: "Slow down — wait a moment before sending another." },
    }),
    notificationsController.sendDemoEncouragement,
  );
}

export { router as notificationsRouter };
