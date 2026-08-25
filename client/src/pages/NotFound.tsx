import { Link } from "react-router-dom";
import { SearchX } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-slate-50 px-6 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
        <SearchX className="h-6 w-6" />
      </div>
      <h1 className="text-lg font-semibold text-slate-800">Page not found</h1>
      <p className="max-w-sm text-sm text-slate-500">
        The page you're looking for doesn't exist or may have been moved.
      </p>
      <Link
        to="/dashboard"
        className="mt-2 inline-flex items-center justify-center rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-700"
      >
        Back to dashboard
      </Link>
    </div>
  );
}
