import { Router } from "express";
import { authController } from "../controllers/auth.controller";
import { validate } from "../middleware/validate";
import { authenticate } from "../middleware/authenticate";
import { authRateLimiter } from "../middleware/rate-limiter";
import {
  registerSchema,
  loginSchema,
  refreshSchema,
} from "../schemas/auth.schemas";

const router = Router();

router.post(
  "/register",
  authRateLimiter,
  validate(registerSchema),
  authController.register,
);
router.post(
  "/login",
  authRateLimiter,
  validate(loginSchema),
  authController.login,
);
router.post("/refresh", validate(refreshSchema), authController.refresh);
router.post("/logout", authenticate, authController.logout);
router.get("/me", authenticate, authController.me);

export { router as authRouter };
