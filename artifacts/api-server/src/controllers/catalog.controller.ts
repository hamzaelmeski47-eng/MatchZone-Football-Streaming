import type { Request, Response } from "express";
import {
  createCompetition,
  findCompetitionById,
  listCompetitions,
} from "../models/competition.model";
import { createTeam, findTeamById, listTeams } from "../models/team.model";
import {
  getRealCompetitions,
  getRealTeams,
  getRealStandings,
} from "../services/football.service";
import { isDatabaseConnected } from "../database/mysql";
import { AppError } from "../utils/app-error";


export async function getTeams(req: Request, res: Response) {
  const realTeams = await getRealTeams();
  const search = req.query.search as string | undefined;

  let teams = realTeams;
  if (isDatabaseConnected) {
    try {
      const dbTeams = await listTeams(search);
      if (dbTeams.length > 0) {
        // Merge without duplicate IDs
        const existingIds = new Set(teams.map((t) => t.id));
        for (const dbTeam of dbTeams) {
          if (!existingIds.has(dbTeam.id)) {
            teams.push(dbTeam as any);
          }
        }
      }
    } catch {
      // fallback to realTeams
    }
  }

  if (search) {
    const q = search.toLowerCase();
    teams = teams.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.short_name.toLowerCase().includes(q) ||
        t.slug.toLowerCase().includes(q)
    );
  }

  res.json({ teams });
}

export async function getTeam(req: Request, res: Response) {
  const teamId = Number(req.params.id);
  const realTeams = await getRealTeams();
  const found = realTeams.find((t) => t.id === teamId);
  if (found) return res.json({ team: found });

  if (isDatabaseConnected) {
    const team = await findTeamById(teamId);
    if (team) return res.json({ team });
  }

  throw new AppError(404, "Team not found");
}

export async function createTeamController(req: Request, res: Response) {
  if (!isDatabaseConnected) throw new AppError(503, "Database not connected");
  const team = await createTeam(req.body);
  if (!team) throw new AppError(500, "Unable to create team");
  res.status(201).json({ team });
}

export async function getCompetitions(req: Request, res: Response) {
  const realComps = await getRealCompetitions();
  const search = req.query.search as string | undefined;

  let competitions = realComps;
  if (isDatabaseConnected) {
    try {
      const dbComps = await listCompetitions(search);
      if (dbComps.length > 0) {
        const existingIds = new Set(competitions.map((c) => c.id));
        for (const dbComp of dbComps) {
          if (!existingIds.has(dbComp.id)) {
            competitions.push(dbComp as any);
          }
        }
      }
    } catch {
      // fallback
    }
  }

  if (search) {
    const q = search.toLowerCase();
    competitions = competitions.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.slug.toLowerCase().includes(q)
    );
  }

  res.json({ competitions });
}

export async function getCompetition(req: Request, res: Response) {
  const compId = Number(req.params.id);
  const realComps = await getRealCompetitions();
  const found = realComps.find((c) => c.id === compId);
  if (found) return res.json({ competition: found });

  if (isDatabaseConnected) {
    const competition = await findCompetitionById(compId);
    if (competition) return res.json({ competition });
  }

  throw new AppError(404, "Competition not found");
}

export async function createCompetitionController(req: Request, res: Response) {
  if (!isDatabaseConnected) throw new AppError(503, "Database not connected");
  const competition = await createCompetition(req.body);
  if (!competition) throw new AppError(500, "Unable to create competition");
  res.status(201).json({ competition });
}

export async function getStandings(req: Request, res: Response) {
  const compId = Number(req.params.id);
  const standings = await getRealStandings(compId);
  res.json({ standings });
}