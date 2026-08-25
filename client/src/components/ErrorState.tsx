import { AlertCircle, RotateCcw } from "lucide-react";

interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
}

/**
 * Generic inline error panel shown when a data fetch fails. Used across
 * list/detail pages so failures look consistent once real API calls
 * are wired up.
 */
export default function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-red-200 bg-red-50/50 px-4 py-10 text-center"
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-500">
        <AlertCircle className="h-6 w-6" />
      </div>
      <p className="text-sm font-medium text-slate-700">Something went wrong</p>
      <p className="max-w-sm text-sm text-slate-500">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-1 inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Try again
        </button>
      )}
    </div>
  );
}
