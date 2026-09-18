import type { RequestHandler } from "express";

type ValidationTarget = "body" | "query" | "params";
type Parser<T> = {
  parse: (value: unknown) => T;
};

export function validate<T>(
  schema: Parser<T>,
  target: ValidationTarget,
): RequestHandler {
  return (req, _res, next) => {
    const parsed = schema.parse(req[target]);
    req[target] = parsed as never;
    next();
  };
}