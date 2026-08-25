import type { CaseDetail, CreateCasePayload } from "../types/case";
import type { CasesQuery, PaginatedResponse } from "../types/pagination";
import { apiGet, apiPostForm, toAbsoluteFileUrl } from "./apiClient";

/**
 * All case-related data access lives here (single source of truth).
 * Backed by GET/POST /api/cases (see backend/src/routes/caseRoutes.ts).
 *
 * Predictions are persisted by POST /predictions when a caseId is supplied.
 * Explainability remains a temporary overlay until real Grad-CAM is integrated.
 */

// caseId -> fields to overlay onto the backend's case data for this session only.
const sessionOverrides = new Map<string, Partial<CaseDetail>>();

function withOverride(caseDetail: CaseDetail): CaseDetail {
  const override = sessionOverrides.get(caseDetail.id);
  return override ? { ...caseDetail, ...override } : caseDetail;
}

function toDisplayCase(raw: CaseDetail): CaseDetail {
  return withOverride({
    ...raw,
    slideImageUrl: toAbsoluteFileUrl(raw.slideImageUrl),
    explainability: raw.explainability?.heatmapUrl
      ? { ...raw.explainability, heatmapUrl: toAbsoluteFileUrl(raw.explainability.heatmapUrl) }
      : raw.explainability,
  });
}

export async function getCases(query: CasesQuery = {}): Promise<PaginatedResponse<CaseDetail>> {
  const response = await apiGet<PaginatedResponse<CaseDetail>>("/cases", {
    search: query.search,
    status: query.status,
    page: query.page,
    pageSize: query.pageSize,
    sortBy: query.sortBy,
    sortDirection: query.sortDirection,
  });
  return { ...response, items: response.items.map(toDisplayCase) };
}

export async function getCaseById(id: string): Promise<CaseDetail | null> {
  try {
    const { case: caseDetail } = await apiGet<{ case: CaseDetail }>(`/cases/${encodeURIComponent(id)}`);
    return toDisplayCase(caseDetail);
  } catch {
    return null;
  }
}

export async function createCase(payload: CreateCasePayload): Promise<CaseDetail> {
  const formData = new FormData();
  formData.append("patientId", payload.patientId);
  formData.append("specimenType", payload.specimenType);
  if (payload.notes) formData.append("notes", payload.notes);
  formData.append("slideImage", payload.file);

  const { case: caseDetail } = await apiPostForm<{ case: CaseDetail }>("/cases", formData);
  return toDisplayCase(caseDetail);
}



/**
 * Temporary explainability overlay. Replace this only when the ML service
 * returns persisted Grad-CAM assets.
 */
export async function attachExplainabilityToCase(
  caseId: string,
  explainability: { heatmapUrl: string; overlayUrl: string }
): Promise<CaseDetail | null> {
  const existing = await getCaseById(caseId);
  if (!existing) return null;

  const updated: CaseDetail = {
    ...existing,
    explainability: {
      status: "ready",
      heatmapUrl: explainability.heatmapUrl,
      overlayUrl: explainability.overlayUrl,
    },
  };

  sessionOverrides.set(caseId, { ...sessionOverrides.get(caseId), ...updated });
  return updated;
}
