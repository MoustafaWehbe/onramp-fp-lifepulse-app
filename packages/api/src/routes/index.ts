import { Router } from "express";
import { authRouter } from "./auth.routes";
import { areaRouter } from "./area.routes";
import { profileRouter } from "./profile.routes";
import { goalsRouter } from "./goals.routes";
const router = Router();

router.use("/auth", authRouter);
router.use("/areas", areaRouter);
router.use("/profile", profileRouter);
router.use("/goals", goalsRouter);

export { router };
