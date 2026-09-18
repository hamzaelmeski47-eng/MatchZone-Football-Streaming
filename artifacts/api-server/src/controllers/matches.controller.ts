import type { Request, Response } from "express";
import {
  createMatch,
  findMatchById,
  listLineups,
  listMatchEvents,
  listMatches,
  updateMatch,
} from "../models/match.model";
import { AppError } from "../utils/app-error";

export async function getMatches(req: Request, res: Response) {
  const matches = await listMatches(req.query as {
    status?: "live" | "upcoming" | "finished";
    competitionId?: number;
    teamId?: number;
  });
  res.json({ matches });
}

export async function getLiveMatches(_req: Request, res: Response) {
  res.json({ matches: await listMatches({ status: "live" }) });
}

export async function getMatch(req: Request, res: Response) {
  const match = await findMatchById(Number(req.params.id));
  if (!match) throw new AppError(404, "Match not found");
  res.json({ match });
}

export async function getMatchEvents(req: Request, res: Response) {
  const match = await findMatchById(Number(req.params.id));
  if (!match) throw new AppError(404, "Match not found");
  res.json({ events: await listMatchEvents(match.id) });
}

export async function getMatchLineups(req: Request, res: Response) {
  const match = await findMatchById(Number(req.params.id));
  if (!match) throw new AppError(404, "Match not found");
  res.json({ lineups: await listLineups(match.id) });
}

export async function createMatchController(req: Request, res: Response) {
  const match = await createMatch(req.body);
  if (!match) throw new AppError(500, "Unable to create match");
  res.status(201).json({ match });
}

export async function updateMatchController(req: Request, res: Response) {
  const match = await updateMatch(Number(req.params.id), req.body);
  if (!match) throw new AppError(404, "Match not found");
  res.json({ match });
}