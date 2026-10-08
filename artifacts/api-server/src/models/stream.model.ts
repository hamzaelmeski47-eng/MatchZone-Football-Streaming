import type { RowDataPacket } from "mysql2";
import { execute, queryRows, isDatabaseConnected } from "../database/mysql";

export interface StreamRow extends RowDataPacket {
  id: number;
  match_id: number;
  provider: string;
  stream_url: string;
  stream_type: "hls" | "dash" | "iframe";
  is_active: number | boolean;
  created_at: Date;
  updated_at: Date;
}

export interface StreamItem {
  id: number;
  match_id: number;
  provider: string;
  stream_url: string;
  stream_type: "hls" | "dash" | "iframe";
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// In-memory fallback store (when MySQL is not running or during standalone mode)
const memoryStreams: StreamItem[] = [];
let nextMemoryId = 1;

export async function listAllStreams(): Promise<StreamItem[]> {
  if (isDatabaseConnected) {
    try {
      const rows = await queryRows<StreamRow>(
        "SELECT id, match_id, provider, stream_url, stream_type, is_active, created_at, updated_at FROM streams ORDER BY id DESC"
      );
      return rows.map((r) => ({
        id: Number(r.id),
        match_id: Number(r.match_id),
        provider: r.provider,
        stream_url: r.stream_url,
        stream_type: r.stream_type,
        is_active: Boolean(r.is_active),
        created_at: new Date(r.created_at).toISOString(),
        updated_at: new Date(r.updated_at).toISOString(),
      }));
    } catch {
      // fallback to memory
    }
  }
  return [...memoryStreams].sort((a, b) => b.id - a.id);
}

export async function getActiveStreamForMatch(matchId: number): Promise<StreamItem | null> {
  if (isDatabaseConnected) {
    try {
      const rows = await queryRows<StreamRow>(
        "SELECT id, match_id, provider, stream_url, stream_type, is_active, created_at, updated_at FROM streams WHERE match_id = ? AND is_active = TRUE ORDER BY id DESC LIMIT 1",
        [matchId]
      );
      if (rows.length > 0) {
        const r = rows[0];
        return {
          id: Number(r.id),
          match_id: Number(r.match_id),
          provider: r.provider,
          stream_url: r.stream_url,
          stream_type: r.stream_type,
          is_active: Boolean(r.is_active),
          created_at: new Date(r.created_at).toISOString(),
          updated_at: new Date(r.updated_at).toISOString(),
        };
      }
      return null;
    } catch {
      // fallback to memory
    }
  }
  const found = memoryStreams.find((s) => s.match_id === matchId && s.is_active);
  return found || null;
}

export async function getActiveStreamsForMatch(matchId: number): Promise<StreamItem[]> {
  if (isDatabaseConnected) {
    try {
      const rows = await queryRows<StreamRow>(
        "SELECT id, match_id, provider, stream_url, stream_type, is_active, created_at, updated_at FROM streams WHERE match_id = ? AND is_active = TRUE ORDER BY id ASC",
        [matchId]
      );
      return rows.map((r) => ({
        id: Number(r.id),
        match_id: Number(r.match_id),
        provider: r.provider,
        stream_url: r.stream_url,
        stream_type: r.stream_type,
        is_active: Boolean(r.is_active),
        created_at: new Date(r.created_at).toISOString(),
        updated_at: new Date(r.updated_at).toISOString(),
      }));
    } catch {
      // fallback to memory
    }
  }
  return memoryStreams.filter((s) => s.match_id === matchId && s.is_active);
}

export async function createStreamRecord(input: {
  match_id: number;
  provider: string;
  stream_url: string;
  stream_type?: "hls" | "dash" | "iframe";
  is_active?: boolean;
}): Promise<StreamItem> {
  const streamType = input.stream_type || (input.stream_url.includes(".mpd") ? "dash" : "hls");
  const isActive = input.is_active ?? true;

  if (isDatabaseConnected) {
    try {
      const result = await execute(
        "INSERT INTO streams (match_id, provider, stream_url, stream_type, is_active) VALUES (?, ?, ?, ?, ?)",
        [input.match_id, input.provider, input.stream_url, streamType, isActive]
      );
      const rows = await queryRows<StreamRow>(
        "SELECT id, match_id, provider, stream_url, stream_type, is_active, created_at, updated_at FROM streams WHERE id = ?",
        [result.insertId]
      );
      if (rows.length > 0) {
        const r = rows[0];
        const item: StreamItem = {
          id: Number(r.id),
          match_id: Number(r.match_id),
          provider: r.provider,
          stream_url: r.stream_url,
          stream_type: r.stream_type,
          is_active: Boolean(r.is_active),
          created_at: new Date(r.created_at).toISOString(),
          updated_at: new Date(r.updated_at).toISOString(),
        };
        // sync with memory
        memoryStreams.unshift(item);
        return item;
      }
    } catch {
      // fallback to memory
    }
  }

  const now = new Date().toISOString();
  const newItem: StreamItem = {
    id: nextMemoryId++,
    match_id: input.match_id,
    provider: input.provider,
    stream_url: input.stream_url,
    stream_type: streamType,
    is_active: isActive,
    created_at: now,
    updated_at: now,
  };
  memoryStreams.unshift(newItem);
  return newItem;
}

export async function updateStreamRecord(
  id: number,
  input: {
    provider?: string;
    stream_url?: string;
    stream_type?: "hls" | "dash" | "iframe";
    is_active?: boolean;
    match_id?: number;
  }
): Promise<StreamItem | null> {
  if (isDatabaseConnected) {
    try {
      const updates: string[] = [];
      const values: any[] = [];
      if (input.provider !== undefined) { updates.push("provider = ?"); values.push(input.provider); }
      if (input.stream_url !== undefined) { updates.push("stream_url = ?"); values.push(input.stream_url); }
      if (input.stream_type !== undefined) { updates.push("stream_type = ?"); values.push(input.stream_type); }
      if (input.is_active !== undefined) { updates.push("is_active = ?"); values.push(input.is_active); }
      if (input.match_id !== undefined) { updates.push("match_id = ?"); values.push(input.match_id); }

      if (updates.length > 0) {
        values.push(id);
        await execute(`UPDATE streams SET ${updates.join(", ")} WHERE id = ?`, values);
        const rows = await queryRows<StreamRow>(
          "SELECT id, match_id, provider, stream_url, stream_type, is_active, created_at, updated_at FROM streams WHERE id = ?",
          [id]
        );
        if (rows.length > 0) {
          const r = rows[0];
          return {
            id: Number(r.id),
            match_id: Number(r.match_id),
            provider: r.provider,
            stream_url: r.stream_url,
            stream_type: r.stream_type,
            is_active: Boolean(r.is_active),
            created_at: new Date(r.created_at).toISOString(),
            updated_at: new Date(r.updated_at).toISOString(),
          };
        }
      }
    } catch {
      // fallback to memory
    }
  }

  const idx = memoryStreams.findIndex((s) => s.id === id);
  if (idx === -1) return null;
  const current = memoryStreams[idx];
  const updated: StreamItem = {
    ...current,
    provider: input.provider ?? current.provider,
    stream_url: input.stream_url ?? current.stream_url,
    stream_type: input.stream_type ?? current.stream_type,
    is_active: input.is_active ?? current.is_active,
    match_id: input.match_id ?? current.match_id,
    updated_at: new Date().toISOString(),
  };
  memoryStreams[idx] = updated;
  return updated;
}

export async function deleteStreamRecord(id: number): Promise<boolean> {
  if (isDatabaseConnected) {
    try {
      const res = await execute("DELETE FROM streams WHERE id = ?", [id]);
      if (res.affectedRows > 0) {
        const memIdx = memoryStreams.findIndex((s) => s.id === id);
        if (memIdx !== -1) memoryStreams.splice(memIdx, 1);
        return true;
      }
    } catch {
      // fallback to memory
    }
  }

  const memIdx = memoryStreams.findIndex((s) => s.id === id);
  if (memIdx !== -1) {
    memoryStreams.splice(memIdx, 1);
    return true;
  }
  return false;
}

export const streamModel = {
  findAll: listAllStreams,
  listAllStreams,
  getActiveStreamForMatch,
  getActiveStreamsForMatch,
  createStreamRecord,
  updateStreamRecord,
  deleteStreamRecord,
};