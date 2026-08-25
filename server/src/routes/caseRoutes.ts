import { Router } from "express";
import { listCases, getCase, createCase, updateCase } from "../controllers/caseController";
import { uploadSlideImage, validateAndStoreSlideImage } from "../middleware/upload";
import { validateCaseUploadBody } from "../middleware/validateCaseUploadBody";
import { validateRequest } from "../middleware/validateRequest";
import { updateCaseSchema } from "../validation/caseValidation";

const router = Router();

router.get("/", listCases);
router.get("/:id", getCase);
router.post(
  "/",
  uploadSlideImage,
  validateCaseUploadBody,
  validateAndStoreSlideImage,
  createCase
);
router.patch("/:id", validateRequest(updateCaseSchema), updateCase);

export default router;
