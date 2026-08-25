import type { NextFunction, Request, Response } from "express";
import type { ZodSchema } from "zod";
import { ApiError } from "../utils/ApiError";

/**
 * Validates `req.body` against a Zod schema. On success, replaces
 * `req.body` with the parsed (and type-coerced) data. On failure, forwards
 * a 400 ApiError with a readable list of field errors.
 */
export function validateRequest(schema: ZodSchema) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const errors = result.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`);
      next(ApiError.badRequest("Validation failed", errors));
      return;
    }
    req.body = result.data;
    next();
  };
}
