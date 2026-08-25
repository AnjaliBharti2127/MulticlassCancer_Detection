export type CaseStatus = "completed" | "pending" | "needs_review";

export interface RecentCase {
  id: string;
  patientId: string;
  slideName: string;
  predictedClass: string;
  confidence: number;
  status: CaseStatus;
  submittedAt: string;
}

export interface DashboardSummary {
  totalCases: number;
  pendingAnalysis: number;
  completedAnalyses: number;
  needsReview: number;
  averageConfidence: number;
  modelVersion: string;
  recentCases: RecentCase[];
}
