import type { NextFunction, Request, Response } from "express";
import mongoose from "mongoose";
import multer from "multer";
import { ApiError } from "../utils/ApiError";
import { isProduction } from "../config/env";
import { logger } from "../utils/logger";

/**
 * Single place that turns any thrown/forwarded error into the app-wide
 * error envelope: { success: false, error: { code, message, details }, requestId }.
 * Must be registered last, after all routes.
 */
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  let statusCode = 500;
  let code = "INTERNAL_ERROR";
  let message = "Internal server error";
  let details: string[] = [];

  if (err instanceof ApiError) {
    statusCode = err.statusCode;
    code = err.code;
    message = err.message;
    details = err.details;
  } else if (err instanceof mongoose.Error.CastError) {
    statusCode = 400;
    code = "VALIDATION_ERROR";
    message = "Invalid id format";
  } else if (err instanceof mongoose.Error.ValidationError) {
    statusCode = 400;
    code = "VALIDATION_ERROR";
    message = "Validation failed";
    details = Object.values(err.errors).map((e) => e.message);
  } else if ((err as { code?: number }).code === 11000) {
    statusCode = 409;
    code = "CONFLICT";
    message = "Duplicate value for a unique field";
  } else if (err instanceof multer.MulterError) {
    statusCode = 400;
    code = "UPLOAD_ERROR";
    message = err.code === "LIMIT_FILE_SIZE" ? "Uploaded file is too large" : `Upload error: ${err.message}`;
  } else if (err instanceof Error) {
    message = isProduction ? message : err.message;
  }

  logger.error({ requestId: req.id, statusCode, code, err: err instanceof Error ? err.message : err }, "request failed");

  res.status(statusCode).json({
    success: false,
    error: { code, message, details },
    requestId: req.id,
  });
}
