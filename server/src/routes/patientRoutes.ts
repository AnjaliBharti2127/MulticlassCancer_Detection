import { Router } from "express";
import { listPatients, getPatient, createPatient } from "../controllers/patientController";
import { validateRequest } from "../middleware/validateRequest";
import { createPatientSchema } from "../validation/patientValidation";

const router = Router();

router.get("/", listPatients);
router.get("/:id", getPatient);
router.post("/", validateRequest(createPatientSchema), createPatient);

export default router;
