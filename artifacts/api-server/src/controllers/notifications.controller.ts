import type { Request, Response } from "express";
import {
  listNotifications,
  markNotificationRead,
} from "../models/notification.model";
import { AppError } from "../utils/app-error";

export async function getNotifications(req: Request, res: Response) {
  res.json({
    notifications: await listNotifications(
      req.user!.id,
      req.query.unreadOnly as boolean | undefined,
    ),
  });
}

export async function markRead(req: Request, res: Response) {
  const updated = await markNotificationRead(req.user!.id, Number(req.params.id));
  if (!updated) throw new AppError(404, "Notification not found");
  res.json({ success: true });
}