import { Schema, model, type InferSchemaType } from "mongoose";

/**
 * Case fields are aligned with the frontend's `CaseDetail` type
 * (src/types/case.ts). `patientName`/`ageSex` are not duplicated here —
 * they are populated from the referenced Patient at response time so
 * there is a single source of truth (see caseService).
 *
 * Prediction and explainability stay empty for this checkpoint; ML
 * integration will fill them in later.
 */
const classPredictionSchema = new Schema(
  {
    className: { type: String, required: true },
    confidence: { type: Number, required: true },
  },
  { _id: false }
);

const explainabilitySchema = new Schema(
  {
    status: {
      type: String,
      enum: ["not_requested", "pending", "ready", "failed"],
      default: "not_requested",
    },
    heatmapUrl: { type: String },
    overlayUrl: { type: String },
  },
  { _id: false }
);

const caseSchema = new Schema(
  {
    caseNumber: { type: String, required: true, unique: true },
    patient: { type: Schema.Types.ObjectId, ref: "Patient", required: true },
    specimenType: { type: String, required: true, trim: true },
    slideName: { type: String, required: true },
    slideImageUrl: { type: String },
    slideImageFilename: { type: String },
    status: {
      type: String,
      // Mirrors Prediction.status (queued/processing -> pending here) plus
      // needs_review, a case-level judgment applied once a prediction completes
      // with low confidence. Kept in sync by caseService (see Block 7).
      enum: ["pending", "processing", "completed", "needs_review", "failed"],
      default: "pending",
    },
    // Denormalized cache of the latest Prediction, so case list/detail reads
    // don't need a join — kept in sync by caseService whenever a prediction
    // is created or updates. `latestPrediction` is the source of truth.
    latestPrediction: { type: Schema.Types.ObjectId, ref: "Prediction" },
    predictedClass: { type: String, default: "—" },
    confidence: { type: Number, min: 0, max: 1, default: 0 },
    topPredictions: { type: [classPredictionSchema], default: [] },
    explainability: { type: explainabilitySchema, default: () => ({}) },
    submittedAt: { type: Date, default: Date.now },
    notes: { type: String, trim: true },
  },
  { timestamps: true }
);

caseSchema.index({ status: 1 });
caseSchema.index({ patient: 1 });
caseSchema.index({ submittedAt: -1 });

export type CaseDoc = InferSchemaType<typeof caseSchema>;

export const Case = model("Case", caseSchema);
