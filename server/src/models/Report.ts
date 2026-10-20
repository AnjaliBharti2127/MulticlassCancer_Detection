import { Schema, model, type InferSchemaType } from "mongoose";

/**
 * Report fields are aligned with the frontend's `ReportRecord` type
 * (src/types/report.ts). Patient/case fields (patientName, predictedClass,
 * etc.) are joined in from the referenced Case at response time, so a report
 * only stores its own fields, not duplicated case data.
 */
const reportSchema = new Schema(
  {
    reportNumber: { type: String, required: true, unique: true },
    case: { type: Schema.Types.ObjectId, ref: "Case", required: true, unique: true },
    patient: { type: Schema.Types.ObjectId, ref: "Patient", required: true },
    prediction: { type: Schema.Types.ObjectId, ref: "Prediction", required: true },
    pathologist: { type: String, required: true, trim: true },
    diagnosis: { type: String, trim: true },
    findings: { type: String, trim: true },
    recommendation: { type: String, trim: true },
    status: {
      type: String,
      enum: ["draft", "finalized"],
      default: "finalized",
    },
    generatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

reportSchema.index({ patient: 1 });
reportSchema.index({ generatedAt: -1 });

export type ReportDoc = InferSchemaType<typeof reportSchema>;

export const Report = model("Report", reportSchema);
