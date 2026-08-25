import type {
  ExplainabilityResult,
  PredictionJobCreated,
  PredictionJobStatusResponse,
  PredictionResult,
} from "../types/prediction";

import { apiPostForm, ApiClientError } from "./apiClient";

/**
 * Friendly, user-facing copy for known backend/ML error codes (see
 * server/src/services/mlPredictionService.ts and
 * ml-service/app/core/errors.py for where each code originates).
 */
const FRIENDLY_ERROR_MESSAGES: Record<string, string> = {
  MODEL_NOT_LOADED: "The prediction model has not been configured yet.",
  ML_SERVICE_TIMEOUT: "The analysis is taking too long. Please try again.",
  ML_SERVICE_UNAVAILABLE: "The prediction service is temporarily unavailable. Please try again shortly.",
  INVALID_ML_RESPONSE: "The prediction service returned an unexpected response. Please try again.",
  NETWORK_ERROR: "Could not reach the server. Please check your connection and try again.",
  TIMEOUT: "The request took too long. Please try again.",
};

function friendlyPredictionErrorMessage(error: unknown): string {
  if (error instanceof ApiClientError && error.code && FRIENDLY_ERROR_MESSAGES[error.code]) {
    return FRIENDLY_ERROR_MESSAGES[error.code];
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return "Prediction request failed.";
}

interface RealJob {
  jobId: string;
  result?: PredictionResult;
  error?: string;
  createdAt: string;
}

type PredictionApiResponse =
  | PredictionResult
  | {
      prediction?: PredictionResult;
      data?: PredictionResult | { prediction?: PredictionResult };
    };

const jobs = new Map<string, RealJob>();

// Fallbacks for whatever the backend might omit, matching the real
// PredictionResult shape used by PredictionCard.tsx:
//   result.model.name / result.model.version
//   result.predictedClass (string)
//   result.confidence (number)
//   result.probabilities: { className: string; probability: number }[]
const FALLBACK_MODEL: PredictionResult["model"] = {
  name: "Unknown model",
  version: "N/A",
};

const FALLBACK_EXPLAINABILITY: PredictionResult["explainability"] = {
  status: "not_requested",
};

function normalizePredictionResult(rawResult: PredictionResult): PredictionResult {
  return {
    ...rawResult,
    model: rawResult.model ?? FALLBACK_MODEL,
    predictedClass: rawResult.predictedClass ?? "Unknown",
    confidence: rawResult.confidence ?? 0,
    probabilities: rawResult.probabilities ?? [],
    explainability: rawResult.explainability ?? FALLBACK_EXPLAINABILITY,
  };
}

function extractPredictionResult(
  response: PredictionApiResponse
): PredictionResult {
  let rawResult: PredictionResult | undefined;

  if (response && "predictedClass" in response && response.predictedClass) {
    rawResult = response as PredictionResult;
  } else if ("prediction" in response && response.prediction) {
    rawResult = response.prediction;
  } else if (
    "data" in response &&
    response.data &&
    "predictedClass" in response.data &&
    response.data.predictedClass
  ) {
    rawResult = response.data as PredictionResult;
  } else if (
    "data" in response &&
    response.data &&
    "prediction" in response.data &&
    response.data.prediction
  ) {
    rawResult = response.data.prediction;
  }

  if (!rawResult) {
    throw new Error("The backend returned an invalid prediction response.");
  }

  return normalizePredictionResult(rawResult);
}

export async function createPredictionJob(
  file: File,
  options?: {
    caseId?: string;
    generateExplainability?: boolean;
  }
): Promise<PredictionJobCreated> {
  const jobId = crypto.randomUUID();
  const createdAt = new Date().toISOString();

  jobs.set(jobId, {
    jobId,
    createdAt,
  });

  try {
    const formData = new FormData();

    formData.append("slideImage", file);

    if (options?.caseId) {
      formData.append("caseId", options.caseId);
    }

    if (options?.generateExplainability !== undefined) {
      formData.append(
        "generateExplainability",
        String(options.generateExplainability)
      );
    }

    const response = await apiPostForm<PredictionApiResponse>(
      "/predictions",
      formData
    );

    const prediction = extractPredictionResult(response);

    const normalizedResult: PredictionResult = {
      ...prediction,
      jobId: prediction.jobId ?? jobId,
      caseId: prediction.caseId ?? options?.caseId,
    };

    jobs.set(jobId, {
      jobId,
      result: normalizedResult,
      createdAt,
    });
  } catch (error) {
    jobs.set(jobId, {
      jobId,
      createdAt,
      error: friendlyPredictionErrorMessage(error),
    });
  }

  return {
    jobId,
    status: "pending",
    createdAt,
  };
}

export async function getPredictionJobStatus(
  jobId: string
): Promise<PredictionJobStatusResponse> {
  const job = jobs.get(jobId);
  const updatedAt = new Date().toISOString();

  if (!job) {
    return {
      jobId,
      status: "failed",
      updatedAt,
      error: {
        code: "job_not_found",
        message: "No prediction job matches this id.",
      },
    };
  }

  if (job.error) {
    return {
      jobId,
      status: "failed",
      updatedAt,
      error: {
        code: "prediction_failed",
        message: job.error,
      },
    };
  }

  if (job.result) {
    return {
      jobId,
      status: "completed",
      progress: 100,
      updatedAt,
    };
  }

  return {
    jobId,
    status: "processing",
    stage: "inference",
    updatedAt,
  };
}

export async function getPredictionResult(
  jobId: string
): Promise<PredictionResult> {
  const job = jobs.get(jobId);

  if (!job) {
    throw new Error("No prediction job matches this id.");
  }

  if (job.error) {
    throw new Error(job.error);
  }

  if (!job.result) {
    throw new Error("Prediction is still processing.");
  }

  return normalizePredictionResult(job.result);
}

export async function getExplainability(
  jobId: string
): Promise<ExplainabilityResult> {
  const job = jobs.get(jobId);

  if (!job?.result) {
    throw new Error("Prediction result is unavailable.");
  }

  const explainability = job.result.explainability;

  if (
    !explainability ||
    explainability.status !== "ready" ||
    !("heatmapUrl" in explainability) ||
    !("overlayUrl" in explainability)
  ) {
    throw new Error(
      "Explainability images are not available from the backend yet."
    );
  }

  return {
    predictionId: job.result.predictionId,
    method: "grad-cam",
    originalImageUrl:
      "originalImageUrl" in explainability
        ? String(explainability.originalImageUrl)
        : "",
    heatmapUrl: String(explainability.heatmapUrl),
    overlayUrl: String(explainability.overlayUrl),
    generatedAt: new Date().toISOString(),
  };
}