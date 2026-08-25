import type { CaseStatus } from "./dashboard";

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export type SortDirection = "asc" | "desc";

export interface ListQuery {
  page?: number;
  pageSize?: number;
  search?: string;
  sortBy?: string;
  sortDirection?: SortDirection;
}

export interface CasesQuery extends ListQuery {
  patientId?: string;
  status?: CaseStatus;
  cancerType?: string;
}

export interface PatientsQuery extends ListQuery {
  gender?: string;
}

export type ReportStatus = "draft" | "finalized" | "amended";

export interface ReportsQuery extends ListQuery {
  status?: ReportStatus;
  caseId?: string;
}
