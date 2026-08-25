import { Patient } from "../models/Patient";
import { Case } from "../models/Case";
import { Report } from "../models/Report";

/**
 * Matches the frontend's DashboardSummary type (src/types/dashboard.ts).
 * `modelVersion` is a placeholder string until real ML integration exists.
 */
export async function getDashboardSummary() {
  const [totalPatients, totalCases, pendingAnalysis, completedAnalyses, needsReview, totalReports, recentCaseDocs] =
    await Promise.all([
      Patient.countDocuments(),
      Case.countDocuments(),
      Case.countDocuments({ status: "pending" }),
      Case.countDocuments({ status: "completed" }),
      Case.countDocuments({ status: "needs_review" }),
      Report.countDocuments(),
      Case.find().populate("patient").sort({ submittedAt: -1 }).limit(5),
    ]);

  const completedCases = await Case.find({ status: "completed" }, "confidence");
  const averageConfidence = completedCases.length
    ? completedCases.reduce((sum, c) => sum + (c.confidence ?? 0), 0) / completedCases.length
    : 0;

  return {
    totalPatients,
    totalCases,
    pendingAnalysis,
    completedAnalyses,
    needsReview,
    averageConfidence,
    totalReports,
    modelVersion: "ViT-B/16 Stage 1 Encoder — v0.3 (not yet integrated)",
    recentCases: recentCaseDocs.map((c: any) => ({
      id: c.caseNumber,
      patientId: c.patient?._id?.toString(),
      slideName: c.slideName,
      predictedClass: c.predictedClass,
      confidence: c.confidence,
      status: c.status,
      submittedAt: c.submittedAt,
    })),
  };
}
