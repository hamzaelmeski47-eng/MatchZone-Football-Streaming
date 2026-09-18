import jwt from "jsonwebtoken";
import type { RequestHandler } from "express";
import { env } from "../config/env";
import { AppError } from "../utils/app-error";

export type UserRole = "user" | "admin";

export type AuthUser = {
  id: number;
  email: string;
  displayName: string;
  role: UserRole;
};

type JwtPayload = AuthUser & {
  iat: number;
  exp: number;
};

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export function createAccessToken(user: AuthUser): string {
  return jwt.sign(user, env.jwtSecret, {
    subject: String(user.id),
    expiresIn: "7d",
  });
}

export const authenticate: RequestHandler = (req, _res, next) => {
  const header = req.header("authorization");
  const token = header?.startsWith("Bearer ")
    ? header.slice("Bearer ".length)
    : undefined;

  if (!token) {
    next(new AppError(401, "Authentication required"));
    return;
  }

  try {
    const payload = jwt.verify(token, env.jwtSecret) as JwtPayload;
    req.user = {
      id: Number(payload.id),
      email: payload.email,
      displayName: payload.displayName,
      role: payload.role,
    };
    next();
  } catch {
    next(new AppError(401, "Invalid or expired token"));
  }
};

export function requireRole(...roles: UserRole[]): RequestHandler {
  return (req, _res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      next(new AppError(403, "You do not have permission to perform this action"));
      return;
    }
    next();
  };
}