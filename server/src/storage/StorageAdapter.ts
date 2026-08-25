export interface StoredFile {
  filename: string;
  absolutePath: string;
  publicUrl: string;
}

export interface StorageAdapter {
  save(buffer: Buffer, filename: string): Promise<StoredFile>;
  delete(filename: string): Promise<void>;
}
