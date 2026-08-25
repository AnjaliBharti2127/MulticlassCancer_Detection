import type { Request, Response } from "express";

import { Case } from "../models/Case";
import { Prediction } from "../models/Prediction";
import { predictImageWithMl } from "../services/mlPredictionService";
import { ApiError } from "../utils/ApiError";
import { sendSuccess } from "../utils/apiResponse";
import { asyncHandler } from "../utils/asyncHandler";

export const predictSlideImage = asyncHandler(async (req: Request, res: Response) => {
  if (!req.file) throw ApiError.badRequest("A slide image is required in the slideImage field");

  const caseNumber = typeof req.body.caseId === "string" && req.body.caseId.trim() ? req.body.caseId.trim() : undefined;
  const caseDoc = caseNumber ? await Case.findOne({ caseNumber }) : null;
  if (caseNumber && !caseDoc) throw ApiError.notFound("Case not found");

  if (caseDoc) {
    caseDoc.status = "processing";
    await caseDoc.save();
  }

  try {
    const mlResponse = await predictImageWithMl({
      buffer: req.file.buffer,
      filename: req.file.originalname,
      mimeType: req.file.mimetype,
    });
    const p = mlResponse.prediction;

    let savedPredictionId: string | undefined;
    if (caseDoc) {
      const saved = await Prediction.create({
        case: caseDoc._id,
        status: "completed",
        predictedClass: p.predictedClass,
        predictedIndex: p.predictedIndex,
        confidence: p.confidence,
        probabilities: p.probabilities,
        modelVersion: p.modelVersion,
        preprocessingVersion: p.preprocessingVersion,
        inferenceDurationMs: p.inferenceDurationMs,
        inputImage: {
          filename: req.file.originalname,
          mimeType: req.file.mimetype,
          sizeBytes: req.file.size,
        },
      });
      savedPredictionId = saved._id.toString();
      caseDoc.latestPrediction = saved._id;
      caseDoc.predictedClass = p.predictedClass;
      caseDoc.confidence = p.confidence;
      caseDoc.topPredictions = [...p.probabilities]
        .sort((a, b) => b.probability - a.probability)
        .slice(0, 4)
        .map((item) => ({ className: item.className, confidence: item.probability }));
      caseDoc.status = p.uncertain ? "needs_review" : "completed";
      await caseDoc.save();
    }

    sendSuccess(res, {
      prediction: {
        predictionId: savedPredictionId ?? `standalone-${Date.now()}`,
        caseId: caseNumber,
        predictedClass: p.predictedClass,
        confidence: p.confidence,
        probabilities: p.probabilities.map(({ className, probability }) => ({ className, probability })),
        model: { name: p.modelName, version: p.modelVersion },
        explainability: { status: "not_requested" as const },
        createdAt: new Date().toISOString(),
        uncertain: p.uncertain,
        warning: p.warning,
      },
      disclaimer: mlResponse.disclaimer,
    });
  } catch (error) {
    if (caseDoc) {
      caseDoc.status = "failed";
      await caseDoc.save().catch(() => undefined);
    }
    throw error;
  }
});
