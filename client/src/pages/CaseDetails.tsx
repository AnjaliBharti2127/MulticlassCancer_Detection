import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, FileSearch, User, Microscope, ArrowRight } from "lucide-react";
import { getCaseById } from "../services/caseService";
import { saveReport } from "../services/reportService";
import { ApiClientError } from "../services/apiClient";
import { useToast } from "../context/ToastContext";
import type { CaseDetail } from "../types/case";
import StatusBadge from "../components/StatusBadge";
import PredictionCard from "../components/PredictionCard";
import ExplainabilityViewer from "../components/ExplainabilityViewer";
import LoadingSpinner from "../components/LoadingSpinner";
import ErrorState from "../components/ErrorState";
import { formatDate } from "../utils/formatDate";
import { toAbsoluteFileUrl } from "../services/apiClient";

export default function CaseDetails() {
  const { id } = useParams<{ id: string }>();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [caseDetail, setCaseDetail] = useState<CaseDetail | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);
  const [showReportForm, setShowReportForm] = useState(false);
  const [savingReport, setSavingReport] = useState(false);
  const [reportForm, setReportForm] = useState({ pathologist: "", diagnosis: "", findings: "", recommendation: "" });

  useEffect(() => {
    if (!id) return;
    let isMounted = true;
    setCaseDetail(undefined);
    setError(null);
    getCaseById(id)
      .then((data) => {
        if (isMounted) setCaseDetail(data);
      })
      .catch(() => {
        if (isMounted) setError("Could not load this case. Please try again.");
      });
    return () => {
      isMounted = false;
    };
  }, [id, refreshToken]);

  if (error) {
    return <ErrorState message={error} onRetry={() => setRefreshToken((n) => n + 1)} />;
  }

  if (caseDetail === undefined) {
    return <LoadingSpinner label="Loading case..." />;
  }

  if (caseDetail === null) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-slate-200 bg-white py-16 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
          <FileSearch className="h-6 w-6" />
        </div>
        <p className="text-sm font-medium text-slate-700">Case not found</p>
        <p className="max-w-sm text-sm text-slate-500">
          No case matches "{id}". It may have been removed or the link is incorrect.
        </p>
        <Link
          to="/dashboard"
          className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:text-brand-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to dashboard
        </Link>
      </div>
    );
  }

  const hasPrediction = caseDetail.topPredictions.length > 0;
  const reportLocked = caseDetail.status === "completed";
  const slideImageUrl = toAbsoluteFileUrl(caseDetail.slideImageUrl);

  const submitReport = async (status: "draft" | "finalized") => {
    if (!reportForm.pathologist.trim() || !reportForm.diagnosis.trim() || !reportForm.findings.trim() || !reportForm.recommendation.trim()) {
      showToast("Please complete all report fields.", "error");
      return;
    }
    setSavingReport(true);
    try {
      const report = await saveReport({ caseId: caseDetail.id, ...reportForm, status });
      showToast(status === "draft" ? `Report ${report.id} saved as draft.` : `Report ${report.id} finalized.`, "success");
      setShowReportForm(false);
      navigate(`/reports/${encodeURIComponent(report.id)}`);
    } catch (err) {
      showToast(err instanceof ApiClientError ? err.message : "Could not save report.", "error");
    } finally {
      setSavingReport(false);
    }
  };

  return (
    <div className="space-y-6">
      <Link
        to="/dashboard"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to dashboard
      </Link>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="mb-4 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-brand-600" />
              <h2 className="text-sm font-semibold text-slate-700">Case {caseDetail.id}</h2>
            </div>
            <StatusBadge status={caseDetail.status} />
          </div>

          <dl className="grid grid-cols-2 gap-y-4 text-sm">
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-400">Patient</dt>
              <dd className="mt-1 font-medium text-slate-700">{caseDetail.patientName}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-400">Patient ID</dt>
              <dd className="mt-1 font-medium text-slate-700">{caseDetail.patientId}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-400">Age / Sex</dt>
              <dd className="mt-1 font-medium text-slate-700">{caseDetail.ageSex}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-400">Specimen</dt>
              <dd className="mt-1 font-medium text-slate-700">{caseDetail.specimenType}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-400">Slide file</dt>
              <dd className="mt-1 font-medium text-slate-700">{caseDetail.slideName}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-400">Submitted</dt>
              <dd className="mt-1 font-medium text-slate-700">
                {formatDate(caseDetail.submittedAt)}
              </dd>
            </div>
          </dl>

          {caseDetail.notes && (
            <div className="mt-5 rounded-lg bg-slate-50 px-3 py-2.5 text-sm text-slate-600">
              {caseDetail.notes}
            </div>
          )}

          {slideImageUrl && (
            <div className="mt-5">
              <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-slate-400">
                Slide image
              </p>
              <div className="aspect-[4/3] w-full overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
                <img
                  src={slideImageUrl}
                  alt={`Histopathology slide for case ${caseDetail.id}`}
                  className="h-full w-full object-contain"
                />
              </div>
            </div>
          )}
        </section>

        {hasPrediction ? (
          <PredictionCard
            result={{
              predictionId: caseDetail.id,
              jobId: caseDetail.id,
              caseId: caseDetail.id,
              predictedClass: caseDetail.predictedClass,
              confidence: caseDetail.confidence,
              probabilities: caseDetail.topPredictions.map((prediction) => ({
                className: prediction.className,
                probability: prediction.confidence,
              })),
              model: { name: "Stage 1 Encoder", version: "historical" },
              explainability: caseDetail.explainability ?? { status: "not_requested" },
              createdAt: caseDetail.submittedAt,
            }}
          />
        ) : (
          <section className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-slate-200 bg-white p-5 text-center">
            <FileSearch className="h-8 w-8 text-slate-300" />
            <p className="text-sm text-slate-400">
              Analysis for this case hasn't completed yet.
            </p>
            <Link
              to={`/diagnose?caseId=${encodeURIComponent(caseDetail.id)}`}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-700 hover:text-brand-800 hover:underline"
            >
              <Microscope className="h-4 w-4" />
              Continue to diagnosis
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </section>
        )}
      </div>

      {hasPrediction && (
        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold text-slate-800">Pathology report</h2>
              <p className="mt-1 text-sm text-slate-500">Save a draft or finalize the report for this case.</p>
            </div>
            {!showReportForm && !reportLocked && (
              <button type="button" onClick={() => setShowReportForm(true)} className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700">Generate Report</button>
            )}
            {reportLocked && (
              <Link to="/reports" className="text-sm font-medium text-brand-700 hover:underline">View finalized report</Link>
            )}
          </div>
          {showReportForm && !reportLocked && (
            <div className="mt-4 grid gap-3">
              <input value={reportForm.pathologist} onChange={(e) => setReportForm((v) => ({ ...v, pathologist: e.target.value }))} placeholder="Pathologist name" className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
              <textarea value={reportForm.diagnosis} onChange={(e) => setReportForm((v) => ({ ...v, diagnosis: e.target.value }))} placeholder="Diagnosis" rows={2} className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
              <textarea value={reportForm.findings} onChange={(e) => setReportForm((v) => ({ ...v, findings: e.target.value }))} placeholder="Findings" rows={3} className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
              <textarea value={reportForm.recommendation} onChange={(e) => setReportForm((v) => ({ ...v, recommendation: e.target.value }))} placeholder="Recommendation" rows={2} className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
              <div className="flex flex-wrap gap-2">
                <button type="button" disabled={savingReport} onClick={() => submitReport("draft")} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 disabled:opacity-50">Save Draft</button>
                <button type="button" disabled={savingReport} onClick={() => submitReport("finalized")} className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">Finalize Report</button>
                <button type="button" disabled={savingReport} onClick={() => setShowReportForm(false)} className="px-3 py-2 text-sm text-slate-500">Cancel</button>
              </div>
            </div>
          )}
        </section>
      )}

      {slideImageUrl &&
        caseDetail.explainability?.status === "ready" &&
        caseDetail.explainability.heatmapUrl && (
          <ExplainabilityViewer
            originalImageUrl={slideImageUrl}
            heatmapUrl={caseDetail.explainability.heatmapUrl}
            overlayUrl={caseDetail.explainability.overlayUrl}
          />
        )}
    </div>
  );
}
