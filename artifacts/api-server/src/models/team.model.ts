import type { RowDataPacket } from "mysql2";
import { execute, queryRows } from "../database/mysql";

export interface TeamRow extends RowDataPacket {
  id: number;
  name: string;
  short_name: string;
  slug: string;
  country: string | null;
  logo_url: string | null;
  created_at: Date;
}

export async function listTeams(search?: string) {
  const like = search ? `%${search}%` : null;
  return queryRows<TeamRow>(
    "SELECT id, name, short_name, slug, country, logo_url, created_at FROM teams WHERE (? IS NULL OR name LIKE ? OR short_name LIKE ?) ORDER BY name ASC",
    [like, like, like],
  );
}

export async function findTeamById(id: number) {
  const rows = await queryRows<TeamRow>(
    "SELECT id, name, short_name, slug, country, logo_url, created_at FROM teams WHERE id = ? LIMIT 1",
    [id],
  );
  return rows[0] ?? null;
}

export async function createTeam(input: {
  name: string;
  shortName: string;
  slug: string;
  country?: string | null;
  logoUrl?: string | null;
}) {
  const result = await execute(
    "INSERT INTO teams (name, short_name, slug, country, logo_url) VALUES (?, ?, ?, ?, ?)",
    [
      input.name,
      input.shortName,
      input.slug,
      input.country ?? null,
      input.logoUrl ?? null,
    ],
  );
  return findTeamById(result.insertId);
}