import type { PaginatedResponse, SortDirection } from "../types/pagination";

interface PaginateOptions<T> {
  search?: string;
  matchesSearch?: (item: T, term: string) => boolean;
  sortBy?: string;
  sortDirection?: SortDirection;
  getSortValue?: (item: T, sortBy: string) => string | number;
  page?: number;
  pageSize?: number;
}

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 10;

export function paginateList<T>(items: T[], options: PaginateOptions<T>): PaginatedResponse<T> {
  const { search, matchesSearch, sortBy, sortDirection = "asc", getSortValue } = options;

  let result = items;

  const term = search?.trim().toLowerCase();
  if (term && matchesSearch) {
    result = result.filter((item) => matchesSearch(item, term));
  }

  if (sortBy && getSortValue) {
    result = result.toSorted((a, b) => {
      const aValue = getSortValue(a, sortBy);
      const bValue = getSortValue(b, sortBy);
      const comparison =
        typeof aValue === "number" && typeof bValue === "number"
          ? aValue - bValue
          : String(aValue).localeCompare(String(bValue));
      return sortDirection === "asc" ? comparison : -comparison;
    });
  }

  const page = options.page && options.page > 0 ? options.page : DEFAULT_PAGE;
  const pageSize = options.pageSize && options.pageSize > 0 ? options.pageSize : DEFAULT_PAGE_SIZE;
  const total = result.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const start = (page - 1) * pageSize;

  return {
    items: result.slice(start, start + pageSize),
    total,
    page,
    pageSize,
    totalPages,
  };
}
