import type { DashboardSummary } from "../types/dashboard";
import { apiGet } from "./apiClient";

/**
 * Backed by GET /api/dashboard/summary (see backend/src/routes/dashboardRoutes.ts).
 * The backend response includes a couple of extra fields (totalPatients,
 * totalReports) that this frontend type doesn't use — they're ignored here.
 */
export async function getDashboardSummary(): Promise<DashboardSummary> {
  return apiGet<DashboardSummary>("/dashboard/summary");
}
