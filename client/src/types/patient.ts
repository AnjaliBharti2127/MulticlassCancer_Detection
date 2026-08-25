export type Gender = "male" | "female" | "other";

export interface Patient {
  id: string;
  name: string;
  ageSex: string;
  gender?: Gender;
  age?: number;
  contactNumber?: string;
  email?: string;
  notes?: string;
  totalCases: number;
  lastVisit: string;
}

/** Payload for POST /api/v1/patients. */
export interface CreatePatientPayload {
  name: string;
  age: number;
  gender: Gender;
  contactNumber: string;
  email?: string;
  notes?: string;
}
