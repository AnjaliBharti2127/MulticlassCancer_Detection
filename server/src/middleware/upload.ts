import path from "path";
import crypto from "crypto";
import multer, { type FileFilterCallback } from "multer";
import type { NextFunction, Request, Response } from "express";
import { imageSize } from "image-size";
import { env } from "../config/env";
import { ApiError } from "../utils/ApiError";
import { LocalStorageAdapter } from "../storage/LocalStorageAdapter";

export const UPLOAD_DIR = path.resolve(__dirname, "..", "..", "uploads");
export const storageAdapter = new LocalStorageAdapter(UPLOAD_DIR);

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/tiff",
  "image/x-tiff",
]);

export type DetectedImageType = "jpeg" | "png" | "tiff";

const TYPE_METADATA: Record<DetectedImageType, { extension: string; mimeType: string }> = {
  jpeg: { extension: ".jpg", mimeType: "image/jpeg" },
  png: { extension: ".png", mimeType: "image/png" },
  tiff: { extension: ".tiff", mimeType: "image/tiff" },
};

export function detectImageType(buffer: Buffer): DetectedImageType | null {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "jpeg";
  }

  const pngSignature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (buffer.length >= pngSignature.length && buffer.subarray(0, pngSignature.length).equals(pngSignature)) {
    return "png";
  }

  const littleEndianTiff = Buffer.from([0x49, 0x49, 0x2a, 0x00]);
  const bigEndianTiff = Buffer.from([0x4d, 0x4d, 0x00, 0x2a]);
  if (
    buffer.length >= 4 &&
    (buffer.subarray(0, 4).equals(littleEndianTiff) || buffer.subarray(0, 4).equals(bigEndianTiff))
  ) {
    return "tiff";
  }

  return null;
}

function fileFilter(_req: Request, file: Express.Multer.File, callback: FileFilterCallback): void {
  if (!ALLOWED_MIME_TYPES.has(file.mimetype.toLowerCase())) {
    callback(ApiError.badRequest("Only JPG/JPEG, PNG, and TIFF image files are allowed"));
    return;
  }
  callback(null, true);
}

export const uploadSlideImage = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits: {
    files: 1,
    fileSize: env.maxFileSizeMb * 1024 * 1024,
  },
}).single("slideImage");

function mimeMatchesDetectedType(mimeType: string, detectedType: DetectedImageType): boolean {
  const normalized = mimeType.toLowerCase();
  if (detectedType === "jpeg") return normalized === "image/jpeg" || normalized === "image/jpg";
  if (detectedType === "png") return normalized === "image/png";
  return normalized === "image/tiff" || normalized === "image/x-tiff";
}

export async function validateAndStoreSlideImage(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.file) {
      throw ApiError.badRequest("A slide image file is required (field name: slideImage)");
    }

    const detectedType = detectImageType(req.file.buffer);
    if (!detectedType) {
      throw ApiError.badRequest("Invalid or unsupported image signature");
    }

    if (!mimeMatchesDetectedType(req.file.mimetype, detectedType)) {
      throw ApiError.badRequest("Image MIME type does not match its actual file signature");
    }

    let dimensions: ReturnType<typeof imageSize>;
    try {
      dimensions = imageSize(req.file.buffer);
    } catch {
      throw ApiError.badRequest("The uploaded image is corrupted or unreadable");
    }

    const width = dimensions.width;
    const height = dimensions.height;
    if (!width || !height) {
      throw ApiError.badRequest("Unable to determine image dimensions");
    }
    if (width < env.minImageDimensionPx || height < env.minImageDimensionPx) {
      throw ApiError.badRequest(
        `Image dimensions must be at least ${env.minImageDimensionPx}x${env.minImageDimensionPx} pixels`
      );
    }
    if (width > env.maxImageDimensionPx || height > env.maxImageDimensionPx) {
      throw ApiError.badRequest(
        `Image dimensions must not exceed ${env.maxImageDimensionPx}x${env.maxImageDimensionPx} pixels`
      );
    }
    if (width * height > env.maxImagePixels) {
      throw ApiError.badRequest(`Image contains too many pixels (maximum ${env.maxImagePixels})`);
    }

    const typeMeta = TYPE_METADATA[detectedType];
    const filename = `slide-${Date.now()}-${crypto.randomBytes(12).toString("hex")}${typeMeta.extension}`;
    const stored = await storageAdapter.save(req.file.buffer, filename);

    req.validatedImage = {
      originalName: path.basename(req.file.originalname),
      filename: stored.filename,
      absolutePath: stored.absolutePath,
      publicUrl: stored.publicUrl,
      mimeType: typeMeta.mimeType,
      detectedType,
      extension: typeMeta.extension,
      sizeBytes: req.file.size,
      width,
      height,
    };
    next();
  } catch (error) {
    next(error);
  }
}
