import { Router } from "express";
import { adminController } from "../controllers/admin.controller";
import { validate } from "../middleware/validate";
import { authenticate } from "../middleware/authenticate";
import { authorize } from "../middleware/authorize";
import {
  updateUserRoleSchema,
  updateCoachVerificationSchema,
  updateCredentialVerificationSchema,
} from "../schemas/admin.schemas";

const router = Router();


router.use(authenticate, authorize("admin"));

router.get("/users", adminController.listUsers);
router.patch(
  "/users/:id/role",
  validate(updateUserRoleSchema),
  adminController.updateUserRole,
);


router.get("/coaches", adminController.listCoachApplicants);
router.patch(
  "/coaches/:id/verification",
  validate(updateCoachVerificationSchema),
  adminController.updateCoachVerification,
);
router.patch(
  "/coaches/credentials/:credentialId",
  validate(updateCredentialVerificationSchema),
  adminController.updateCredentialVerification,
);

export { router as adminRouter };