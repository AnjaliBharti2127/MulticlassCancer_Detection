import type { Request, Response } from "express";

/** Catches any request that didn't match a route. Registered after all routes. */
export function notFound(req: Request, res: Response): void {
  res.status(404).json({
    success: false,
    error: {
      code: "NOT_FOUND",
      message: `Route not found: ${req.method} ${req.originalUrl}`,
      details: [],
    },
    requestId: req.id,
  });
}
