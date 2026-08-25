import fs from "fs";
import path from "path";
import os from "os";
import express, { type Request, type Response } from "express";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { errorHandler } from "../src/middleware/errorHandler";
import { validateCaseUploadBody } from "../src/middleware/validateCaseUploadBody";

const FIXTURES_DIR = path.join(__dirname, "fixtures");

// The real upload/storage modules read env at import time and write to a
// fixed uploads/ directory, so this suite gets its own temp storage root
// (via UPLOAD_DIR_OVERRIDE-free reuse of the real module) and cleans up
// after itself rather than polluting the project's uploads/ folder.
let uploadSlideImage: typeof import("../src/middleware/upload").uploadSlideImage;
let validateAndStoreSlideImage: typeof import("../src/middleware/upload").validateAndStoreSlideImage;
let storageAdapter: typeof import("../src/middleware/upload").storageAdapter;

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
    (req: Request, res: Response) => {
      res.status(200).json({ success: true, validatedImage: req.validatedImage });
    }
  );
  app.use(errorHandler);
  return app;
}

describe("valid image uploads", () => {
  const savedFilenames: string[] = [];

  beforeAll(async () => {
    ({ uploadSlideImage, validateAndStoreSlideImage, storageAdapter } = await import("../src/middleware/upload"));
  });

  afterAll(async () => {
    await Promise.all(savedFilenames.map((name) => storageAdapter.delete(name).catch(() => undefined)));
  });

  it.each([
    ["valid-100x100.jpg", "image/jpeg", "jpeg", ".jpg"],
    ["valid-100x100.png", "image/png", "png", ".png"],
    ["valid-100x100.tiff", "image/tiff", "tiff", ".tiff"],
  ])("accepts a genuine %s, stores it, and populates req.validatedImage", async (file, contentType, detectedType, extension) => {
    const buffer = fs.readFileSync(path.join(FIXTURES_DIR, file));

    const response = await request(makeApp())
      .post("/upload")
      .field("patientId", "507f1f77bcf86cd799439011")
      .field("specimenType", "Colon biopsy")
      .attach("slideImage", buffer, { filename: file, contentType });

    expect(response.status).toBe(200);
    expect(response.body.validatedImage.detectedType).toBe(detectedType);
    expect(response.body.validatedImage.extension).toBe(extension);
    expect(response.body.validatedImage.width).toBe(100);
    expect(response.body.validatedImage.height).toBe(100);
    expect(response.body.validatedImage.filename).toMatch(/^slide-\d+-[a-f0-9]{24}/);

    // The stored file should actually exist on disk under the upload root.
    expect(fs.existsSync(response.body.validatedImage.absolutePath)).toBe(true);
    savedFilenames.push(response.body.validatedImage.filename);
  });

  it("rejects an image smaller than the configured minimum dimension", async () => {
    const buffer = fs.readFileSync(path.join(FIXTURES_DIR, "too-small-10x10.png"));

    const response = await request(makeApp())
      .post("/upload")
      .field("patientId", "507f1f77bcf86cd799439011")
      .field("specimenType", "Colon biopsy")
      .attach("slideImage", buffer, { filename: "too-small-10x10.png", contentType: "image/png" });

    expect(response.status).toBe(400);
    expect(response.body.error.message).toContain("at least");
  });
});

describe("LocalStorageAdapter path traversal protection", () => {
  it("rejects filenames that attempt to escape the upload root", async () => {
    const { LocalStorageAdapter } = await import("../src/storage/LocalStorageAdapter");
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "patho-upload-test-"));
    const adapter = new LocalStorageAdapter(tempRoot);

    await expect(adapter.save(Buffer.from("data"), "../escape.jpg")).rejects.toThrow();
    await expect(adapter.save(Buffer.from("data"), "../../etc/passwd")).rejects.toThrow();
    await expect(adapter.delete("../escape.jpg")).rejects.toThrow();

    fs.rmSync(tempRoot, { recursive: true, force: true });
  });
});
