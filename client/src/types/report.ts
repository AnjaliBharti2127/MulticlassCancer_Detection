import type { ClassPrediction } from "./prediction";
import type { ReportStatus } from "./pagination";

/**
 * Report-specific fields only. Patient/case fields are joined in from
 * CaseDetail at the service layer so case data has a single source of truth.
 */
export interface ReportRecord {
  id: string;
  caseId: string;
  pathologist: string;
  generatedAt: string;
  status: ReportStatus;
}

export interface ReportDetail extends ReportRecord {
  patientId: string;
  patientName: string;
  ageSex: string;
  specimenType: string;
  slideName: string;
  predictedClass: string;
  confidence: number;
  topPredictions: ClassPrediction[];
  caseSubmittedAt: string;
  notes?: string;
  diagnosis?: string;
  findings?: string;
  recommendation?: string;
}
