import type { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { sendSuccess } from "../utils/apiResponse";
import * as dashboardService from "../services/dashboardService";

export const getSummary = asyncHandler(async (_req: Request, res: Response) => {
  const summary = await dashboardService.getDashboardSummary();
  sendSuccess(res, summary);
});
