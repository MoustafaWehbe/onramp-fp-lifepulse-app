import { Router } from "express";
import { aiSuggestionsController } from "../controllers/ai-suggestions.controller";
import { validate } from "../middleware/validate";
import { authenticate } from "../middleware/authenticate";
import { authorize } from "../middleware/authorize";
import { aiGenerateRateLimiter } from "../middleware/rate-limiter";
import { suggestionIdParamSchema } from "../schemas/ai-suggestions.schemas";

const router = Router();

// Every AI suggestions route is scoped to the authenticated user, and to a
// user account specifically — suggestions produce habits, which only they have.
router.use(authenticate, authorize("user"));

router.get("/", aiSuggestionsController.list);
router.post("/", aiGenerateRateLimiter, aiSuggestionsController.generate);
router.post("/accept-all", aiSuggestionsController.acceptAll);
router.post(
  "/:id/accept",
  validate(suggestionIdParamSchema, "params"),
  aiSuggestionsController.accept,
);
router.post(
  "/:id/dismiss",
  validate(suggestionIdParamSchema, "params"),
  aiSuggestionsController.dismiss,
);

export { router as aiSuggestionsRouter };
