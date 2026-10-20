import { Schema, model, type InferSchemaType } from "mongoose";

/**
 * Patient fields are aligned with the frontend's `Patient` type
 * (src/types/patient.ts): name, age, gender, contactNumber, email, notes.
 * `ageSex` (e.g. "61 / Male") is derived at response time in patientService.
 * `totalCases`/`lastVisit` are kept updated whenever a case is created for
 * this patient (see caseService).
 */
const patientSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    age: { type: Number, required: true, min: 0, max: 130 },
    gender: {
      type: String,
      required: true,
      enum: ["male", "female", "other"],
    },
    contactNumber: { type: String, required: true, trim: true },
    email: { type: String, trim: true, lowercase: true },
    notes: { type: String, trim: true },
    totalCases: { type: Number, default: 0 },
    lastVisit: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export type PatientDoc = InferSchemaType<typeof patientSchema>;

patientSchema.index({ name: 1 });
patientSchema.index({ contactNumber: 1 });
patientSchema.index({ lastVisit: -1 });

export const Patient = model("Patient", patientSchema);
