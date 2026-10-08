import { Router } from "express";
import { asyncHandler } from "../utils/async-handler";
import { validate } from "../middlewares/validate.middleware";
import { authenticate } from "../middlewares/auth.middleware";
import {
  forgotPasswordSchema,
  googleAuthSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  sendVerificationSchema,
  updateProfileSchema,
  verifyAndRegisterSchema,
} from "../validators/auth.schemas";
import {
  forgotPassword,
  getCurrentUser,
  googleAuth,
  login,
  register,
  requestVerification,
  resetPassword,
  updateCurrentUser,
  verifyAndRegister,
} from "../controllers/auth.controller";

const router = Router();

router.post("/send-verification", validate(sendVerificationSchema, "body"), asyncHandler(requestVerification));
router.post("/verify-and-register", validate(verifyAndRegisterSchema, "body"), asyncHandler(verifyAndRegister));
router.post("/forgot-password", validate(forgotPasswordSchema, "body"), asyncHandler(forgotPassword));
router.post("/reset-password", validate(resetPasswordSchema, "body"), asyncHandler(resetPassword));
router.post("/register", validate(registerSchema, "body"), asyncHandler(register));
router.post("/login", validate(loginSchema, "body"), asyncHandler(login));
router.post("/google", validate(googleAuthSchema, "body"), asyncHandler(googleAuth));
router.get("/me", authenticate, asyncHandler(getCurrentUser));
router.patch(
  "/me",
  authenticate,
  validate(updateProfileSchema, "body"),
  asyncHandler(updateCurrentUser),
);

export default router;