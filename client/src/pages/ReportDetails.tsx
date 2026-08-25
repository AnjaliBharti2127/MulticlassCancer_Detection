import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, FileSearch, Printer, ShieldAlert } from "lucide-react";
import { getReportById } from "../services/reportService";
import type { ReportDetail } from "../types/report";
import LoadingSpinner from "../components/LoadingSpinner";
import ErrorState from "../components/ErrorState";
import { formatDate } from "../utils/formatDate";
import { formatConfidence, confidenceToPercent } from "../utils/formatConfidence";
import { useToast } from "../context/ToastContext";

export default function ReportDetails() {
  const { id } = useParams<{ id: string }>();
  const { showToast } = useToast();
  const [report, setReport] = useState<ReportDetail | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    if (!id) return;
    let isMounted = true;
    setReport(undefined);
    setError(null);
    getReportById(id)
      .then((data) => {
        if (isMounted) setReport(data);
      })
      .catch(() => {
        if (isMounted) setError("Could not load this report. Please try again.");
      });
    return () => {
      isMounted = false;
    };
  }, [id, refreshToken]);

  if (error) {
    return <ErrorState message={error} onRetry={() => setRefreshToken((n) => n + 1)} />;
  }

  if (report === undefined) {
    return <LoadingSpinner label="Loading report..." />;
  }

  if (report === null) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-slate-200 bg-white py-16 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
          <FileSearch className="h-6 w-6" />
        </div>
        <p className="text-sm font-medium text-slate-700">Report not found</p>
        <p className="max-w-sm text-sm text-slate-500">
          No report matches "{id}". It may not have been generated yet.
        </p>
        <Link
          to="/reports"
          className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:text-brand-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to reports
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 print:hidden sm:flex-row sm:items-center sm:justify-between">
        <Link
          to="/reports"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to reports
        </Link>
        <button
          type="button"
          onClick={() => { showToast("Print dialog opened.", "info"); window.print(); }}
          className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 sm:w-auto"
        >
          <Printer className="h-4 w-4" />
          Print report
        </button>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-8 print:border-0 print:p-0">
        <div className="flex flex-col gap-1 border-b border-slate-200 pb-5">
          <p className="text-xs font-medium uppercase tracking-wide text-brand-600">
            Histopathology Report
          </p>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-lg font-semibold text-slate-800">{report.id}</h2>
            <p className="text-sm text-slate-500">Generated {formatDate(report.generatedAt)}</p>
          </div>
        </div>

        <dl className="grid grid-cols-1 gap-4 border-b border-slate-200 py-5 text-sm min-[420px]:grid-cols-2 sm:grid-cols-3">
          <div>
            <dt className="text-xs uppercase tracking-wide text-slate-400">Patient</dt>
            <dd className="mt-1 font-medium text-slate-700">{report.patientName}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-slate-400">Patient ID</dt>
            <dd className="mt-1 font-medium text-slate-700">{report.patientId}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-slate-400">Age / Sex</dt>
            <dd className="mt-1 font-medium text-slate-700">{report.ageSex}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-slate-400">Specimen</dt>
            <dd className="mt-1 font-medium text-slate-700">{report.specimenType}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-slate-400">Case</dt>
            <dd className="mt-1 font-medium text-slate-700">
              <Link to={`/cases/${report.caseId}`} className="text-brand-700 hover:underline">
                {report.caseId}
              </Link>
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-slate-400">Submitted</dt>
            <dd className="mt-1 font-medium text-slate-700">
              {formatDate(report.caseSubmittedAt)}
            </dd>
          </div>
        </dl>

        <div className="border-b border-slate-200 py-5">
          <p className="mb-3 text-xs font-medium uppercase tracking-wide text-slate-400">
            AI-assisted findings
          </p>
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-lg font-semibold text-slate-800">{report.predictedClass}</p>
              <p className="text-sm text-slate-500">Predicted class</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-brand-600">
                {formatConfidence(report.confidence)}
              </p>
              <p className="text-sm text-slate-500">Confidence</p>
            </div>
          </div>

          <div className="mt-4 space-y-2.5">
            {report.topPredictions.map((prediction) => (
              <div key={prediction.className}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="text-slate-600">{prediction.className}</span>
                  <span className="font-medium text-slate-700">
                    {formatConfidence(prediction.confidence)}
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 print:hidden">
                  <div
                    className="h-full rounded-full bg-brand-500"
                    style={{ width: `${confidenceToPercent(prediction.confidence)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          {report.notes && (
            <div className="mt-5 rounded-lg bg-slate-50 px-3 py-2.5 text-sm text-slate-600 print:bg-transparent print:px-0">
              {report.notes}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-4 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm">
            <p className="text-xs uppercase tracking-wide text-slate-400">Signed off by</p>
            <p className="mt-1 font-medium text-slate-700">{report.pathologist}</p>
          </div>
          <div className="flex items-start gap-2 rounded-lg border border-amber-100 bg-amber-50 px-3 py-2.5 text-xs text-amber-700 print:border-0 print:bg-transparent print:px-0">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
            <span>AI-assisted analysis. For research and educational use only.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
