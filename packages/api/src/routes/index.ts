import { Router } from "express";
import { authRouter } from "./auth.routes";
import { areaRouter } from "./area.routes";
import { profileRouter } from "./profile.routes";
import { goalsRouter } from "./goals.routes";
import { habitsRouter } from "./habits.routes";
import { checkInsRouter } from "./checkins.routes";
import { adminRouter } from "./admin.routes";
import { coachesRouter } from "./coaches.routes";
import { coachRequestsRouter } from "./coach-requests.routes";
const router = Router();

router.use("/auth", authRouter);
router.use("/areas", areaRouter);
router.use("/profile", profileRouter);
router.use("/goals", goalsRouter);
router.use("/habits", habitsRouter);
router.use("/check-ins", checkInsRouter);
router.use("/admin", adminRouter);
router.use("/coaches", coachesRouter);
router.use("/coach-requests", coachRequestsRouter);

export { router };
