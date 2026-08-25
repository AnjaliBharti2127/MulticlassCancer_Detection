import type { NextFunction, Request, Response } from "express";
import { createCaseSchema } from "../validation/caseValidation";
import { ApiError } from "../utils/ApiError";

export function validateCaseUploadBody(req: Request, _res: Response, next: NextFunction): void {
  const parsed = createCaseSchema.safeParse(req.body);
  if (!parsed.success) {
    const errors = parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`);
    next(ApiError.badRequest("Validation failed", errors));
    return;
  }

  req.body = parsed.data;
  next();
}
