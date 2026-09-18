import { Router } from "express";
import { authenticate, requireRole } from "../middlewares/auth.middleware";
import { validate } from "../middlewares/validate.middleware";
import { asyncHandler } from "../utils/async-handler";
import {
  createMatchController,
  getLiveMatches,
  getMatch,
  getMatchEvents,
  getMatchLineups,
  getMatches,
  updateMatchController,
} from "../controllers/matches.controller";
import {
  createMatchSchema,
  matchQuerySchema,
  updateMatchSchema,
} from "../validators/match.schemas";
import { matchIdSchema } from "../validators/common.schemas";

const router = Router();

router.get("/", validate(matchQuerySchema, "query"), asyncHandler(getMatches));
router.get("/live", asyncHandler(getLiveMatches));
router.get(
  "/:id",
  validate(matchIdSchema, "params"),
  asyncHandler(getMatch),
);
router.get(
  "/:id/events",
  validate(matchIdSchema, "params"),
  asyncHandler(getMatchEvents),
);
router.get(
  "/:id/lineups",
  validate(matchIdSchema, "params"),
  asyncHandler(getMatchLineups),
);
router.post(
  "/",
  authenticate,
  requireRole("admin"),
  validate(createMatchSchema, "body"),
  asyncHandler(createMatchController),
);
router.patch(
  "/:id",
  authenticate,
  requireRole("admin"),
  validate(matchIdSchema, "params"),
  validate(updateMatchSchema, "body"),
  asyncHandler(updateMatchController),
);

export default router;