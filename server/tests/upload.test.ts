import express, { type Request, type Response } from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { detectImageType, uploadSlideImage, validateAndStoreSlideImage } from "../src/middleware/upload";
import { validateCaseUploadBody } from "../src/middleware/validateCaseUploadBody";
import { errorHandler } from "../src/middleware/errorHandler";

function makeApp() {
  const app = express();
  app.use((req, _res, next) => {
    req.id = "test-request";
    next();
  });
  app.post(
    "/upload",
    uploadSlideImage,
    validateCaseUploadBody,
    validateAndStoreSlideImage,
    (req: Request, res: Response) => res.status(200).json({ success: true, hasFile: Boolean(req.file) })
  );
  app.use(errorHandler);
  return app;
}

describe("image signature detection", () => {
  it("detects JPEG magic bytes regardless of filename", () => {
    expect(detectImageType(Buffer.from([0xff, 0xd8, 0xff, 0xe0]))).toBe("jpeg");
  });

  it("detects PNG magic bytes", () => {
    expect(detectImageType(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toBe("png");
  });

  it("detects little- and big-endian TIFF magic bytes", () => {
    expect(detectImageType(Buffer.from([0x49, 0x49, 0x2a, 0x00]))).toBe("tiff");
    expect(detectImageType(Buffer.from([0x4d, 0x4d, 0x00, 0x2a]))).toBe("tiff");
  });

  it("rejects fake extensions and invalid signatures", () => {
    expect(detectImageType(Buffer.from("not a real image"))).toBeNull();
  });
});

describe("upload request guards", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("rejects a missing image", async () => {
    const response = await request(makeApp())
      .post("/upload")
      .field("patientId", "507f1f77bcf86cd799439011")
      .field("specimenType", "Colon biopsy");

    expect(response.status).toBe(400);
  });

  it("rejects invalid body before any persistent save stage", async () => {
    const response = await request(makeApp())
      .post("/upload")
      .field("specimenType", "Colon biopsy")
      .attach("slideImage", Buffer.from([0xff, 0xd8, 0xff]), {
        filename: "sample.jpg",
        contentType: "image/jpeg",
      });

    expect(response.status).toBe(400);
    expect(response.body.error.message).toBe("Validation failed");
  });

  it("rejects an allowed MIME type with an invalid file signature", async () => {
    const response = await request(makeApp())
      .post("/upload")
      .field("patientId", "507f1f77bcf86cd799439011")
      .field("specimenType", "Colon biopsy")
      .attach("slideImage", Buffer.from("this is not a jpeg"), {
        filename: "fake.jpg",
        contentType: "image/jpeg",
      });

    expect(response.status).toBe(400);
    expect(response.body.error.message).toContain("signature");
  });

  it("rejects oversized files", async () => {
    const oversized = Buffer.alloc(6 * 1024 * 1024, 0xff);
    const response = await request(makeApp())
      .post("/upload")
      .field("patientId", "507f1f77bcf86cd799439011")
      .field("specimenType", "Colon biopsy")
      .attach("slideImage", oversized, {
        filename: "large.jpg",
        contentType: "image/jpeg",
      });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("UPLOAD_ERROR");
  });
});
