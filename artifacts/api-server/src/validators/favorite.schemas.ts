import { z } from "zod";

export const favoriteQuerySchema = z.object({
  entityType: z.enum(["match", "team", "competition"]).optional(),
});

export const favoriteBodySchema = z.object({
  entityType: z.enum(["match", "team", "competition"]),
  entityId: z.number().int().positive(),
});