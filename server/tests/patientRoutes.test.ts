import express, { type NextFunction, type Request, type Response } from "express";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import { errorHandler } from "../src/middleware/errorHandler";
import { validateRequest } from "../src/middleware/validateRequest";
import { createPatientSchema } from "../src/validation/patientValidation";

vi.mock("../src/services/patientService", () => ({
  createPatient: vi.fn(async (body: Record<string, unknown>) => ({ id: "PAT-TEST", ...body })),
  getPatientById: vi.fn(async (id: string) => {
    if (id === "missing") {
      const { ApiError } = await import("../src/utils/ApiError");
      throw ApiError.notFound("Patient not found");
    }
    return { id, name: "Test Patient" };
  }),
}));

import { createPatient, getPatient } from "../src/controllers/patientController";

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use((req: Request, _res: Response, next: NextFunction) => { req.id = "test-request"; next(); });
  app.post("/patients", validateRequest(createPatientSchema), createPatient);
  app.get("/patients/:id", getPatient);
  app.use(errorHandler);
  return app;
}

describe("patient routes", () => {
  it("creates a valid patient", async () => {
    const response = await request(makeApp()).post("/patients").send({
      name: "Anjali", age: 23, gender: "female", contactNumber: "9999999999", email: "a@example.com",
    });
    expect(response.status).toBe(201);
    expect(response.body.data.patient.id).toBe("PAT-TEST");
  });

  it("rejects invalid patient input", async () => {
    const response = await request(makeApp()).post("/patients").send({ name: "", age: 200, gender: "x" });
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns 404 for an unknown patient", async () => {
    const response = await request(makeApp()).get("/patients/missing");
    expect(response.status).toBe(404);
  });
});
