import { Case } from "../models/Case";
import { Patient } from "../models/Patient";
import { ApiError } from "../utils/ApiError";
import type { ParsedListQuery } from "../utils/pagination";

const GENDER_LABEL: Record<string, string> = {
  male: "Male",
  female: "Female",
  other: "Other",
};

function ageSexOf(patient: any): string {
  return `${patient.age} / ${GENDER_LABEL[patient.gender] ?? patient.gender}`;
}

/** Shapes a populated Case document into the response shape the frontend expects. */
function toCaseResponse(caseDoc: any) {
  const patient = caseDoc.patient;
  return {
    id: caseDoc.caseNumber,
    patientId: patient?._id ? patient._id.toString() : patient?.toString(),
    patientName: patient?.name ?? undefined,
    ageSex: patient?.age !== undefined ? ageSexOf(patient) : undefined,
    specimenType: caseDoc.specimenType,
    slideName: caseDoc.slideName,
    slideImageUrl: caseDoc.slideImageUrl || undefined,
    status: caseDoc.status,
    predictedClass: caseDoc.predictedClass,
    confidence: caseDoc.confidence,
    topPredictions: caseDoc.topPredictions ?? [],
    explainability: caseDoc.explainability,
    submittedAt: caseDoc.submittedAt,
    notes: caseDoc.notes || undefined,
  };
}

/** Generates a readable, mostly-sequential case number like CASE-2026-0001. */
async function generateCaseNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const countThisYear = await Case.countDocuments({
    caseNumber: { $regex: `^CASE-${year}-` },
  });
  const sequence = String(countThisYear + 1).padStart(4, "0");
  return `CASE-${year}-${sequence}`;
}

export async function getCases(query: ParsedListQuery, statusFilter?: string) {
  const filter: Record<string, unknown> = {};
  if (statusFilter) {
    filter.status = statusFilter;
  }
  if (query.search) {
    filter.$or = [
      { caseNumber: { $regex: query.search, $options: "i" } },
      { specimenType: { $regex: query.search, $options: "i" } },
      { predictedClass: { $regex: query.search, $options: "i" } },
    ];
  }

  const sortField = query.sortBy === "submittedAt" ? "submittedAt" : query.sortBy;
  const sort: Record<string, 1 | -1> = { [sortField]: query.sortDirection === "asc" ? 1 : -1 };

  const [cases, totalItems] = await Promise.all([
    Case.find(filter)
      .populate("patient")
      .sort(sort)
      .skip((query.page - 1) * query.pageSize)
      .limit(query.pageSize),
    Case.countDocuments(filter),
  ]);

  return {
    items: cases.map(toCaseResponse),
    total: totalItems,
    page: query.page,
    pageSize: query.pageSize,
    totalPages: Math.max(1, Math.ceil(totalItems / query.pageSize)),
  };
}

export async function getCaseById(id: string) {
  const caseDoc = await Case.findOne({ caseNumber: id }).populate("patient");
  if (!caseDoc) {
    throw ApiError.notFound("Case not found");
  }
  return toCaseResponse(caseDoc);
}

export async function updateCase(
  caseNumber: string,
  updates: { status?: string; specimenType?: string; notes?: string }
) {
  const caseDoc = await Case.findOne({ caseNumber });
  if (!caseDoc) {
    throw ApiError.notFound("Case not found");
  }

  if (updates.status !== undefined) caseDoc.status = updates.status as typeof caseDoc.status;
  if (updates.specimenType !== undefined) caseDoc.specimenType = updates.specimenType;
  if (updates.notes !== undefined) caseDoc.notes = updates.notes;

  await caseDoc.save();
  const populated = await caseDoc.populate("patient");
  return toCaseResponse(populated);
}

export async function createCase(data: {
  patientId: string;
  specimenType: string;
  notes?: string;
  slideName: string;
  slideImageUrl: string;
  slideImageFilename: string;
}) {
  const patient = await Patient.findById(data.patientId);
  if (!patient) {
    throw ApiError.badRequest("Selected patient could not be found");
  }

  const caseNumber = await generateCaseNumber();

  const caseDoc = await Case.create({
    caseNumber,
    patient: patient._id,
    specimenType: data.specimenType,
    slideName: data.slideName,
    slideImageUrl: data.slideImageUrl,
    slideImageFilename: data.slideImageFilename,
    notes: data.notes,
    status: "pending",
    submittedAt: new Date(),
  });

  patient.totalCases += 1;
  patient.lastVisit = new Date();
  await patient.save();

  const populated = await caseDoc.populate("patient");
  return toCaseResponse(populated);
}
