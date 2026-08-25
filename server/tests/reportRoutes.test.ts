import express, { type NextFunction, type Request, type Response } from "express";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import { errorHandler } from "../src/middleware/errorHandler";
import { validateRequest } from "../src/middleware/validateRequest";
import { createReportSchema } from "../src/validation/reportValidation";

vi.mock("../src/services/reportService", () => ({
  createOrUpdateReport: vi.fn(async (body: any) => {
    if (body.caseId === "CASE-FINAL") {
      const { ApiError } = await import("../src/utils/ApiError");
      throw new ApiError(409, "REPORT_ALREADY_FINALIZED", "A finalized report already exists for this case");
    }
    return { id: "RPT-TEST", ...body };
  }),
}));

import { saveReport } from "../src/controllers/reportController";

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use((req: Request, _res: Response, next: NextFunction) => { req.id = "test-request"; next(); });
  app.post("/reports", validateRequest(createReportSchema), saveReport);
  app.use(errorHandler);
  return app;
}

const valid = {
  caseId: "CASE-2026-0001", pathologist: "Dr Test", diagnosis: "Diagnosis",
  findings: "Findings", recommendation: "Recommendation", status: "draft",
};

describe("report routes", () => {
  it("saves a draft", async () => {
    const response = await request(makeApp()).post("/reports").send(valid);
    expect(response.status).toBe(200);
    expect(response.body.data.report.status).toBe("draft");
  });

  it("finalizes a report", async () => {
    const response = await request(makeApp()).post("/reports").send({ ...valid, status: "finalized" });
    expect(response.status).toBe(201);
    expect(response.body.data.report.status).toBe("finalized");
  });

  it("rejects incomplete report content", async () => {
    const response = await request(makeApp()).post("/reports").send({ caseId: "CASE-1", status: "draft" });
    expect(response.status).toBe(400);
  });

  it("rejects another finalized report", async () => {
    const response = await request(makeApp()).post("/reports").send({ ...valid, caseId: "CASE-FINAL", status: "finalized" });
    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe("REPORT_ALREADY_FINALIZED");
  });
});
