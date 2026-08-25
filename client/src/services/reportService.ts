import type { ReportDetail } from "../types/report";
import type { PaginatedResponse, ReportsQuery, ReportStatus } from "../types/pagination";
import { apiGet, apiPostJson } from "./apiClient";

export interface SaveReportPayload {
  caseId: string;
  pathologist: string;
  diagnosis: string;
  findings: string;
  recommendation: string;
  status: ReportStatus;
}

export async function getReports(query: ReportsQuery = {}): Promise<PaginatedResponse<ReportDetail>> {
  return apiGet<PaginatedResponse<ReportDetail>>("/reports", {
    search: query.search, status: query.status, page: query.page, pageSize: query.pageSize,
    sortBy: query.sortBy, sortDirection: query.sortDirection,
  });
}

export async function getReportById(id: string): Promise<ReportDetail | null> {
  try {
    const { report } = await apiGet<{ report: ReportDetail }>(`/reports/${encodeURIComponent(id)}`);
    return report;
  } catch (error: any) {
    if (error?.status === 404) return null;
    throw error;
  }
}

export async function saveReport(payload: SaveReportPayload): Promise<ReportDetail> {
  const { report } = await apiPostJson<{ report: ReportDetail }>("/reports", payload);
  return report;
}
