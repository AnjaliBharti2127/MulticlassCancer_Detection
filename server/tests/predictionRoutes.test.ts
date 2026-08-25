import express, { type NextFunction, type Request, type Response } from "express";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import { errorHandler } from "../src/middleware/errorHandler";

vi.mock("../src/services/mlPredictionService", () => ({
  predictImageWithMl: vi.fn(async ({ filename }: { filename: string }) => {
    if (filename === "not-loaded.jpg") {
      const { ApiError } = await import("../src/utils/ApiError");
      throw new ApiError(503, "MODEL_NOT_LOADED", "The prediction model has not been configured yet");
    }
    if (filename === "timeout.jpg") {
      const { ApiError } = await import("../src/utils/ApiError");
      throw new ApiError(504, "ML_SERVICE_TIMEOUT", "Prediction service timed out");
    }
    return { prediction: { predictedClass: "Test", confidence: 0.9 }, disclaimer: "Test only" };
  }),
}));

import { predictSlideImage } from "../src/controllers/predictionController";

function makeApp(filename?: string) {
  const app = express();
  app.use((req: Request, _res: Response, next: NextFunction) => {
    req.id = "test-request";
    if (filename) req.file = { originalname: filename, mimetype: "image/jpeg", buffer: Buffer.from("x") } as Express.Multer.File;
    next();
  });
  app.post("/predictions", predictSlideImage);
  app.use(errorHandler);
  return app;
}

describe("prediction route error contract", () => {
  it("requires an image", async () => {
    const response = await request(makeApp()).post("/predictions");
    expect(response.status).toBe(400);
  });

  it("returns a successful mocked prediction", async () => {
    const response = await request(makeApp("ok.jpg")).post("/predictions");
    expect(response.status).toBe(200);
    expect(response.body.data.prediction.predictedClass).toBe("Test");
  });

  it("surfaces MODEL_NOT_LOADED", async () => {
    const response = await request(makeApp("not-loaded.jpg")).post("/predictions");
    expect(response.status).toBe(503);
    expect(response.body.error.code).toBe("MODEL_NOT_LOADED");
  });

  it("surfaces ML timeout", async () => {
    const response = await request(makeApp("timeout.jpg")).post("/predictions");
    expect(response.status).toBe(504);
    expect(response.body.error.code).toBe("ML_SERVICE_TIMEOUT");
  });
});
