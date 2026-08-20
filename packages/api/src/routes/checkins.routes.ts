import { Router } from "express";
import { checkInsController } from "../controllers/checkins.controller";
import { validate } from "../middleware/validate";
import { authenticate } from "../middleware/authenticate";
import { authorize } from "../middleware/authorize";
import {
  listCheckInsQuerySchema,
  createCheckInSchema,
  checkInIdParamSchema,
} from "../schemas/checkins.schemas";

const router = Router();

// Every check-in route is scoped to the authenticated user, and to a user
// account specifically — a check-in logs a habit, which a coach never has.
router.use(authenticate, authorize("user"));

router.get("/", validate(listCheckInsQuerySchema, "query"), checkInsController.list);
router.get("/today", checkInsController.today);
router.get("/activity", checkInsController.activity);
router.post("/", validate(createCheckInSchema), checkInsController.create);
router.delete(
  "/:id",
  validate(checkInIdParamSchema, "params"),
  checkInsController.remove,
);

export { router as checkInsRouter };
