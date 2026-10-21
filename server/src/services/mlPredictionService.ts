import axios from "axios";
import FormData from "form-data";

import { CANCER_CLASSES } from "../constants/cancerClasses";
import { env } from "../config/env";
import { ApiError } from "../utils/ApiError";

export interface MlClassProbability {
  className: string;
  classIndex: number;
  probability: number;
}

export interface MlPredictionResponse {
  success: boolean;
  prediction: {
    predictedClass: string;
    predictedIndex: number;
    confidence: number;
    uncertain: boolean;
    warning: string | null;
    probabilities: MlClassProbability[];
    modelName: string;
    modelVersion: string;
    preprocessingVersion: string;
    inferenceDurationMs: number;
  };
  disclaimer: string;
}

interface PredictImageInput {
  buffer: Buffer;
  filename: string;
  mimeType: string;
}

function isUnitProbability(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= 0 &&
    value <= 1
  );
}

function validateMlResponse(
  data: MlPredictionResponse
): MlPredictionResponse {
  const prediction = data?.prediction;

  if (!data?.success || !prediction) {
    throw new ApiError(
      502,
      "INVALID_ML_RESPONSE",
      "The prediction service returned an incomplete response."
    );
  }

  if (
    !Number.isInteger(prediction.predictedIndex) ||
    prediction.predictedIndex < 0 ||
    prediction.predictedIndex >= CANCER_CLASSES.length ||
    prediction.predictedClass !==
      CANCER_CLASSES[prediction.predictedIndex]
  ) {
    throw new ApiError(
      502,
      "ML_CLASS_MAPPING_MISMATCH",
      "The ML class mapping does not match the application contract."
    );
  }

  if (!isUnitProbability(prediction.confidence)) {
    throw new ApiError(
      502,
      "INVALID_ML_RESPONSE",
      "ML confidence must be between 0 and 1."
    );
  }

  if (
    !Array.isArray(prediction.probabilities) ||
    prediction.probabilities.length !== CANCER_CLASSES.length
  ) {
    throw new ApiError(
      502,
      "INVALID_ML_RESPONSE",
      `ML response must contain ${CANCER_CLASSES.length} probabilities.`
    );
  }

  const total = prediction.probabilities.reduce(
    (sum, item, index) => {
      if (
        item.classIndex !== index ||
        item.className !== CANCER_CLASSES[index] ||
