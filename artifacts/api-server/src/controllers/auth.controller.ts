import bcrypt from "bcrypt";
import type { Request, Response } from "express";
import { createAccessToken } from "../middlewares/auth.middleware";
import {
  createUser,
  findUserByEmail,
  findUserById,
  updateUser,
} from "../models/user.model";
import { AppError } from "../utils/app-error";

const SALT_ROUNDS = 12;

function serializeUser(user: NonNullable<Awaited<ReturnType<typeof findUserById>>>) {
  return {
    id: user.id,
    email: user.email,
    displayName: user.display_name,
    role: user.role,
    avatarUrl: user.avatar_url,
    createdAt: user.created_at,
    updatedAt: user.updated_at,
  };
}

export async function register(req: Request, res: Response) {
  const { email, password, displayName } = req.body;
  const existing = await findUserByEmail(email);
  if (existing) {
    throw new AppError(409, "An account with that email already exists");
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const user = await createUser({ email, passwordHash, displayName });
  if (!user) {
    throw new AppError(500, "Unable to create account");
  }

  const safeUser = serializeUser(user);
  res.status(201).json({ user: safeUser, token: createAccessToken({
    id: safeUser.id,
    email: safeUser.email,
    displayName: safeUser.displayName,
    role: safeUser.role,
  }) });
}

export async function login(req: Request, res: Response) {
  const { email, password } = req.body;
  const user = await findUserByEmail(email);
  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    throw new AppError(401, "Invalid email or password");
  }

  const safeUser = serializeUser(user);
  res.json({ user: safeUser, token: createAccessToken({
    id: safeUser.id,
    email: safeUser.email,
    displayName: safeUser.displayName,
    role: safeUser.role,
  }) });
}

export async function getCurrentUser(req: Request, res: Response) {
  const user = await findUserById(req.user!.id);
  if (!user) {
    throw new AppError(401, "User account no longer exists");
  }
  res.json({ user: serializeUser(user) });
}

export async function updateCurrentUser(req: Request, res: Response) {
  const user = await updateUser(req.user!.id, {
    displayName: req.body.displayName,
    avatarUrl: req.body.avatarUrl,
  });
  if (!user) {
    throw new AppError(404, "User account not found");
  }
  res.json({ user: serializeUser(user) });
}