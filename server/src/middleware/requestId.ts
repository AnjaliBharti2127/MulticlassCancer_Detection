import crypto from "crypto";
import type { NextFunction, Request, Response } from "express";

/**
 * Assigns a unique id to every request (reused from the caller's
 * X-Request-Id header if present, e.g. behind a gateway/load balancer).
 * Used in log lines and in every error response so a user-reported issue
 * can be traced to one exact request.
 */
export function requestId(req: Request, res: Response, next: NextFunction): void {
  const incoming = req.headers["x-request-id"];
  const id = typeof incoming === "string" && incoming.trim() ? incoming : crypto.randomUUID();
  req.id = id;
  res.setHeader("X-Request-Id", id);
  next();
}
