import { z } from "zod";

export const streamMatchParamsSchema = z.object({
  matchId: z.string().trim().min(1),
});

export const streamIdParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const createStreamSchema = z.object({
  matchId: z.number().int().positive(),
  provider: z.string().trim().min(1).max(100),
  label: z.string().trim().min(1).max(150),
  url: z.string().url().max(2048),
  isActive: z.boolean().optional(),
});