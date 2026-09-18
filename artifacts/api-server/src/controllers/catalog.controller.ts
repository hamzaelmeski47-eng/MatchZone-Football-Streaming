import type { Request, Response } from "express";
import {
  createCompetition,
  findCompetitionById,
  listCompetitions,
} from "../models/competition.model";
import { createTeam, findTeamById, listTeams } from "../models/team.model";
import { AppError } from "../utils/app-error";

export async function getTeams(req: Request, res: Response) {
  res.json({ teams: await listTeams(req.query.search as string | undefined) });
}

export async function getTeam(req: Request, res: Response) {
  const team = await findTeamById(Number(req.params.id));
  if (!team) throw new AppError(404, "Team not found");
  res.json({ team });
}

export async function createTeamController(req: Request, res: Response) {
  const team = await createTeam(req.body);
  if (!team) throw new AppError(500, "Unable to create team");
  res.status(201).json({ team });
}

export async function getCompetitions(req: Request, res: Response) {
  res.json({
    competitions: await listCompetitions(req.query.search as string | undefined),
  });
}

export async function getCompetition(req: Request, res: Response) {
  const competition = await findCompetitionById(Number(req.params.id));
  if (!competition) throw new AppError(404, "Competition not found");
  res.json({ competition });
}

export async function createCompetitionController(req: Request, res: Response) {
  const competition = await createCompetition(req.body);
  if (!competition) throw new AppError(500, "Unable to create competition");
  res.status(201).json({ competition });
}