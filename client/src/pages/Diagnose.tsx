import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Activity, Microscope, AlertCircle, FolderOpen, ArrowRight } from "lucide-react";
import ImageUploader from "../components/ImageUploader";
import PredictionCard from "../components/PredictionCard";
import ExplainabilityViewer from "../components/ExplainabilityViewer";
import LoadingSpinner from "../components/LoadingSpinner";
import ConfirmDialog from "../components/ConfirmDialog";
import {
  createPredictionJob,
  getPredictionJobStatus,
  getPredictionResult,
  getExplainability,
} from "../services/predictionService";
import { getCaseById, attachExplainabilityToCase } from "../services/caseService";
import type { PredictionJobStage, PredictionResult, ExplainabilityResult } from "../types/prediction";
import type { CaseDetail } from "../types/case";
import { PREDICTION_CONFIG } from "../config/api";

const STAGE_LABELS: Record<PredictionJobStage, string> = {
  queued: "Queued for analysis...",
  preprocessing: "Preprocessing slide image...",
  inference: "Running model inference...",
  explainability: "Generating explainability heatmap...",
};

export default function Diagnose() {
  const [searchParams] = useSearchParams();
  const caseId = searchParams.get("caseId");

  const [caseContext, setCaseContext] = useState<CaseDetail | null | undefined>(
    caseId ? undefined : null
  );

  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isPredicting, setIsPredicting] = useState(false);
  const [statusLabel, setStatusLabel] = useState<string>("Analyzing...");
  const [result, setResult] = useState<PredictionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [explainability, setExplainability] = useState<ExplainabilityResult | null>(null);
  const [isLoadingExplainability, setIsLoadingExplainability] = useState(false);
  const [caseContextError, setCaseContextError] = useState<string | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Tracks whether `previewUrl` was created by this component (and therefore
  // must be revoked here) versus borrowed from an existing case's slide.
  const ownsPreviewUrl = useRef(false);

  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      if (pollTimer.current) clearInterval(pollTimer.current);
    };
  }, []);

  // Load case context (patient / specimen) when arriving from the Create Case flow.
  useEffect(() => {
    if (!caseId) return;
    let isActive = true;
    setCaseContext(undefined);
    setCaseContextError(null);
    getCaseById(caseId)
      .then((data) => {
        if (isActive) setCaseContext(data);
      })
      .catch(() => {
        if (isActive) setCaseContextError("Could not load this case. You can still run a standalone analysis.");
      });
    return () => {
      isActive = false;
    };
  }, [caseId]);

  // If we arrived from Create Case, the slide was already uploaded there —
  // reuse it instead of asking the user to upload the same image again.
  useEffect(() => {
    if (!caseContext || file || previewUrl || !caseContext.slideImageUrl) return;
    let isActive = true;
    fetch(caseContext.slideImageUrl)
      .then((res) => res.blob())
      .then((blob) => {
        if (!isActive) return;
        const autoFile = new File([blob], caseContext.slideName, {
          type: blob.type || "image/jpeg",
        });
        ownsPreviewUrl.current = false;
        setFile(autoFile);
        setPreviewUrl(caseContext.slideImageUrl!);
      })
      .catch(() => {
        // The user can still upload the slide manually if this fails.
      });
    return () => {
      isActive = false;
    };
  }, [caseContext, file, previewUrl]);

  // Revoke object URLs we created ourselves when the preview changes or the
  // page unmounts (URLs borrowed from an existing case are owned by it).
  useEffect(() => {
    return () => {
      if (previewUrl && ownsPreviewUrl.current) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const handleFileSelect = (selected: File) => {
    if (previewUrl && ownsPreviewUrl.current) URL.revokeObjectURL(previewUrl);
    setFile(selected);
    ownsPreviewUrl.current = true;
    setPreviewUrl(URL.createObjectURL(selected));
    setResult(null);
    setError(null);
    setExplainability(null);
  };

  const performReset = () => {
    if (previewUrl && ownsPreviewUrl.current) URL.revokeObjectURL(previewUrl);
    ownsPreviewUrl.current = false;
    setFile(null);
    setPreviewUrl(null);
    setResult(null);
    setError(null);
    setExplainability(null);
  };

  // Uploading a different slide after a result already exists would discard
  // that result, so confirm first instead of silently losing it.
  const handleReset = () => {
    if (result) {
      setShowResetConfirm(true);
    } else {
      performReset();
    }
  };

  const stopPolling = () => {
    if (pollTimer.current) {
      clearInterval(pollTimer.current);
      pollTimer.current = null;
    }
  };

  const loadExplainability = async (jobId: string) => {
    setIsLoadingExplainability(true);
    try {
      const data = await getExplainability(jobId);
      if (!isMounted.current) return;
      setExplainability(data);
      if (caseId) {
        await attachExplainabilityToCase(caseId, {
          heatmapUrl: data.heatmapUrl,
          overlayUrl: data.overlayUrl,
        });
      }
    } catch {
      // Explainability is a secondary, best-effort enhancement — a failure
      // here shouldn't block the primary prediction result from showing.
    } finally {
      if (isMounted.current) setIsLoadingExplainability(false);
    }
  };

  const handlePredict = async () => {
    if (!file) return;
    setIsPredicting(true);
    setError(null);
    setResult(null);
    setExplainability(null);
    setStatusLabel("Submitting job...");

    try {
      const job = await createPredictionJob(file, {
        caseId: caseId ?? undefined,
        generateExplainability: true,
      });
      const startedAt = Date.now();

      pollTimer.current = setInterval(async () => {
        if (!isMounted.current) return;

        if (Date.now() - startedAt > PREDICTION_CONFIG.pollTimeoutMs) {
          stopPolling();
          setError("Analysis is taking longer than expected. Please try again.");
          setIsPredicting(false);
          return;
        }

        try {
          const jobStatus = await getPredictionJobStatus(job.jobId);
          if (!isMounted.current) return;

          if (jobStatus.stage) {
            setStatusLabel(STAGE_LABELS[jobStatus.stage]);
          }

          if (jobStatus.status === "completed") {
            stopPolling();
            const prediction = await getPredictionResult(job.jobId);
            if (!isMounted.current) return;

            setResult(prediction);
            setIsPredicting(false);

            if (caseId) {
              const updatedCase = await getCaseById(caseId);
              if (isMounted.current && updatedCase) setCaseContext(updatedCase);
            }
            if (prediction.explainability.status === "ready") {
              loadExplainability(job.jobId);
            }
          } else if (jobStatus.status === "failed") {
            stopPolling();
            setError(jobStatus.error?.message ?? "Analysis failed. Please try again.");
            setIsPredicting(false);
          }
        } catch {
          stopPolling();
          if (isMounted.current) {
            setError("Something went wrong while analyzing this image. Please try again.");
            setIsPredicting(false);
          }
        }
      }, PREDICTION_CONFIG.pollIntervalMs);
    } catch {
      setError("Something went wrong while submitting this image. Please try again.");
      setIsPredicting(false);
    }
  };

  return (
    <div className="space-y-4">
      {caseId && (
        <div className="flex items-center gap-2 rounded-lg border border-brand-100 bg-brand-50 px-3.5 py-2.5 text-sm text-brand-700">
          <FolderOpen className="h-4 w-4 shrink-0" />
          {caseContext === undefined && !caseContextError && <span>Loading case {caseId}...</span>}
          {caseContextError && <span>{caseContextError}</span>}
          {caseContext === null && !caseContextError && (
            <span>Case {caseId} could not be found. You can still run a standalone analysis.</span>
          )}
          {caseContext && (
            <span>
              Diagnosing <strong>{caseContext.specimenType}</strong> for{" "}
              <strong>{caseContext.patientName}</strong> · Case {caseContext.id}
            </span>
          )}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Upload panel */}
        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="mb-4 flex items-center gap-2">
            <Activity className="h-4 w-4 text-brand-600" />
            <h2 className="text-sm font-semibold text-slate-700">Slide image</h2>
          </div>

          <ImageUploader
            file={file}
            previewUrl={previewUrl}
            onFileSelect={handleFileSelect}
            onReset={handleReset}
            disabled={isPredicting}
          />

          <button
            type="button"
            onClick={handlePredict}
            disabled={!file || isPredicting}
            className="mt-5 w-full rounded-lg bg-brand-600 py-2.5 text-sm font-medium text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
          >
            {isPredicting ? "Analyzing..." : "Predict"}
          </button>
        </section>

        {/* Result panel */}
        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="mb-4 flex items-center gap-2">
            <Microscope className="h-4 w-4 text-brand-600" />
            <h2 className="text-sm font-semibold text-slate-700">AI analysis</h2>
          </div>

          {isPredicting && <LoadingSpinner label={statusLabel} />}

          {!isPredicting && error && (
            <div className="flex items-start gap-2 rounded-lg border border-red-100 bg-red-50 px-3 py-2.5 text-sm text-red-600">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {!isPredicting && !error && result && (
            <div className="space-y-3">
              <PredictionCard result={result} />
              {caseId && caseContext && (
                <Link
                  to={`/cases/${caseContext.id}`}
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-700 hover:text-brand-800 hover:underline"
                >
                  View case details
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              )}
            </div>
          )}

          {!isPredicting && !error && !result && (
            <div className="flex aspect-[4/3] w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-slate-200 text-center">
              <Microscope className="h-8 w-8 text-slate-300" />
              <p className="text-sm text-slate-400">
                Upload a slide and click Predict to see results here
              </p>
            </div>
          )}
        </section>
      </div>

      {!isPredicting && result && result.explainability.status === "ready" && (
        <>
          {isLoadingExplainability && <LoadingSpinner label="Generating explainability heatmap..." />}
          {explainability && previewUrl && (
            <ExplainabilityViewer
              originalImageUrl={previewUrl}
              heatmapUrl={explainability.heatmapUrl}
              overlayUrl={explainability.overlayUrl}
            />
          )}
        </>
      )}

      {showResetConfirm && (
        <ConfirmDialog
          title="Discard this analysis result?"
          message="Uploading a different slide will clear the current prediction and explainability result."
          confirmLabel="Discard result"
          cancelLabel="Keep result"
          variant="danger"
          onConfirm={() => {
            setShowResetConfirm(false);
            performReset();
          }}
          onCancel={() => setShowResetConfirm(false)}
        />
      )}
    </div>
  );
}
