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
        !isUnitProbability(item.probability)
      ) {
        throw new ApiError(
          502,
          "ML_CLASS_MAPPING_MISMATCH",
          "ML probability order does not match the application contract."
        );
      }

      return sum + item.probability;
    },
    0
  );

  if (Math.abs(total - 1) > 0.01) {
    throw new ApiError(
      502,
      "INVALID_ML_RESPONSE",
      "ML probabilities must sum to 1."
    );
  }

  return data;
}

function parseGradioResult(text: string): unknown {
  let output: unknown;
  let completed = false;

  const blocks = text.replace(/\r\n/g, "\n").split("\n\n");

  for (const block of blocks) {
    const lines = block.split("\n");

    const event = lines
      .find((line) => line.startsWith("event:"))
      ?.slice(6)
      .trim();

    const data = lines
      .filter((line) => line.startsWith("data:"))
      .map((line) => line.slice(5).trim())
      .join("\n");

    if (event === "error") { console.error("GRADIO_ERROR_DETAILS:", data);
      throw new ApiError(
        502,
        "ML_SERVICE_ERROR",
        "Hugging Face could not complete the prediction. Check the Space logs."
      );
    }

    if (event === "complete") {
      const values: unknown = JSON.parse(data);

      if (!Array.isArray(values) || values.length === 0) {
        throw new Error("Prediction returned an empty result.");
      }

      output = values[0];
      completed = true;
    }
  }

  if (!completed) {
    throw new Error("Prediction ended without a completed result.");
  }

  return output;
}

function readClassScores(output: unknown): Map<string, number> {
  if (
    typeof output !== "object" ||
    output === null ||
    !("confidences" in output) ||
    !Array.isArray(output.confidences)
  ) {
    throw new Error("Prediction returned no class probabilities.");
  }

  const scores = new Map<string, number>();

  for (const item of output.confidences) {
    if (
      typeof item !== "object" ||
      item === null ||
      typeof item.label !== "string" ||
      !isUnitProbability(item.confidence)
    ) {
      throw new Error("Prediction returned an invalid class probability.");
    }

    if (scores.has(item.label)) {
      throw new Error("Prediction returned a duplicate class.");
    }

    scores.set(item.label, item.confidence);
  }

  return scores;
}

export async function predictImageWithMl(
  input: PredictImageInput
): Promise<MlPredictionResponse> {
  const base = env.mlServiceUrl.replace(/\/+$/, "");
  const started = Date.now(); const hfClient = axios.create({ headers: process.env.HF_TOKEN ? { Authorization: "Bearer " + process.env.HF_TOKEN.trim() } : {} });
  const timeout = Math.max(env.mlServiceTimeoutMs, 180000);

  try {
    // Upload the image to Hugging Face Gradio.
    const form = new FormData();

    form.append("files", input.buffer, {
      filename: input.filename,
      contentType: input.mimeType,
    });

    const upload = await hfClient.post<unknown>(
      `${base}/gradio_api/upload`,
      form,
      {
        headers: form.getHeaders(),
        timeout,
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
      }
    );

    if (
      !Array.isArray(upload.data) ||
      typeof upload.data[0] !== "string"
    ) {
      throw new Error("Image upload did not return a file path.");
    }

    const filePath = upload.data[0];

    // Start the queued prediction.
    const job = await hfClient.post<{ event_id?: string }>(
      `${base}/gradio_api/call/predict`,
      {
        data: [
          {
            path: filePath,
            orig_name: input.filename,
            meta: {
              _type: "gradio.FileData",
            },
          },
        ],
      },
      {
        timeout,
      }
    );

    if (
      typeof job.data?.event_id !== "string" ||
      !job.data.event_id
    ) {
      throw new Error("Prediction did not return an event ID.");
    }

    const eventId = encodeURIComponent(job.data.event_id);

    // Wait for the prediction result.
    const result = await hfClient.get<string>(
      `${base}/gradio_api/call/predict/${eventId}`,
      {
        timeout,
        responseType: "text",
        headers: {
          Accept: "text/event-stream",
        },
      }
    );

    const output = parseGradioResult(result.data);
    const scores = readClassScores(output);

    if (scores.size !== CANCER_CLASSES.length) {
      throw new Error(
        "Prediction class count does not match the application."
      );
    }

    // Map class labels into the application's required order.
    const probabilities: MlClassProbability[] =
      CANCER_CLASSES.map((className, classIndex) => {
        const probability = scores.get(className);

        if (!isUnitProbability(probability)) {
          throw new Error(
            `Missing or invalid probability for ${className}.`
          );
        }

        return {
          className,
          classIndex,
          probability,
        };
      });

    const best = probabilities.reduce((current, candidate) =>
      candidate.probability > current.probability
        ? candidate
        : current
    );

    const uncertain = best.probability < 0.7;

    return validateMlResponse({
      success: true,
      prediction: {
        predictedClass: best.className,
        predictedIndex: best.classIndex,
        confidence: best.probability,
        uncertain,
        warning: uncertain
          ? "Low confidence; review required."
          : null,
        probabilities,
        modelName: "Patho Image Classifier",
        modelVersion: "huggingface-space",
        preprocessingVersion: "imagenet-224-validation",
        inferenceDurationMs: Date.now() - started,
      },
      disclaimer:
        "Research demonstration. Not for clinical diagnosis.",
    });
  } catch (error: unknown) {
    if (error instanceof ApiError) {
      throw error;
    }

    if (axios.isAxiosError(error)) {
      if (
        error.code === "ECONNABORTED" ||
        error.code === "ETIMEDOUT"
      ) {
        throw new ApiError(
          504,
          "ML_SERVICE_TIMEOUT",
          "Prediction timed out. Please try again."
        );
      }

      if (
        error.code === "ECONNREFUSED" ||
        error.code === "ENOTFOUND"
      ) {
        throw new ApiError(
          503,
          "ML_SERVICE_UNAVAILABLE",
          "The prediction service is currently unavailable."
        );
      }

      const detail =
        error.response?.status ?? error.code ?? error.message;

      throw new ApiError(
        502,
        "ML_SERVICE_ERROR",
        `Hugging Face request failed: ${detail}`
      );
    }

    throw new ApiError(
      502,
      "ML_SERVICE_ERROR",
      error instanceof Error
        ? error.message
        : "Unexpected prediction error."
    );
  }
}
