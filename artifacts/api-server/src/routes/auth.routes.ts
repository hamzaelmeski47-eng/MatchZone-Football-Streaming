import { Router } from "express";
import { asyncHandler } from "../utils/async-handler";
import { validate } from "../middlewares/validate.middleware";
import { authenticate } from "../middlewares/auth.middleware";
import {
  loginSchema,
  registerSchema,
  updateProfileSchema,
} from "../validators/auth.schemas";
import {
  getCurrentUser,
  login,
  register,
  updateCurrentUser,
} from "../controllers/auth.controller";

const router = Router();

router.post("/register", validate(registerSchema, "body"), asyncHandler(register));
router.post("/login", validate(loginSchema, "body"), asyncHandler(login));
router.get("/me", authenticate, asyncHandler(getCurrentUser));
router.patch(
  "/me",
  authenticate,
  validate(updateProfileSchema, "body"),
  asyncHandler(updateCurrentUser),
);

export default router;