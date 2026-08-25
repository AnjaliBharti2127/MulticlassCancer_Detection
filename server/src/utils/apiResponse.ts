import type { Response } from "express";

/**
 * Sends the app-wide success envelope: { success: true, data, meta }.
 * `meta` is omitted from the JSON when not provided (e.g. non-paginated
 * single-resource responses) to keep payloads clean.
 */
export function sendSuccess<T>(res: Response, data: T, options?: { status?: number; meta?: Record<string, unknown> }): void {
  const body: { success: true; data: T; meta?: Record<string, unknown> } = { success: true, data };
  if (options?.meta) body.meta = options.meta;
  res.status(options?.status ?? 200).json(body);
}
