import { Router } from "express";
import { authenticate, requireRole } from "../middlewares/auth.middleware";
import { validate } from "../middlewares/validate.middleware";
import { asyncHandler } from "../utils/async-handler";
import {
  createTeamController,
  getTeam,
  getTeams,
} from "../controllers/catalog.controller";
import { createTeamSchema } from "../validators/catalog.schemas";
import { numericIdSchema } from "../validators/common.schemas";
import { searchQuerySchema } from "../validators/catalog.schemas";

const router = Router();

router.get("/", validate(searchQuerySchema, "query"), asyncHandler(getTeams));
router.get("/:id", validate(numericIdSchema, "params"), asyncHandler(getTeam));
router.post(
  "/",
  authenticate,
  requireRole("admin"),
  validate(createTeamSchema, "body"),
  asyncHandler(createTeamController),
);

export default router;