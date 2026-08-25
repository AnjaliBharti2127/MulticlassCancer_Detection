import { useRef, useState, type ChangeEvent, type DragEvent } from "react";

import { UploadCloud, ImageOff, RotateCcw, FileImage } from "lucide-react";
import { UPLOAD_CONFIG } from "../config/api";

interface ImageUploaderProps {
  file: File | null;
  previewUrl: string | null;
  onFileSelect: (file: File) => void;
  onReset: () => void;
  disabled?: boolean;
}

function isTiffFile(file: File): boolean {
  const type = file.type.toLowerCase();
  if (type === "image/tiff" || type === "image/x-tiff") return true;
  const name = file.name.toLowerCase();
  return name.endsWith(".tif") || name.endsWith(".tiff");
}

function validateFile(file: File): string | null {
  if (!UPLOAD_CONFIG.acceptedImageTypes.includes(file.type) && !isTiffFile(file)) {
    return "Unsupported file type. Please upload a JPG, JPEG, PNG, or TIFF image.";
  }
  if (file.size > UPLOAD_CONFIG.maxFileSizeBytes) {
    return "File is too large. Maximum allowed size is 5 MB.";
  }
  return null;
}

export default function ImageUploader({
  file,
  previewUrl,
  onFileSelect,
  onReset,
  disabled,
}: ImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFile = (candidate: File | undefined) => {
    if (!candidate) return;
    const validationError = validateFile(candidate);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    onFileSelect(candidate);
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    handleFile(e.target.files?.[0]);
    e.target.value = "";
  };

  const handleDrop = (e: DragEvent<HTMLButtonElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled) return;
    handleFile(e.dataTransfer.files?.[0]);
  };

  const handleReset = () => {
    setError(null);
    onReset();
  };

  if (file && previewUrl) {
    const tiff = isTiffFile(file);

    return (
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="aspect-[4/3] w-full overflow-hidden rounded-lg bg-slate-100">
          {tiff ? (
            <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-center px-4">
              <FileImage className="h-10 w-10 text-slate-400" />
              <p className="text-sm font-medium text-slate-600">
                Preview isn&apos;t supported for TIFF files in this browser
              </p>
              <p className="text-xs text-slate-400">The file will still upload and process normally.</p>
            </div>
          ) : (
            <img
              src={previewUrl}
              alt="Selected histopathology slide preview"
              className="h-full w-full object-contain"
            />
          )}
        </div>
        <div className="mt-3 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-slate-700">{file.name}</p>
            <p className="text-xs text-slate-400">{(file.size / 1024).toFixed(0)} KB</p>
          </div>
          <button
            type="button"
            onClick={handleReset}
            disabled={disabled}
            className="flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Choose another
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        aria-label="Upload slide image"
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`flex aspect-[4/3] w-full cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 text-center transition-colors ${
          isDragging
            ? "border-brand-400 bg-brand-50"
            : "border-slate-300 bg-white hover:border-brand-300 hover:bg-slate-50"
        }`}
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-brand-600">
          <UploadCloud className="h-6 w-6" />
        </div>
        <div>
          <p className="text-sm font-medium text-slate-700">
            Drag and drop a slide image, or click to browse
          </p>
          <p className="mt-1 text-xs text-slate-400">JPG, JPEG, PNG or TIFF · Max 5 MB</p>
        </div>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={[...UPLOAD_CONFIG.acceptedImageTypes, ...UPLOAD_CONFIG.acceptedExtensions].join(",")}
        className="hidden"
        onChange={handleInputChange}
      />

      {error && (
        <div className="mt-3 flex items-start gap-2 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-600">
          <ImageOff className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
