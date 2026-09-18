import type { ErrorRequestHandler, RequestHandler } from "express";
import { ZodError } from "zod";
import { AppError } from "../utils/app-error";

export const notFoundHandler: RequestHandler = (req, _res, next) => {
  next(new AppError(404, `Route not found: ${req.method} ${req.originalUrl}`));
};

export const errorHandler: ErrorRequestHandler = (error, req, res, _next) => {
  if (error instanceof ZodError) {
    res.status(400).json({
      error: "Validation failed",
      details: error.flatten().fieldErrors,
    });
    return;
  }

  if (error instanceof AppError) {
    res.status(error.statusCode).json({
      error: error.message,
      ...(error.details ? { details: error.details } : {}),
    });
    return;
  }

  if (error && typeof error === "object" && "code" in error) {
    const code = (error as { code?: string }).code;
    if (code === "ER_DUP_ENTRY") {
      res.status(409).json({ error: "A record with those unique values already exists" });
      return;
    }
    if (code === "ER_NO_REFERENCED_ROW_2") {
      res.status(400).json({ error: "A referenced record does not exist" });
      return;
    }
  }

  req.log.error({ err: error }, "Unhandled request error");
  res.status(500).json({ error: "Internal server error" });
};