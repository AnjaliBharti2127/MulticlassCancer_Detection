import type { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { parseListQuery } from "../utils/pagination";
import { ApiError } from "../utils/ApiError";
import { sendSuccess } from "../utils/apiResponse";
import { storageAdapter } from "../middleware/upload";
import * as caseService from "../services/caseService";

export const listCases = asyncHandler(async (req: Request, res: Response) => {
  const query = parseListQuery(req, "submittedAt");
  const status = typeof req.query.status === "string" ? req.query.status : undefined;
  const result = await caseService.getCases(query, status);
  sendSuccess(res, result, {
    meta: { total: result.total, page: result.page, pageSize: result.pageSize, totalPages: result.totalPages },
  });
});

export const getCase = asyncHandler(async (req: Request, res: Response) => {
  const caseDetail = await caseService.getCaseById(req.params.id);
  sendSuccess(res, { case: caseDetail });
});

export const updateCase = asyncHandler(async (req: Request, res: Response) => {
  const caseDetail = await caseService.updateCase(req.params.id, req.body);
  sendSuccess(res, { case: caseDetail }, { meta: { message: "Case updated successfully" } });
});

export const createCase = asyncHandler(async (req: Request, res: Response) => {
  const image = req.validatedImage;
  if (!image) {
    throw ApiError.badRequest("A validated slide image is required");
  }

  try {
    const caseDetail = await caseService.createCase({
      patientId: req.body.patientId,
      specimenType: req.body.specimenType,
      notes: req.body.notes,
      slideName: image.originalName,
      slideImageUrl: image.publicUrl,
      slideImageFilename: image.filename,
    });

    sendSuccess(res, { case: caseDetail }, { status: 201, meta: { message: "Case created successfully" } });
  } catch (error) {
    await storageAdapter.delete(image.filename).catch(() => undefined);
    throw error;
  }
});
