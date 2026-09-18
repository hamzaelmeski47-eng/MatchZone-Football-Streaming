import { z } from "zod";

export const searchQuerySchema = z.object({
  search: z.string().trim().max(100).optional(),
});

export const createTeamSchema = z.object({
  name: z.string().trim().min(1).max(150),
  shortName: z.string().trim().min(1).max(20),
  slug: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(180),
  country: z.string().trim().max(100).nullable().optional(),
  logoUrl: z.string().url().max(2048).nullable().optional(),
});

export const createCompetitionSchema = z.object({
  name: z.string().trim().min(1).max(150),
  slug: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(180),
  country: z.string().trim().max(100).nullable().optional(),
  logoUrl: z.string().url().max(2048).nullable().optional(),
});