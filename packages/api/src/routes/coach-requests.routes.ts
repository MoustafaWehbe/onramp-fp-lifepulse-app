import { Router } from "express";
import { coachRequestsController } from "../controllers/coach-requests.controller";
import { validate } from "../middleware/validate";
import { authenticate } from "../middleware/authenticate";
import { authorize } from "../middleware/authorize";
import {
  createCoachRequestSchema,
  updateCoachRequestStatusSchema,
} from "../schemas/coach-requests.schemas";
import { createFeedbackSchema } from "../schemas/coach-feedback.schemas";
const router = Router();

router.use(authenticate);


router.post("/", validate(createCoachRequestSchema), coachRequestsController.create);
router.get("/sent", coachRequestsController.listSent);


router.get("/received", authorize("coach"), coachRequestsController.listReceived);
router.patch(
  "/:id",
  authorize("coach"),
  validate(updateCoachRequestStatusSchema),
  coachRequestsController.updateStatus,
);

router.get("/:id/client-data", authorize("coach"), coachRequestsController.getClientData);
 router.post(
   "/:id/feedback",
   authorize("coach"),
   validate(createFeedbackSchema),
   coachRequestsController.addFeedback,
 );

 router.get("/:id/feedback", coachRequestsController.listFeedback);

export { router as coachRequestsRouter };