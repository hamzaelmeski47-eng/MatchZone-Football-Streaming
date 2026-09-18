import { z } from "zod";

const matchStatus = z.enum(["live", "upcoming", "finished"]);

export const matchQuerySchema = z.object({
  status: matchStatus.optional(),
  competitionId: z.coerce.number().int().positive().optional(),
  teamId: z.coerce.number().int().positive().optional(),
});

export const createMatchSchema = z.object({
  competitionId: z.number().int().positive(),
  homeTeamId: z.number().int().positive(),
  awayTeamId: z.number().int().positive(),
  status: matchStatus,
  startTime: z.string().datetime(),
  minute: z.string().max(20).nullable().optional(),
  homeScore: z.number().int().nonnegative().optional(),
  awayScore: z.number().int().nonnegative().optional(),
  venue: z.string().max(200).nullable().optional(),
});

export const updateMatchSchema = createMatchSchema.partial();