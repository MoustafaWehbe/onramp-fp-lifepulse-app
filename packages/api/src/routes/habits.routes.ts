import { Router } from "express";
import { habitsController } from "../controllers/habits.controller";
import { validate } from "../middleware/validate";
import { authenticate } from "../middleware/authenticate";
import { authorize } from "../middleware/authorize";
import {
  createHabitSchema,
  updateHabitSchema,
  habitIdParamSchema,
  listHabitsQuerySchema,
} from "../schemas/habits.schemas";

const router = Router();

// Every habit route is scoped to the authenticated user, and to a user account
// specifically — habits belong to the person being coached, not to their coach.
router.use(authenticate, authorize("user"));

router.get("/", validate(listHabitsQuerySchema, "query"), habitsController.list);
router.post("/", validate(createHabitSchema), habitsController.create);
router.get("/:id", validate(habitIdParamSchema, "params"), habitsController.get);
router.patch(
  "/:id",
  validate(habitIdParamSchema, "params"),
  validate(updateHabitSchema),
  habitsController.update,
);
router.delete(
  "/:id",
  validate(habitIdParamSchema, "params"),
  habitsController.remove,
);
router.post(
  "/:id/archive",
  validate(habitIdParamSchema, "params"),
  habitsController.archive,
);
router.post(
  "/:id/restore",
  validate(habitIdParamSchema, "params"),
  habitsController.restore,
);

export { router as habitsRouter };
