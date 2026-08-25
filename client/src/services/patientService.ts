import type { CreatePatientPayload, Patient } from "../types/patient";
import type { PaginatedResponse, PatientsQuery } from "../types/pagination";
import { apiGet, apiPostJson } from "./apiClient";

/**
 * All patient-related data access lives here (single source of truth) —
 * no UI component talks to the backend directly.
 * Backed by GET/POST /api/patients (see backend/src/routes/patientRoutes.ts).
 */

export async function getPatients(query: PatientsQuery = {}): Promise<PaginatedResponse<Patient>> {
  return apiGet<PaginatedResponse<Patient>>("/patients", {
    search: query.search,
    page: query.page,
    pageSize: query.pageSize,
    sortBy: query.sortBy,
    sortDirection: query.sortDirection,
  });
}

export async function getPatientById(id: string): Promise<Patient | null> {
  try {
    const { patient } = await apiGet<{ patient: Patient }>(`/patients/${encodeURIComponent(id)}`);
    return patient;
  } catch {
    return null;
  }
}

export async function createPatient(payload: CreatePatientPayload): Promise<Patient> {
  const { patient } = await apiPostJson<{ patient: Patient }>("/patients", payload);
  return patient;
}
