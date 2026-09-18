import type { RowDataPacket } from "mysql2";
import { execute, queryRows } from "../database/mysql";

export interface CompetitionRow extends RowDataPacket {
  id: number;
  name: string;
  slug: string;
  country: string | null;
  logo_url: string | null;
  created_at: Date;
}

export async function listCompetitions(search?: string) {
  const like = search ? `%${search}%` : null;
  return queryRows<CompetitionRow>(
    "SELECT id, name, slug, country, logo_url, created_at FROM competitions WHERE (? IS NULL OR name LIKE ?) ORDER BY name ASC",
    [like, like],
  );
}

export async function findCompetitionById(id: number) {
  const rows = await queryRows<CompetitionRow>(
    "SELECT id, name, slug, country, logo_url, created_at FROM competitions WHERE id = ? LIMIT 1",
    [id],
  );
  return rows[0] ?? null;
}

export async function createCompetition(input: {
  name: string;
  slug: string;
  country?: string | null;
  logoUrl?: string | null;
}) {
  const result = await execute(
    "INSERT INTO competitions (name, slug, country, logo_url) VALUES (?, ?, ?, ?)",
    [input.name, input.slug, input.country ?? null, input.logoUrl ?? null],
  );
  return findCompetitionById(result.insertId);
}