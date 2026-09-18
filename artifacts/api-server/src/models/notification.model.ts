import type { RowDataPacket } from "mysql2";
import { execute, queryRows } from "../database/mysql";

export interface NotificationRow extends RowDataPacket {
  id: number;
  user_id: number;
  title: string;
  message: string;
  type: string;
  read_at: Date | null;
  created_at: Date;
}

export async function listNotifications(userId: number, unreadOnly = false) {
  return queryRows<NotificationRow>(
    `SELECT id, user_id, title, message, type, read_at, created_at
     FROM notifications
     WHERE user_id = ? AND (? = FALSE OR read_at IS NULL)
     ORDER BY created_at DESC`,
    [userId, unreadOnly],
  );
}

export async function markNotificationRead(userId: number, id: number) {
  const result = await execute(
    "UPDATE notifications SET read_at = COALESCE(read_at, CURRENT_TIMESTAMP) WHERE id = ? AND user_id = ?",
    [id, userId],
  );
  return result.affectedRows > 0;
}