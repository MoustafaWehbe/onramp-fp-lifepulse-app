import { Router } from "express";
import { checkInsController } from "../controllers/checkins.controller";
import { validate } from "../middleware/validate";
import { authenticate } from "../middleware/authenticate";
import {
  listCheckInsQuerySchema,
  createCheckInSchema,
  checkInIdParamSchema,
} from "../schemas/checkins.schemas";

const router = Router();

// Every check-in route is scoped to the authenticated user.
router.use(authenticate);

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
