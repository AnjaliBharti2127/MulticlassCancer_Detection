import { Report } from "../models/Report";
import { Case } from "../models/Case";
import { ApiError } from "../utils/ApiError";
import type { ParsedListQuery } from "../utils/pagination";

const GENDER_LABEL: Record<string, string> = { male: "Male", female: "Female", other: "Other" };

function toReportResponse(reportDoc: any) {
  const caseDoc = reportDoc.case;
  const patient = reportDoc.patient;
  const ageSex = patient?.age !== undefined ? `${patient.age} / ${GENDER_LABEL[patient.gender] ?? patient.gender}` : undefined;
  return {
    id: reportDoc.reportNumber,
    caseId: caseDoc?.caseNumber,
    pathologist: reportDoc.pathologist,
    generatedAt: reportDoc.generatedAt,
    status: reportDoc.status,
    patientId: patient?._id?.toString(),
    patientName: patient?.name,
    ageSex,
    specimenType: caseDoc?.specimenType,
    slideName: caseDoc?.slideName,
    predictedClass: caseDoc?.predictedClass,
    confidence: caseDoc?.confidence,
    topPredictions: caseDoc?.topPredictions ?? [],
    caseSubmittedAt: caseDoc?.submittedAt,
    notes: caseDoc?.notes || undefined,
    diagnosis: reportDoc.diagnosis || undefined,
    findings: reportDoc.findings || undefined,
    recommendation: reportDoc.recommendation || undefined,
  };
}

async function generateReportNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const suffix = `${Date.now().toString().slice(-7)}${Math.floor(Math.random() * 1000).toString().padStart(3, "0")}`;
  return `RPT-${year}-${suffix}`;
}

export async function getReports(query: ParsedListQuery, statusFilter?: string) {
  const filter: Record<string, unknown> = {};
  if (statusFilter) filter.status = statusFilter;
  if (query.search) filter.$or = [
    { reportNumber: { $regex: query.search, $options: "i" } },
    { pathologist: { $regex: query.search, $options: "i" } },
    { diagnosis: { $regex: query.search, $options: "i" } },
  ];
  const allowedSort = new Set(["generatedAt", "pathologist", "status"]);
  const sortField = allowedSort.has(query.sortBy) ? query.sortBy : "generatedAt";
  const sort: Record<string, 1 | -1> = { [sortField]: query.sortDirection === "asc" ? 1 : -1 };
  const [reports, totalItems] = await Promise.all([
    Report.find(filter).populate("case").populate("patient").sort(sort).skip((query.page - 1) * query.pageSize).limit(query.pageSize),
    Report.countDocuments(filter),
  ]);
  return { items: reports.map(toReportResponse), total: totalItems, page: query.page, pageSize: query.pageSize, totalPages: Math.max(1, Math.ceil(totalItems / query.pageSize)) };
}

export async function getReportById(id: string) {
  const reportDoc = await Report.findOne({ reportNumber: id }).populate("case").populate("patient");
  if (!reportDoc) throw ApiError.notFound("Report not found");
  return toReportResponse(reportDoc);
}

export async function createOrUpdateReport(input: { caseId: string; pathologist: string; diagnosis: string; findings: string; recommendation: string; status: "draft" | "finalized" }) {
  const caseDoc = await Case.findOne({ caseNumber: input.caseId });
  if (!caseDoc) throw ApiError.notFound("Case not found");
  if (!caseDoc.latestPrediction || caseDoc.topPredictions.length === 0) {
    throw ApiError.badRequest("A completed prediction is required before creating a report");
  }

  let report = await Report.findOne({ case: caseDoc._id });
  if (report?.status === "finalized") throw new ApiError(409, "REPORT_ALREADY_FINALIZED", "A finalized report already exists for this case");

  if (!report) {
    try {
      report = await Report.create({
        reportNumber: await generateReportNumber(), case: caseDoc._id, patient: caseDoc.patient,
        prediction: caseDoc.latestPrediction, pathologist: input.pathologist, diagnosis: input.diagnosis,
        findings: input.findings, recommendation: input.recommendation, status: input.status,
        generatedAt: new Date(),
      });
    } catch (error: any) {
      if (error?.code === 11000) throw new ApiError(409, "REPORT_ALREADY_EXISTS", "A report already exists for this case");
      throw error;
    }
  } else {
    // Atomic status guard: when two finalize requests arrive together, only
    // the first may transition the draft. The second receives a conflict.
    const updated = await Report.findOneAndUpdate(
      { _id: report._id, status: { $ne: "finalized" } },
      { $set: { pathologist: input.pathologist, diagnosis: input.diagnosis, findings: input.findings, recommendation: input.recommendation, status: input.status } },
      { new: true, runValidators: true },
    );
    if (!updated) {
      throw new ApiError(409, "REPORT_ALREADY_FINALIZED", "A finalized report already exists for this case");
    }
    report = updated;
  }

  if (input.status === "finalized") {
    caseDoc.status = "completed";
    await caseDoc.save();
  }
  const populated = await report.populate(["case", "patient"]);
  return toReportResponse(populated);
}
