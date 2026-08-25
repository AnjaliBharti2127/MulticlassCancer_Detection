import express, { type Request, type Response, type NextFunction } from "express";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import { errorHandler } from "../src/middleware/errorHandler";
import { validateRequest } from "../src/middleware/validateRequest";
import { updateCaseSchema } from "../src/validation/caseValidation";

// caseService is mocked so this suite doesn't need a live MongoDB — it only
// exercises the validation layer and controller wiring for PATCH /cases/:id.
vi.mock("../src/services/caseService", () => ({
  updateCase: vi.fn(async (caseNumber: string, updates: Record<string, unknown>) => {
    if (caseNumber === "CASE-DOES-NOT-EXIST") {
      const { ApiError } = await import("../src/utils/ApiError");
      throw ApiError.notFound("Case not found");
    }
    return { id: caseNumber, ...updates };
  }),
}));

import { updateCase as updateCaseController } from "../src/controllers/caseController";

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use((req: Request, _res: Response, next: NextFunction) => {
    req.id = "test-request";
    next();
  });
  app.patch("/cases/:id", validateRequest(updateCaseSchema), updateCaseController);
  app.use(errorHandler);
  return app;
}

describe("PATCH /api/v1/cases/:id", () => {
  it("updates allowed clinician-editable fields", async () => {
    const response = await request(makeApp())
      .patch("/cases/CASE-2026-0001")
      .send({ status: "needs_review", notes: "Re-check margins" });

    expect(response.status).toBe(200);
    expect(response.body.data.case).toMatchObject({ status: "needs_review", notes: "Re-check margins" });
  });

  it("rejects forbidden fields not in the update schema", async () => {
    const response = await request(makeApp())
      .patch("/cases/CASE-2026-0001")
      .send({ predictedClass: "lung_type1_cancer", confidence: 0.99 });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("rejects an empty update body", async () => {
    const response = await request(makeApp()).patch("/cases/CASE-2026-0001").send({});
    expect(response.status).toBe(400);
  });

  it("rejects an invalid status value", async () => {
    const response = await request(makeApp())
      .patch("/cases/CASE-2026-0001")
      .send({ status: "not-a-real-status" });
    expect(response.status).toBe(400);
  });

  it("returns 404 for a case id that does not exist", async () => {
    const response = await request(makeApp())
      .patch("/cases/CASE-DOES-NOT-EXIST")
      .send({ notes: "test" });
    expect(response.status).toBe(404);
  });
});
