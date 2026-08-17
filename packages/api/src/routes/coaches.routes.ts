import { Router } from "express";
import { coachesController } from "../controllers/coaches.controller";
import { authenticate } from "../middleware/authenticate";

const router = Router();

router.get("/", authenticate, coachesController.listCoaches);

export { router as coachesRouter };