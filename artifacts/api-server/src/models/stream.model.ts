import type { RowDataPacket } from "mysql2";
import { execute, queryRows } from "../database/mysql";

export interface StreamRow extends RowDataPacket {
  id: number;
  match_id: number;
  provider: string;
  label: string;
  url: string;
  is_active: number;
  created_at: Date;
  updated_at: Date;
}

export async function listActiveStreams(matchId: number) {
  return queryRows<StreamRow>(
    "SELECT id, match_id, provider, label, url, is_active, created_at, updated_at FROM streams WHERE match_id = ? AND is_active = TRUE ORDER BY id ASC",
    [matchId],
  );
}

export async function createStream(input: {
  matchId: number;
  provider: string;
  label: string;
  url: string;
  isActive?: boolean;
}) {
  const result = await execute(
    "INSERT INTO streams (match_id, provider, label, url, is_active) VALUES (?, ?, ?, ?, ?)",
    [
      input.matchId,
      input.provider,
      input.label,
      input.url,
      input.isActive ?? true,
    ],
  );
  const rows = await queryRows<StreamRow>(
    "SELECT id, match_id, provider, label, url, is_active, created_at, updated_at FROM streams WHERE id = ?",
    [result.insertId],
  );
  return rows[0] ?? null;
}

export async function removeStream(id: number) {
  const result = await execute("DELETE FROM streams WHERE id = ?", [id]);
  return result.affectedRows > 0;
}