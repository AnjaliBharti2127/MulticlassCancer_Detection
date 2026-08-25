import { Router } from "express";

import { predictSlideImage } from "../controllers/predictionController";
import { uploadSlideImage } from "../middleware/upload";

const router = Router();

router.post(
  "/",
  uploadSlideImage,
  predictSlideImage,
);

export default router;