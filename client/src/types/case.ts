import type { CaseStatus } from "./dashboard";
import type { ClassPrediction, ExplainabilityStatus } from "./prediction";

export interface CaseExplainability {
  status: ExplainabilityStatus;
  heatmapUrl?: string;
  overlayUrl?: string;
}

export interface CaseDetail {
  id: string;
  patientId: string;
  patientName: string;
  ageSex: string;
  specimenType: string;
  slideName: string;
  /** Object URL or (future) API-hosted URL for the uploaded slide image. */
  slideImageUrl?: string;
  status: CaseStatus;
  predictedClass: string;
  confidence: number;
  topPredictions: ClassPrediction[];
  /** Present once a prediction job has generated a Grad-CAM heatmap for this case. */
  explainability?: CaseExplainability;
  submittedAt: string;
  notes?: string;
}

/** Payload for POST /api/v1/cases (multipart: fields + slide file). */
export interface CreateCasePayload {
  patientId: string;
  specimenType: string;
  notes?: string;
  file: File;
}
