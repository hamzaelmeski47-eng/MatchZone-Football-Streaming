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
    if (target === "query") {
      Object.defineProperty(req, "query", {
        value: parsed,
        writable: true,
        enumerable: true,
        configurable: true,
      });
    } else {
      req[target] = parsed as never;
    }
    next();
  };
}