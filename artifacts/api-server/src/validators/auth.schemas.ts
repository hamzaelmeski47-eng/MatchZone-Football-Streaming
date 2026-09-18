import { z } from "zod";

export const registerSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8).max(72),
  displayName: z.string().trim().min(2).max(100),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1).max(72),
});

export const updateProfileSchema = z.object({
  displayName: z.string().trim().min(2).max(100).optional(),
  avatarUrl: z.string().url().max(2048).nullable().optional(),
});