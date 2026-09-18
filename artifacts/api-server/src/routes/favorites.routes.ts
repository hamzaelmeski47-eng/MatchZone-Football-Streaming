import { Router } from "express";
import { authenticate } from "../middlewares/auth.middleware";
import { validate } from "../middlewares/validate.middleware";
import { asyncHandler } from "../utils/async-handler";
import {
  createFavorite,
  deleteFavorite,
  getFavorites,
} from "../controllers/favorites.controller";
import {
  favoriteBodySchema,
  favoriteQuerySchema,
} from "../validators/favorite.schemas";
import { favoriteParamsSchema } from "../validators/common.schemas";

const router = Router();

router.use(authenticate);
router.get("/", validate(favoriteQuerySchema, "query"), asyncHandler(getFavorites));
router.post("/", validate(favoriteBodySchema, "body"), asyncHandler(createFavorite));
router.delete(
  "/:entityType/:entityId",
  validate(favoriteParamsSchema, "params"),
  asyncHandler(deleteFavorite),
);

export default router;