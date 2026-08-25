import type { DetectedImageType } from "../middleware/upload";

declare global {
  namespace Express {
    interface ValidatedImage {
      originalName: string;
      filename: string;
      absolutePath: string;
      publicUrl: string;
      mimeType: string;
      detectedType: DetectedImageType;
      extension: string;
      sizeBytes: number;
      width: number;
      height: number;
    }

    interface Request {
      /** Unique id set by middleware/requestId.ts. */
      id: string;
      /** Validated and persisted image metadata set by validateAndStoreSlideImage. */
      validatedImage?: ValidatedImage;
    }
  }
}

export {};
