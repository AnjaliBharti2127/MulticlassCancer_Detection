import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FolderOpen, Clock, CheckCircle2, AlertTriangle, Sparkles } from "lucide-react";
import StatCard from "../components/StatCard";
import RecentCasesTable from "../components/RecentCasesTable";
import LoadingSpinner from "../components/LoadingSpinner";
import ErrorState from "../components/ErrorState";
import { getDashboardSummary } from "../services/dashboardService";
import type { DashboardSummary } from "../types/dashboard";
import { formatConfidence } from "../utils/formatConfidence";

export default function Dashboard() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);

  const retry = useCallback(() => setRefreshToken((n) => n + 1), []);

  useEffect(() => {
    let isMounted = true;
    setError(null);
    getDashboardSummary()
      .then((data) => {
        if (isMounted) setSummary(data);
      })
      .catch(() => {
        if (isMounted) setError("Could not load dashboard data. Please try again.");
      });
    return () => {
      isMounted = false;
    };
  }, [refreshToken]);

  if (error) {
    return <ErrorState message={error} onRetry={retry} />;
  }

  if (!summary) {
    return <LoadingSpinner label="Loading dashboard..." />;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total cases" value={summary.totalCases} icon={FolderOpen} />
        <StatCard label="Pending analysis" value={summary.pendingAnalysis} icon={Clock} />
        <StatCard
          label="Completed analyses"
          value={summary.completedAnalyses}
          icon={CheckCircle2}
        />
        <StatCard
          label="Needs review"
          value={summary.needsReview}
          icon={AlertTriangle}
          tone="warning"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-5 lg:col-span-2">
          <div className="mb-4 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-brand-600" />
            <h2 className="text-sm font-semibold text-slate-700">Model activity</h2>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-400">Active model</p>
              <p className="mt-1 text-sm font-medium text-slate-700">{summary.modelVersion}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-400">
                Average confidence
              </p>
              <p className="mt-1 text-sm font-medium text-slate-700">
                {formatConfidence(summary.averageConfidence)}
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5">
          <div>
            <h2 className="text-sm font-semibold text-slate-700">Quick action</h2>
            <p className="mt-1 text-sm text-slate-500">
              Run a new AI analysis on a histopathology slide.
            </p>
          </div>
          <Link
            to="/diagnose"
            className="mt-4 inline-flex items-center justify-center rounded-lg bg-brand-600 py-2.5 text-sm font-medium text-white transition hover:bg-brand-700"
          >
            Start new diagnosis
          </Link>
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold text-slate-700">Recent cases</h2>
        <RecentCasesTable cases={summary.recentCases} />
      </div>
    </div>
  );
}
