/**
 * Shared by CaseDetail / ReportDetail — stored, finalized analysis records.
 * Kept separate from the live async prediction job flow below.
 */
export interface ClassPrediction {
  className: string;
  confidence: number;
}

/** POST /api/v1/predictions response */
export interface PredictionJobCreated {
  jobId: string;
  status: "pending";
  createdAt: string;
}

export type PredictionJobStatus = "pending" | "processing" | "completed" | "failed";

export type PredictionJobStage = "queued" | "preprocessing" | "inference" | "explainability";

/** GET /api/v1/predictions/:jobId/status response */
export interface PredictionJobStatusResponse {
  jobId: string;
  status: PredictionJobStatus;
  progress?: number;
  stage?: PredictionJobStage;
  error?: {
    code: string;
    message: string;
  };
  updatedAt: string;
}

export interface PredictionProbability {
  className: string;
  probability: number;
}

export type ExplainabilityStatus = "not_requested" | "pending" | "ready" | "failed";

/** GET /api/v1/predictions/:jobId/result response */
export interface PredictionResult {
  predictionId: string;
  jobId: string;
  caseId?: string;
  predictedClass: string;
  confidence: number;
  probabilities: PredictionProbability[];
  model: {
    name: string;
    version: string;
  };
  explainability: {
    status: ExplainabilityStatus;
    heatmapUrl?: string;
  };
  createdAt: string;
}

/** GET /api/v1/predictions/:jobId/explainability response */
export interface ExplainabilityResult {
  predictionId: string;
  method: "grad-cam";
  originalImageUrl: string;
  heatmapUrl: string;
  overlayUrl: string;
  generatedAt: string;
}

export interface PredictionError {
  message: string;
}
