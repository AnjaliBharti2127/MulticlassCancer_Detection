import type { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { parseListQuery } from "../utils/pagination";
import { sendSuccess } from "../utils/apiResponse";
import * as patientService from "../services/patientService";

export const listPatients = asyncHandler(async (req: Request, res: Response) => {
  const query = parseListQuery(req, "lastVisit");
  const result = await patientService.getPatients(query);
  // `data` keeps the existing flat shape (items/total/page/...) the frontend
  // already parses as PaginatedResponse<Patient> — meta duplicates the
  // pagination fields to satisfy the new contract without a breaking change.
  sendSuccess(res, result, {
    meta: { total: result.total, page: result.page, pageSize: result.pageSize, totalPages: result.totalPages },
  });
});

export const getPatient = asyncHandler(async (req: Request, res: Response) => {
  const patient = await patientService.getPatientById(req.params.id);
  sendSuccess(res, { patient });
});

export const createPatient = asyncHandler(async (req: Request, res: Response) => {
  const patient = await patientService.createPatient(req.body);
  sendSuccess(res, { patient }, { status: 201, meta: { message: "Patient created successfully" } });
});
