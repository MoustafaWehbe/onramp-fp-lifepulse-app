import { Router } from "express";
import { authRouter } from "./auth.routes";
import { areaRouter } from "./area.routes";
import { profileRouter } from "./profile.routes";
import { goalsRouter } from "./goals.routes";
import { habitsRouter } from "./habits.routes";
import { checkInsRouter } from "./checkins.routes";
import { aiSuggestionsRouter } from "./ai-suggestions.routes";
const router = Router();

router.use("/auth", authRouter);
router.use("/areas", areaRouter);
router.use("/profile", profileRouter);
router.use("/goals", goalsRouter);
router.use("/habits", habitsRouter);
router.use("/check-ins", checkInsRouter);
router.use("/ai/suggestions", aiSuggestionsRouter);

export { router };
