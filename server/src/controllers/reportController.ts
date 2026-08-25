import type { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { parseListQuery } from "../utils/pagination";
import { sendSuccess } from "../utils/apiResponse";
import * as reportService from "../services/reportService";

export const listReports = asyncHandler(async (req: Request, res: Response) => {
  const query = parseListQuery(req, "generatedAt");
  const status = typeof req.query.status === "string" ? req.query.status : undefined;
  const result = await reportService.getReports(query, status);
  sendSuccess(res, result, { meta: { total: result.total, page: result.page, pageSize: result.pageSize, totalPages: result.totalPages } });
});
export const getReport = asyncHandler(async (req: Request, res: Response) => sendSuccess(res, { report: await reportService.getReportById(req.params.id) }));
export const saveReport = asyncHandler(async (req: Request, res: Response) => {
  const report = await reportService.createOrUpdateReport(req.body);
  sendSuccess(res, { report }, { status: req.body.status === "finalized" ? 201 : 200 });
});
