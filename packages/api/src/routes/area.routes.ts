import { Router } from "express";
import { areaController } from "../controllers/area.controller";
import { validate } from "../middleware/validate";
import { authenticate } from "../middleware/authenticate";
import { authorize } from "../middleware/authorize";
import {
  createAreaSchema,
  updateAreaSchema,
  areaIdParamSchema,
} from "../schemas/area.schemas";

const router = Router();

// Every life-area route is scoped to the authenticated user, and to a user
// account specifically: life areas belong to the person being coached, so a
// coach's own would be data no screen in their app can ever show.
router.use(authenticate, authorize("user"));

router.get("/", areaController.list);
router.post("/", validate(createAreaSchema), areaController.create);
router.get("/:id", validate(areaIdParamSchema, "params"), areaController.get);
router.patch(
  "/:id",
  validate(areaIdParamSchema, "params"),
  validate(updateAreaSchema),
  areaController.update,
);
router.delete(
  "/:id",
  validate(areaIdParamSchema, "params"),
  areaController.remove,
);

export { router as areaRouter };
