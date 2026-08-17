import { Router } from "express";
import { adminController } from "../controllers/admin.controller";
import { validate } from "../middleware/validate";
import { authenticate } from "../middleware/authenticate";
import { authorize } from "../middleware/authorize";
import { updateUserRoleSchema } from "../schemas/admin.schemas";

const router = Router();


router.use(authenticate, authorize("admin"));

router.get("/users", adminController.listUsers);
router.patch(
  "/users/:id/role",
  validate(updateUserRoleSchema),
  adminController.updateUserRole,
);

export { router as adminRouter };