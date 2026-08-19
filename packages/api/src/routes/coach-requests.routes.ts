import { Router } from "express";
import { coachRequestsController } from "../controllers/coach-requests.controller";
import { validate } from "../middleware/validate";
import { authenticate } from "../middleware/authenticate";
import { authorize } from "../middleware/authorize";
import {
  createCoachRequestSchema,
  updateCoachRequestStatusSchema,
  updateSharingSchema,
  coachUpdateHabitSchema,
  clientHabitParamsSchema,
} from "../schemas/coach-requests.schemas";
import { createFeedbackSchema } from "../schemas/coach-feedback.schemas";

const router = Router();

router.use(authenticate);

// ─── Client side ──────────────────────────────────────────────────────────────
// Coaches are excluded: the coach experience has no client half, and letting a
// coach grant themselves a coaching relationship would muddy the data model.
router.post(
  "/",
  authorize("user"),
  validate(createCoachRequestSchema),
  coachRequestsController.create,
);
router.get("/sent", authorize("user"), coachRequestsController.listSent);
router.patch(
  "/:id/sharing",
  authorize("user"),
  validate(updateSharingSchema),
  coachRequestsController.updateSharing,
);
router.delete("/:id", authorize("user"), coachRequestsController.revoke);

// ─── Coach side ───────────────────────────────────────────────────────────────
router.get("/received", authorize("coach"), coachRequestsController.listReceived);
router.patch(
  "/:id",
  authorize("coach"),
  validate(updateCoachRequestStatusSchema),
  coachRequestsController.updateStatus,
);
router.get(
  "/:id/client-data",
  authorize("coach"),
  coachRequestsController.getClientData,
);
router.post(
  "/:id/feedback",
  authorize("coach"),
  validate(createFeedbackSchema),
  coachRequestsController.addFeedback,
);

// Guarded twice over: the coach role gets you to the handler, the client's
// `editHabits` grant is what actually lets the write through.
router.patch(
  "/:id/habits/:habitId",
  authorize("coach"),
  validate(clientHabitParamsSchema, "params"),
  validate(coachUpdateHabitSchema),
  coachRequestsController.updateClientHabit,
);

// Both sides read the thread — the service checks participation.
router.get("/:id/feedback", coachRequestsController.listFeedback);

export { router as coachRequestsRouter };
