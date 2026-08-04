import { Router } from "express";
import { goalsController } from "../controllers/goals.controller";

const router = Router();

router.get("/", goalsController.listGoals);

export { router as goalsRouter };