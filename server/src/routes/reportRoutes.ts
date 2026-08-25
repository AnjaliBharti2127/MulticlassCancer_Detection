import { Router } from "express";
import { listReports, getReport, saveReport } from "../controllers/reportController";
import { validateRequest } from "../middleware/validateRequest";
import { createReportSchema } from "../validation/reportValidation";
const router = Router();
router.get("/", listReports);
router.post("/", validateRequest(createReportSchema), saveReport);
router.get("/:id", getReport);
export default router;
