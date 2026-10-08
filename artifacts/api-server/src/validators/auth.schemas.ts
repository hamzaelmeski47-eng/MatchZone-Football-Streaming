import { z } from "zod";

export const registerSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8).max(72),
  displayName: z.string().trim().min(2).max(100),
});

export const sendVerificationSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  displayName: z.string().trim().min(2).max(100).optional(),
});

export const verifyAndRegisterSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  code: z.string().trim().length(6),
  password: z.string().min(8).max(72),
  displayName: z.string().trim().min(2).max(100),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1).max(72),
});

export const updateProfileSchema = z.object({
  displayName: z.string().trim().min(2).max(100).optional(),
  avatarUrl: z.string().max(500000).nullable().optional(),
});

export const googleAuthSchema = z.object({
  credential: z.string().optional(),
  email: z.string().trim().toLowerCase().email().optional(),
  displayName: z.string().trim().min(1).max(100).optional(),
  avatarUrl: z.string().url().max(2048).nullable().optional(),
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
});

export const resetPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  code: z.string().trim().length(6),
  newPassword: z.string().min(8).max(72),
});