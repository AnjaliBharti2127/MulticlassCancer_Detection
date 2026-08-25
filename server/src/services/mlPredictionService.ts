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
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 1;
}

function validateMlResponse(data: MlPredictionResponse): MlPredictionResponse {
  const prediction = data?.prediction;
  if (!data?.success || !prediction) {
    throw new ApiError(502, "INVALID_ML_RESPONSE", "The prediction service returned an incomplete response.");
  }
  if (
    !Number.isInteger(prediction.predictedIndex) ||
    prediction.predictedIndex < 0 ||
    prediction.predictedIndex >= CANCER_CLASSES.length ||
    prediction.predictedClass !== CANCER_CLASSES[prediction.predictedIndex]
  ) {
    throw new ApiError(502, "ML_CLASS_MAPPING_MISMATCH", "The ML class mapping does not match the application contract.");
  }
  if (!isUnitProbability(prediction.confidence)) {
    throw new ApiError(502, "INVALID_ML_RESPONSE", "ML confidence must be a decimal value between 0 and 1.");
  }
  if (!Array.isArray(prediction.probabilities) || prediction.probabilities.length !== CANCER_CLASSES.length) {
    throw new ApiError(502, "INVALID_ML_RESPONSE", `ML response must contain ${CANCER_CLASSES.length} probabilities.`);
  }
  const total = prediction.probabilities.reduce((sum, item, index) => {
    if (
      item.classIndex !== index ||
      item.className !== CANCER_CLASSES[index] ||
      !isUnitProbability(item.probability)
    ) {
      throw new ApiError(502, "ML_CLASS_MAPPING_MISMATCH", "ML probability order does not match the application contract.");
    }
    return sum + item.probability;
  }, 0);
  if (Math.abs(total - 1) > 0.01) {
    throw new ApiError(502, "INVALID_ML_RESPONSE", "ML probabilities must sum to 1.");
  }
  return data;
}

export async function predictImageWithMl(input: PredictImageInput): Promise<MlPredictionResponse> {
  const form = new FormData();
  form.append("slideImage", input.buffer, { filename: input.filename, contentType: input.mimeType });

  try {
    const response = await axios.post<MlPredictionResponse>(`${env.mlServiceUrl}/api/v1/predict`, form, {
      headers: form.getHeaders(),
      timeout: env.mlServiceTimeoutMs,
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
    });
    return validateMlResponse(response.data);
  } catch (error: unknown) {
    if (error instanceof ApiError) throw error;
    if (axios.isAxiosError(error)) {
      const responseData = error.response?.data;
      let mlCode: string | undefined;
      let detail = error.message || "Unknown ML service error";
      if (typeof responseData === "object" && responseData !== null) {
        const nested = (responseData as { error?: { code?: string; message?: string }; detail?: string }).error;
        if (nested?.message) { detail = nested.message; mlCode = nested.code; }
        else if (typeof (responseData as { detail?: unknown }).detail === "string") detail = (responseData as { detail: string }).detail;
      }
      if (error.code === "ECONNABORTED") throw new ApiError(504, "ML_SERVICE_TIMEOUT", "The prediction model timed out while analyzing this image. Please try again.");
      if (error.code === "ECONNREFUSED" || error.code === "ENOTFOUND") throw new ApiError(503, "ML_SERVICE_UNAVAILABLE", "The prediction service is currently unavailable.");
      if (mlCode === "MODEL_NOT_LOADED") throw new ApiError(503, "MODEL_NOT_LOADED", detail);
      throw new ApiError(error.response?.status ?? 503, mlCode ?? "ML_SERVICE_ERROR", `ML prediction service failed: ${detail}`);
    }
    throw ApiError.internal("Unexpected error while calling the ML prediction service.");
  }
}
