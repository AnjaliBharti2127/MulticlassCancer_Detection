import { z } from "zod";

/** Matches the frontend's CreatePatientPayload (src/types/patient.ts). */
export const createPatientSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  age: z.coerce.number().int().min(0, "Age must be 0 or greater").max(130, "Age seems invalid"),
  gender: z.enum(["male", "female", "other"], {
    errorMap: () => ({ message: "Gender must be male, female, or other" }),
  }),
  contactNumber: z.string().trim().min(1, "Contact number is required"),
  email: z.string().trim().email("Invalid email").optional().or(z.literal("")),
  notes: z.string().trim().optional(),
});
