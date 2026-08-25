import type { NextFunction, Request, RequestHandler, Response } from "express";

/**
 * Wraps an async route/controller function so any rejected promise is
 * forwarded to Express's error handling middleware instead of crashing
 * the process or requiring try/catch in every controller.
 */
export function asyncHandler(fn: RequestHandler): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
