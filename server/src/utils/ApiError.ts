/**
 * Custom error class used across the app for predictable, HTTP-status-aware
 * errors. Thrown from controllers/services and caught by errorHandler, which
 * turns it into the standard { success: false, error: {...} } response.
 */
export class ApiError extends Error {
  statusCode: number;
  code: string;
  details: string[];

  constructor(statusCode: number, code: string, message: string, details: string[] = []) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message: string, details: string[] = []): ApiError {
    return new ApiError(400, "VALIDATION_ERROR", message, details);
  }

  static notFound(message: string): ApiError {
    return new ApiError(404, "NOT_FOUND", message);
  }

  static conflict(message: string): ApiError {
    return new ApiError(409, "CONFLICT", message);
  }

  static unavailable(message: string): ApiError {
    return new ApiError(503, "SERVICE_UNAVAILABLE", message);
  }

  static internal(message = "Internal server error"): ApiError {
    return new ApiError(500, "INTERNAL_ERROR", message);
  }
}
