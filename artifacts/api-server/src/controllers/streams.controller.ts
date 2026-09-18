import type { Request, Response } from "express";
import {
  createStream,
  listActiveStreams,
  removeStream,
} from "../models/stream.model";
import { AppError } from "../utils/app-error";

export async function getMatchStreams(req: Request, res: Response) {
  res.json({ streams: await listActiveStreams(Number(req.params.matchId)) });
}

export async function createStreamController(req: Request, res: Response) {
  const stream = await createStream(req.body);
  if (!stream) throw new AppError(500, "Unable to create stream");
  res.status(201).json({ stream });
}

export async function deleteStream(req: Request, res: Response) {
  const removed = await removeStream(Number(req.params.id));
  if (!removed) throw new AppError(404, "Stream not found");
  res.status(204).send();
}