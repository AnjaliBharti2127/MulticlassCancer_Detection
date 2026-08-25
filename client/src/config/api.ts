/**
 * Central place for backend-related configuration.
 *
 * Patients, cases, reports, dashboard, and prediction data all come from the
 * real Node/Express backend (see ../services/apiClient.ts and the individual
 * service files). The Node backend proxies prediction requests to the
 * FastAPI ml-service, which can take noticeably longer than a normal CRUD
 * request — that's why predictionTimeoutMs is separate from timeoutMs.
 */

/** Base URL of the backend API. Falls back to the local dev backend. */
export const API_CONFIG = {
  baseUrl: import.meta.env.VITE_API_BASE_URL ?? "http://localhost:5000/api/v1",
  timeoutMs: 30_000,
  predictionTimeoutMs: 120_000,
};

/** REST endpoint paths, grouped by resource. Prefixed with API_CONFIG.baseUrl later. */
export const API_ENDPOINTS = {
  patients: "/patients",
  cases: "/cases",
  reports: "/reports",
  predictions: "/predictions",
  dashboardSummary: "/dashboard/summary",
};

/** Rules for the slide image upload widget. Must mirror the backend's ALLOWED_MIME_TYPES (see server/src/middleware/upload.ts). */
export const UPLOAD_CONFIG = {
  acceptedImageTypes: ["image/jpeg", "image/jpg", "image/png", "image/tiff", "image/x-tiff"],
  acceptedExtensions: [".jpg", ".jpeg", ".png", ".tif", ".tiff"],
  maxFileSizeBytes: 5 * 1024 * 1024, // 5 MB
};

/** Timing used while polling an async prediction job for status updates. */
export const PREDICTION_CONFIG = {
  pollIntervalMs: 1500,
  pollTimeoutMs: 60_000,
};

/** Default page size used by paginated list views (patients, cases, reports). */
export const PAGINATION_CONFIG = {
  defaultPageSize: 10,
};
