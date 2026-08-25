import fs from "fs/promises";
import path from "path";
import type { StorageAdapter, StoredFile } from "./StorageAdapter";
import { ApiError } from "../utils/ApiError";

export class LocalStorageAdapter implements StorageAdapter {
  constructor(
    private readonly rootDirectory: string,
    private readonly publicPrefix = "/uploads"
  ) {}

  private resolveSafePath(filename: string): string {
    const safeName = path.basename(filename);
    if (!safeName || safeName !== filename || filename.includes("..")) {
      throw ApiError.badRequest("Invalid storage filename");
    }

    const resolvedRoot = path.resolve(this.rootDirectory);
    const resolvedFile = path.resolve(resolvedRoot, safeName);
    if (!resolvedFile.startsWith(`${resolvedRoot}${path.sep}`)) {
      throw ApiError.badRequest("Invalid storage path");
    }
    return resolvedFile;
  }

  async save(buffer: Buffer, filename: string): Promise<StoredFile> {
    const absolutePath = this.resolveSafePath(filename);
    await fs.mkdir(this.rootDirectory, { recursive: true });
    await fs.writeFile(absolutePath, buffer, { flag: "wx" });
    return {
      filename,
      absolutePath,
      publicUrl: `${this.publicPrefix}/${encodeURIComponent(filename)}`,
    };
  }

  async delete(filename: string): Promise<void> {
    const absolutePath = this.resolveSafePath(filename);
    try {
      await fs.unlink(absolutePath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        throw error;
      }
    }
  }
}
