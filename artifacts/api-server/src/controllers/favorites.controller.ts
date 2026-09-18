import type { Request, Response } from "express";
import {
  addFavorite,
  listFavorites,
  removeFavorite,
} from "../models/favorite.model";
import { AppError } from "../utils/app-error";

export async function getFavorites(req: Request, res: Response) {
  res.json({
    favorites: await listFavorites(
      req.user!.id,
      req.query.entityType as "match" | "team" | "competition" | undefined,
    ),
  });
}

export async function createFavorite(req: Request, res: Response) {
  const favorite = await addFavorite(
    req.user!.id,
    req.body.entityType,
    req.body.entityId,
  );
  res.status(201).json({ favorite });
}

export async function deleteFavorite(req: Request, res: Response) {
  const removed = await removeFavorite(
    req.user!.id,
    req.params.entityType as "match" | "team" | "competition",
    Number(req.params.entityId),
  );
  if (!removed) throw new AppError(404, "Favorite not found");
  res.status(204).send();
}