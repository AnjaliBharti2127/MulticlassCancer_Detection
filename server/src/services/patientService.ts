import { Patient } from "../models/Patient";
import { ApiError } from "../utils/ApiError";
import type { ParsedListQuery } from "../utils/pagination";

const GENDER_LABEL: Record<string, string> = {
  male: "Male",
  female: "Female",
  other: "Other",
};

/** Shapes a Patient document into the response shape the frontend expects. */
export function toPatientResponse(patient: any) {
  return {
    id: patient._id.toString(),
    name: patient.name,
    ageSex: `${patient.age} / ${GENDER_LABEL[patient.gender] ?? patient.gender}`,
    gender: patient.gender,
    age: patient.age,
    contactNumber: patient.contactNumber,
    email: patient.email || undefined,
    notes: patient.notes || undefined,
    totalCases: patient.totalCases,
    lastVisit: patient.lastVisit,
  };
}

export async function getPatients(query: ParsedListQuery) {
  const filter: Record<string, unknown> = {};
  if (query.search) {
    filter.$or = [
      { name: { $regex: query.search, $options: "i" } },
      { contactNumber: { $regex: query.search, $options: "i" } },
    ];
  }

  const sortField = query.sortBy === "lastVisit" ? "lastVisit" : query.sortBy;
  const sort: Record<string, 1 | -1> = { [sortField]: query.sortDirection === "asc" ? 1 : -1 };

  const [patients, totalItems] = await Promise.all([
    Patient.find(filter)
      .sort(sort)
      .skip((query.page - 1) * query.pageSize)
      .limit(query.pageSize),
    Patient.countDocuments(filter),
  ]);

  return {
    items: patients.map(toPatientResponse),
    total: totalItems,
    page: query.page,
    pageSize: query.pageSize,
    totalPages: Math.max(1, Math.ceil(totalItems / query.pageSize)),
  };
}

export async function getPatientById(id: string) {
  const patient = await Patient.findById(id);
  if (!patient) {
    throw ApiError.notFound("Patient not found");
  }
  return toPatientResponse(patient);
}

export async function createPatient(data: {
  name: string;
  age: number;
  gender: string;
  contactNumber: string;
  email?: string;
  notes?: string;
}) {
  const patient = await Patient.create({
    ...data,
    email: data.email || undefined,
    lastVisit: new Date(),
    totalCases: 0,
  });
  return toPatientResponse(patient);
}
