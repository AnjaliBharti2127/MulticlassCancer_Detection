import type { Request, Response } from "express";
import { describe, expect, it, vi } from "vitest";

vi.mock("../src/services/caseService", () => ({
  createCase: vi.fn().mockRejectedValue(new Error("database write failed")),
}));

import { createCase } from "../src/controllers/caseController";
import { storageAdapter } from "../src/middleware/upload";

describe("case creation cleanup", () => {
  it("deletes a stored image when database case creation fails", async () => {
    const deleteSpy = vi.spyOn(storageAdapter, "delete").mockResolvedValue();
    const req = {
      body: {
        patientId: "507f1f77bcf86cd799439011",
        specimenType: "Colon biopsy",
      },
      validatedImage: {
        originalName: "sample.jpg",
        filename: "slide-test.jpg",
        absolutePath: "/tmp/slide-test.jpg",
        publicUrl: "/uploads/slide-test.jpg",
        mimeType: "image/jpeg",
        detectedType: "jpeg",
        extension: ".jpg",
        sizeBytes: 100,
        width: 224,
        height: 224,
      },
    } as unknown as Request;
    const res = {} as Response;

    const error = await new Promise<unknown>((resolve) => {
      createCase(req, res, resolve);
    });

    expect(deleteSpy).toHaveBeenCalledWith("slide-test.jpg");
    expect(error).toBeInstanceOf(Error);
  });
});
