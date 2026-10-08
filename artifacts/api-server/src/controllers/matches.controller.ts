import type { Request, Response } from "express";
import {
  createMatch,
  findMatchById,
  listLineups,
  listMatchEvents,
  listMatches,
  updateMatch,
} from "../models/match.model";
import {
  getRealMatchById,
  getRealMatchEvents,
  getRealMatches,
} from "../services/football.service";
import { isDatabaseConnected } from "../database/mysql";
import { AppError } from "../utils/app-error";

export async function getMatches(req: Request, res: Response) {
  const status = req.query.status as "live" | "upcoming" | "finished" | undefined;
  const competitionId = req.query.competitionId ? Number(req.query.competitionId) : undefined;
  const teamId = req.query.teamId ? Number(req.query.teamId) : undefined;

  const realMatches = await getRealMatches({ status, competitionId, teamId });
  if (realMatches.length > 0) {
    res.json({ matches: realMatches });
    return;
  }

  if (isDatabaseConnected) {
    const dbMatches = await listMatches({ status, competitionId, teamId });
    res.json({ matches: dbMatches });
    return;
  }

  res.json({ matches: realMatches });
}

export async function getLiveMatches(_req: Request, res: Response) {
  const realLive = await getRealMatches({ status: "live" });
  if (realLive.length > 0) {
    res.json({ matches: realLive });
    return;
  }

  if (isDatabaseConnected) {
    res.json({ matches: await listMatches({ status: "live" }) });
    return;
  }

  res.json({ matches: realLive });
}

export async function getMatch(req: Request, res: Response) {
  const matchId = Number(req.params.id);
  const realMatch = await getRealMatchById(matchId);
  if (realMatch) {
    res.json({ match: realMatch });
    return;
  }

  if (isDatabaseConnected) {
    const match = await findMatchById(matchId);
    if (match) {
      res.json({ match });
      return;
    }
  }

  throw new AppError(404, "Match not found");
}

export async function getMatchEvents(req: Request, res: Response) {
  const matchId = Number(req.params.id);
  const realEvents = await getRealMatchEvents(matchId);
  if (realEvents.length > 0) {
    res.json({ events: realEvents });
    return;
  }

  if (isDatabaseConnected) {
    const match = await findMatchById(matchId);
    if (!match) throw new AppError(404, "Match not found");
    res.json({ events: await listMatchEvents(match.id) });
    return;
  }

  res.json({ events: [] });
}

export async function getMatchLineups(req: Request, res: Response) {
  const matchId = Number(req.params.id);
  if (isDatabaseConnected) {
    const match = await findMatchById(matchId);
    if (match) {
      res.json({ lineups: await listLineups(match.id) });
      return;
    }
  }

  res.json({ lineups: [] });
}

export async function createMatchController(req: Request, res: Response) {
  if (!isDatabaseConnected) {
    throw new AppError(503, "Database not connected for write operations");
  }
  const match = await createMatch(req.body);
  if (!match) throw new AppError(500, "Unable to create match");
  res.status(201).json({ match });
}

export async function updateMatchController(req: Request, res: Response) {
  if (!isDatabaseConnected) {
    throw new AppError(503, "Database not connected for write operations");
  }
  const match = await updateMatch(Number(req.params.id), req.body);
  if (!match) throw new AppError(404, "Match not found");
  res.json({ match });
}