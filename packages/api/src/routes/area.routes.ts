import { Router } from "express";
import { areaController } from "../controllers/area.controller";
import { validate } from "../middleware/validate";
import { authenticate } from "../middleware/authenticate";
import {
  createAreaSchema,
  updateAreaSchema,
  areaIdParamSchema,
} from "../schemas/area.schemas";

const router = Router();

// Every life-area route is scoped to the authenticated user.
router.use(authenticate);

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
