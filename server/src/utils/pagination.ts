import type { Request } from "express";

export interface ParsedListQuery {
  search: string;
  page: number;
  pageSize: number;
  sortBy: string;
  sortDirection: "asc" | "desc";
}

/**
 * Reads and normalizes the common list query params (search, page, pageSize,
 * sortBy, sortDirection) used by the patients/cases/reports list endpoints.
 * Matches the frontend's ListQuery shape (src/types/pagination.ts).
 */
export function parseListQuery(req: Request, defaultSortBy: string): ParsedListQuery {
  const page = Math.max(1, Number(req.query.page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize ?? req.query.limit) || 10));
  const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
  const sortBy = typeof req.query.sortBy === "string" ? req.query.sortBy : defaultSortBy;
  const sortDirection = req.query.sortDirection === "asc" || req.query.sortOrder === "asc" ? "asc" : "desc";

  return { search, page, pageSize, sortBy, sortDirection };
}
