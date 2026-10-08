import type { RowDataPacket } from "mysql2";
import { execute, queryRows } from "../database/mysql";

export type FavoriteEntityType = "match" | "team" | "competition";

export interface FavoriteRow extends RowDataPacket {
  entity_type: FavoriteEntityType;
  entity_id: number;
  created_at: Date;
}

const memoryFavorites = new Set<string>();

export async function listFavorites(userId: number, entityType?: FavoriteEntityType) {
  try {
    return await queryRows<FavoriteRow>(
      "SELECT entity_type, entity_id, created_at FROM favorites WHERE user_id = ? AND (? IS NULL OR entity_type = ?) ORDER BY created_at DESC",
      [userId, entityType ?? null, entityType ?? null],
    );
  } catch {
    const list: FavoriteRow[] = [];
    for (const item of memoryFavorites) {
      const [uId, type, eId] = item.split(':');
      if (Number(uId) === userId && (!entityType || type === entityType)) {
        list.push({
          entity_type: type as FavoriteEntityType,
          entity_id: Number(eId),
          created_at: new Date(),
        } as any);
      }
    }
    return list;
  }
}

export async function addFavorite(
  userId: number,
  entityType: FavoriteEntityType,
  entityId: number,
) {
  try {
    await execute(
      "INSERT IGNORE INTO favorites (user_id, entity_type, entity_id) VALUES (?, ?, ?)",
      [userId, entityType, entityId],
    );
  } catch {
    memoryFavorites.add(`${userId}:${entityType}:${entityId}`);
  }
  return { entityType, entityId };
}

export async function removeFavorite(
  userId: number,
  entityType: FavoriteEntityType,
  entityId: number,
) {
  try {
    const result = await execute(
      "DELETE FROM favorites WHERE user_id = ? AND entity_type = ? AND entity_id = ?",
      [userId, entityType, entityId],
    );
    return result.affectedRows > 0;
  } catch {
    return memoryFavorites.delete(`${userId}:${entityType}:${entityId}`);
  }
}