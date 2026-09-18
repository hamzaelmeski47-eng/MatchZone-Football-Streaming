import { z } from "zod";

export const numericIdSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const matchIdSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const favoriteParamsSchema = z.object({
  entityType: z.enum(["match", "team", "competition"]),
  entityId: z.coerce.number().int().positive(),
});

export const notificationParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
});