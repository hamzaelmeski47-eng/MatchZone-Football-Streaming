import { Router } from "express";
import { authenticate, requireRole } from "../middlewares/auth.middleware";
import { validate } from "../middlewares/validate.middleware";
import { asyncHandler } from "../utils/async-handler";
import {
  createCompetitionController,
  getCompetition,
  getCompetitions,
  getStandings,
} from "../controllers/catalog.controller";
import {
  createCompetitionSchema,
  searchQuerySchema,
} from "../validators/catalog.schemas";
import { numericIdSchema } from "../validators/common.schemas";

const router = Router();

router.get(
  "/",
  validate(searchQuerySchema, "query"),
  asyncHandler(getCompetitions),
);
router.get(
  "/:id",
  validate(numericIdSchema, "params"),
  asyncHandler(getCompetition),
);
router.get(
  "/:id/standings",
  validate(numericIdSchema, "params"),
  asyncHandler(getStandings),
);
router.post(
  "/",
  authenticate,
  requireRole("admin"),
  validate(createCompetitionSchema, "body"),
  asyncHandler(createCompetitionController),
);

export default router;