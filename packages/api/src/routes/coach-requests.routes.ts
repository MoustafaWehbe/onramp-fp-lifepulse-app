import { Router } from "express";
import { coachRequestsController } from "../controllers/coach-requests.controller";
import { validate } from "../middleware/validate";
import { authenticate } from "../middleware/authenticate";
import { authorize } from "../middleware/authorize";
import {
  createCoachRequestSchema,
  updateCoachRequestStatusSchema,
} from "../schemas/coach-requests.schemas";

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

export { router as coachRequestsRouter };