import { Router } from "express";
import { authRouter } from "./auth.routes";
import { areaRouter } from "./area.routes";

const router = Router();

router.use("/auth", authRouter);
router.use("/areas", areaRouter);

// Add more routers here:
// router.use('/users', usersRouter);

export { router };
