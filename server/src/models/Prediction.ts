import { Schema, model, type InferSchemaType } from "mongoose";
import { CANCER_CLASSES } from "../constants/cancerClasses";

/**
 * One document per inference run (Block 6/7 will create these). A case can
 * accumulate several (e.g. a retry after a failure) — `getCaseById` always
 * joins the most recent one via `Case.latestPrediction`. Kept as its own
 * collection (not embedded) because it carries a full 9-class probability
 * vector plus timing/versioning metadata that has no reason to bloat every
 * Case read.
 */
const classProbabilitySchema = new Schema(
  {
    className: { type: String, required: true, enum: CANCER_CLASSES },
    classIndex: { type: Number, required: true, min: 0, max: CANCER_CLASSES.length - 1 },
    probability: { type: Number, required: true, min: 0, max: 1 },
  },
  { _id: false }
);

const inputImageSchema = new Schema(
  {
    filename: { type: String, required: true },
    mimeType: { type: String, required: true },
    sizeBytes: { type: Number, required: true },
    width: { type: Number },
    height: { type: Number },
  },
  { _id: false }
);

const predictionSchema = new Schema(
  {
    case: { type: Schema.Types.ObjectId, ref: "Case", required: true },
    status: {
      type: String,
      enum: ["queued", "processing", "completed", "failed"],
      default: "queued",
      required: true,
    },
    predictedClass: { type: String, enum: CANCER_CLASSES },
    predictedIndex: { type: Number, min: 0, max: CANCER_CLASSES.length - 1 },
    confidence: { type: Number, min: 0, max: 1 },
    probabilities: { type: [classProbabilitySchema], default: [] },
    modelVersion: { type: String },
    preprocessingVersion: { type: String },
    inferenceDurationMs: { type: Number, min: 0 },
    inputImage: { type: inputImageSchema },
    failureReason: { type: String },
  },
  { timestamps: true }
);

// Fetching the latest prediction(s) for a case is the hot path.
predictionSchema.index({ case: 1, createdAt: -1 });
predictionSchema.index({ status: 1 });

// A completed prediction must actually carry its result; a failed one must
// explain why. Keeps bad data out of the DB regardless of which caller writes it.
predictionSchema.pre("validate", function (next) {
  if (this.status === "completed") {
    if (!this.predictedClass || this.predictedIndex === undefined || this.confidence === undefined) {
      next(new Error("A completed prediction requires predictedClass, predictedIndex, and confidence"));
      return;
    }
    if (this.probabilities.length !== CANCER_CLASSES.length) {
      next(new Error(`A completed prediction requires all ${CANCER_CLASSES.length} class probabilities`));
      return;
    }
  }
  if (this.status === "failed" && !this.failureReason) {
    next(new Error("A failed prediction requires a failureReason"));
    return;
  }
  next();
});

export type PredictionDoc = InferSchemaType<typeof predictionSchema>;

export const Prediction = model("Prediction", predictionSchema);
