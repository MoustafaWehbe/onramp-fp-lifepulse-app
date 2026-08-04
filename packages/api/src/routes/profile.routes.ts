import { Router } from "express";
import { profileController } from "../controllers/profile.controller";
import { validate } from "../middleware/validate";
import { authenticate } from "../middleware/authenticate";
import { updateProfileSchema, onboardingSchema } from "../schemas/profile.schemas";

const router = Router();

router.get("/", authenticate, profileController.getProfile);
router.patch(
  "/",
  authenticate,
  validate(updateProfileSchema),
  profileController.updateProfile,
);
router.patch(
  "/onboarding",
  authenticate,
  validate(onboardingSchema),
  profileController.completeOnboarding,
);

export { router as profileRouter };