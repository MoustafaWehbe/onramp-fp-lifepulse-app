import { Router } from "express";
import { coachesController } from "../controllers/coaches.controller";
import { coachProfileController } from "../controllers/coach-profile.controller";
import { authenticate } from "../middleware/authenticate";
import { authorize } from "../middleware/authorize";
import { validate } from "../middleware/validate";
import {
  updateCoachProfileSchema,
  createCredentialSchema,
} from "../schemas/coach-profile.schemas";

const router = Router();

router.use(authenticate);


router.get("/me", authorize("coach"), coachProfileController.getMyProfile);
router.patch(
  "/me",
  authorize("coach"),
  validate(updateCoachProfileSchema),
  coachProfileController.updateMyProfile,
);
router.post(
  "/me/credentials",
  authorize("coach"),
  validate(createCredentialSchema),
  coachProfileController.addCredential,
);
router.delete(
  "/me/credentials/:credentialId",
  authorize("coach"),
  coachProfileController.removeCredential,
);



router.get("/", coachesController.listCoaches);
router.get("/:id", coachesController.getCoach);

export { router as coachesRouter };