import { z } from "zod";

/**
 * Validates the text fields of a multipart POST /api/cases request.
 * Applied manually in the controller (after Multer has parsed the
 * multipart body) rather than via the generic validateRequest middleware,
 * since Multer needs to run first to populate req.body from form-data.
 */
export const createCaseSchema = z.object({
  patientId: z.string().trim().min(1, "patientId is required"),
  specimenType: z.string().trim().min(1, "specimenType is required"),
  notes: z.string().trim().optional(),
});

/**
 * PATCH /api/v1/cases/:id — clinician-editable fields only.
 * `.strict()` rejects any other key (e.g. patient, slideImageUrl,
 * predictedClass, confidence, topPredictions) with a 400 instead of
 * silently ignoring or applying it.
 */
export const updateCaseSchema = z
  .object({
    status: z.enum(["pending", "processing", "completed", "needs_review", "failed"]).optional(),
    specimenType: z.string().trim().min(1, "specimenType cannot be empty").optional(),
    notes: z.string().trim().max(2000, "notes must be 2000 characters or fewer").optional(),
  })
  .strict("Only status, specimenType, and notes may be updated")
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field (status, specimenType, notes) must be provided",
  });
