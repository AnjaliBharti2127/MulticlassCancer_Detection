import { API_CONFIG } from "../config/api";

/**
 * Thrown whenever a backend request fails — either a network error, a
 * timeout, or a response with `{ success: false }`. Carries the readable
 * `message` the backend sent (or a fallback) plus the HTTP status if any.
 */
export class ApiClientError extends Error {
  status?: number;
  errors: string[];
  code?: string;

  constructor(message: string, status?: number, errors: string[] = [], code?: string) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
    this.errors = errors;
    this.code = code;
  }
}

/** Shape every backend JSON response follows (see backend/src/middleware/errorHandler.ts). */
interface BackendEnvelope<T> {
  success: boolean;
  data?: T;
  meta?: Record<string, unknown>;
  // Error responses (see errorHandler.ts) nest code/message/details under `error`,
  // not at the top level.
  error?: {
    code?: string;
    message?: string;
    details?: string[];
  };
}

/** Optional per-request overrides shared by all request helpers below. */
interface RequestOptions {
  /** Overrides API_CONFIG.timeoutMs for this request (e.g. predictions). */
  timeoutMs?: number;
  /** External abort signal the caller can use to cancel the request early. */
  signal?: AbortSignal;
}

/**
 * Wraps `fetch` with a timeout so a hung request doesn't block the UI forever.
 * Also honors an optional caller-supplied AbortSignal, so a component can
 * cancel an in-flight request (e.g. on unmount) independently of the timeout.
 */
async function fetchWithTimeout(input: string, init: RequestInit, options?: RequestOptions): Promise<Response> {
  const controller = new AbortController();
  const timeoutMs = options?.timeoutMs ?? API_CONFIG.timeoutMs;
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const onExternalAbort = () => controller.abort();
  options?.signal?.addEventListener("abort", onExternalAbort);

  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } catch (err) {
    if (options?.signal?.aborted) {
      throw new ApiClientError("The request was cancelled.", undefined, [], "CANCELLED");
    }
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new ApiClientError("The request took too long. Please try again.", undefined, [], "TIMEOUT");
    }
    throw new ApiClientError(
      "Could not reach the server. Is the backend running?",
      undefined,
      [],
      "NETWORK_ERROR"
    );
  } finally {
    clearTimeout(timer);
    options?.signal?.removeEventListener("abort", onExternalAbort);
  }
}

/** Parses a backend response and unwraps `data`, throwing ApiClientError on failure. */
async function handleResponse<T>(res: Response): Promise<T> {
  // A 204 No Content response has no body to parse; treat it as success with no data.
  if (res.status === 204) {
    return undefined as T;
  }

  let body: BackendEnvelope<T> | undefined;
  try {
    body = await res.json();
  } catch {
    // Non-JSON response (e.g. server crashed with an HTML error page).
  }

  if (!res.ok || !body?.success) {
    const message = body?.error?.message ?? `Request failed with status ${res.status}`;
    throw new ApiClientError(message, res.status, body?.error?.details ?? [], body?.error?.code);
  }

  return body.data as T;
}

/** GET request. `params` values are appended as query string params (undefined/"" skipped). */
export async function apiGet<T>(
  path: string,
  params?: Record<string, string | number | undefined>,
  options?: RequestOptions
): Promise<T> {
  const url = new URL(`${API_CONFIG.baseUrl}${path}`);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== "") url.searchParams.set(key, String(value));
    }
  }
  const res = await fetchWithTimeout(url.toString(), { method: "GET" }, options);
  return handleResponse<T>(res);
}

/** POST request with a JSON body. */
export async function apiPostJson<T>(path: string, body: unknown, options?: RequestOptions): Promise<T> {
  const res = await fetchWithTimeout(
    `${API_CONFIG.baseUrl}${path}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
    options
  );
  return handleResponse<T>(res);
}


/** PATCH request with a JSON body. */
export async function apiPatchJson<T>(path: string, body: unknown, options?: RequestOptions): Promise<T> {
  const res = await fetchWithTimeout(
    `${API_CONFIG.baseUrl}${path}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
    options
  );
  return handleResponse<T>(res);
}

/**
 * POST request with a multipart/form-data body (file upload).
 * Do not set a Content-Type header — the browser adds the correct
 * multipart boundary automatically when given a FormData body.
 */
export async function apiPostForm<T>(path: string, formData: FormData, options?: RequestOptions): Promise<T> {
  const res = await fetchWithTimeout(
    `${API_CONFIG.baseUrl}${path}`,
    {
      method: "POST",
      body: formData,
    },
    options
  );
  return handleResponse<T>(res);
}

/**
 * Converts a backend-relative path (e.g. "/uploads/slide.png") into a full
 * URL the browser can load, using the backend's origin. Uses the URL API
 * rather than a suffix regex so it works regardless of how many path
 * segments API_CONFIG.baseUrl has (e.g. "/api/v1", not just "/api") —
 * e.g. baseUrl "http://localhost:5000/api/v1" -> origin "http://localhost:5000".
 * Already-absolute URLs are returned unchanged.
 */
export function toAbsoluteFileUrl(pathOrUrl: string | undefined): string | undefined {
  if (!pathOrUrl) return undefined;
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  const origin = new URL(API_CONFIG.baseUrl).origin;
  return `${origin}${pathOrUrl.startsWith("/") ? "" : "/"}${pathOrUrl}`;
}
