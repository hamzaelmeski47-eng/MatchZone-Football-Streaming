import { Router } from "express";
import { authenticate, requireRole } from "../middlewares/auth.middleware";
import { validate } from "../middlewares/validate.middleware";
import { asyncHandler } from "../utils/async-handler";
import {
  createStreamController,
  deleteStream,
  getMatchStreams,
} from "../controllers/streams.controller";
import {
  createStreamSchema,
  streamIdParamsSchema,
  streamMatchParamsSchema,
} from "../validators/stream.schemas";

const router = Router();

router.get(
  "/match/:matchId",
  authenticate,
  validate(streamMatchParamsSchema, "params"),
  asyncHandler(getMatchStreams),
);
router.post(
  "/",
  authenticate,
  requireRole("admin"),
  validate(createStreamSchema, "body"),
  asyncHandler(createStreamController),
);
router.delete(
  "/:id",
  authenticate,
  requireRole("admin"),
  validate(streamIdParamsSchema, "params"),
  asyncHandler(deleteStream),
);

export default router;