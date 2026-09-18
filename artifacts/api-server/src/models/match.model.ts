import type { RowDataPacket } from "mysql2";
import { execute, queryRows } from "../database/mysql";

export type MatchStatus = "live" | "upcoming" | "finished";

export interface MatchRow extends RowDataPacket {
  id: number;
  status: MatchStatus;
  startTime: Date;
  minute: string | null;
  homeScore: number;
  awayScore: number;
  venue: string | null;
  competitionId: number;
  competitionName: string;
  competitionSlug: string;
  homeTeamId: number;
  homeTeamName: string;
  homeTeamShortName: string;
  homeTeamLogoUrl: string | null;
  awayTeamId: number;
  awayTeamName: string;
  awayTeamShortName: string;
  awayTeamLogoUrl: string | null;
}

const matchSelect = `
  SELECT
    m.id,
    m.status,
    m.start_time AS startTime,
    m.minute,
    m.home_score AS homeScore,
    m.away_score AS awayScore,
    m.venue,
    c.id AS competitionId,
    c.name AS competitionName,
    c.slug AS competitionSlug,
    home.id AS homeTeamId,
    home.name AS homeTeamName,
    home.short_name AS homeTeamShortName,
    home.logo_url AS homeTeamLogoUrl,
    away.id AS awayTeamId,
    away.name AS awayTeamName,
    away.short_name AS awayTeamShortName,
    away.logo_url AS awayTeamLogoUrl
  FROM matches m
  INNER JOIN competitions c ON c.id = m.competition_id
  INNER JOIN teams home ON home.id = m.home_team_id
  INNER JOIN teams away ON away.id = m.away_team_id
`;

export async function listMatches(filters: {
  status?: MatchStatus;
  competitionId?: number;
  teamId?: number;
}) {
  const clauses: string[] = [];
  const params: unknown[] = [];

  if (filters.status) {
    clauses.push("m.status = ?");
    params.push(filters.status);
  }
  if (filters.competitionId) {
    clauses.push("m.competition_id = ?");
    params.push(filters.competitionId);
  }
  if (filters.teamId) {
    clauses.push("(m.home_team_id = ? OR m.away_team_id = ?)");
    params.push(filters.teamId, filters.teamId);
  }

  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  return queryRows<MatchRow>(
    `${matchSelect} ${where} ORDER BY m.start_time ASC, m.id ASC`,
    params,
  );
}

export async function findMatchById(id: number) {
  const rows = await queryRows<MatchRow>(
    `${matchSelect} WHERE m.id = ? LIMIT 1`,
    [id],
  );
  return rows[0] ?? null;
}

export async function createMatch(input: {
  competitionId: number;
  homeTeamId: number;
  awayTeamId: number;
  status: MatchStatus;
  startTime: string;
  minute?: string | null;
  homeScore?: number;
  awayScore?: number;
  venue?: string | null;
}) {
  const result = await execute(
    `INSERT INTO matches
      (competition_id, home_team_id, away_team_id, status, start_time, minute, home_score, away_score, venue)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      input.competitionId,
      input.homeTeamId,
      input.awayTeamId,
      input.status,
      input.startTime,
      input.minute ?? null,
      input.homeScore ?? 0,
      input.awayScore ?? 0,
      input.venue ?? null,
    ],
  );
  return findMatchById(result.insertId);
}

export async function updateMatch(
  id: number,
  input: Partial<{
    competitionId: number;
    homeTeamId: number;
    awayTeamId: number;
    status: MatchStatus;
    startTime: string;
    minute: string | null;
    homeScore: number;
    awayScore: number;
    venue: string | null;
  }>,
) {
  const allowed = new Map<string, unknown>([
    ["competition_id", input.competitionId],
    ["home_team_id", input.homeTeamId],
    ["away_team_id", input.awayTeamId],
    ["status", input.status],
    ["start_time", input.startTime],
    ["minute", input.minute],
    ["home_score", input.homeScore],
    ["away_score", input.awayScore],
    ["venue", input.venue],
  ]);
  const updates: string[] = [];
  const params: unknown[] = [];
  for (const [column, value] of allowed) {
    if (value !== undefined) {
      updates.push(`${column} = ?`);
      params.push(value);
    }
  }
  if (!updates.length) {
    return findMatchById(id);
  }
  params.push(id);
  await execute(`UPDATE matches SET ${updates.join(", ")} WHERE id = ?`, params);
  return findMatchById(id);
}

export async function listMatchEvents(matchId: number) {
  return queryRows<RowDataPacket & {
    id: number;
    minute: string;
    type: string;
    playerName: string | null;
    description: string;
    teamId: number | null;
  }>(
    `SELECT id, minute, type, player_name AS playerName, description, team_id AS teamId
     FROM match_events WHERE match_id = ? ORDER BY id ASC`,
    [matchId],
  );
}

export async function listLineups(matchId: number) {
  return queryRows<RowDataPacket & {
    id: number;
    teamId: number;
    formation: string | null;
    players: unknown;
  }>(
    `SELECT id, team_id AS teamId, formation, players
     FROM lineups WHERE match_id = ? ORDER BY team_id ASC`,
    [matchId],
  );
}