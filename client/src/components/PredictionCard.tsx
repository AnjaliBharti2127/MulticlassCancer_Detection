import { CheckCircle2, ShieldAlert } from "lucide-react";
import type { PredictionResult } from "../types/prediction";

interface PredictionCardProps {
  result: PredictionResult;
}

const TOP_OTHER_PREDICTIONS = 3;

export default function PredictionCard({ result }: PredictionCardProps) {
  const modelName = result.model?.name;
  const modelVersion = result.model?.version;
  const predictedClass = result.predictedClass ?? "Unknown";
  const confidence = result.confidence ?? 0;
  const probabilities = result.probabilities ?? [];

  // "Other possibilities" excludes the predicted class itself and shows the
  // top 3 remaining classes by probability, descending.
  const otherPredictions = [...probabilities]
    .filter((p) => p.className !== predictedClass)
    .sort((a, b) => b.probability - a.probability)
    .slice(0, TOP_OTHER_PREDICTIONS);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      {(modelName || modelVersion) && (
        <p className="mb-3 text-xs font-medium uppercase tracking-wide text-slate-400">
          {modelName && modelVersion
            ? `${modelName} · ${modelVersion}`
            : modelName ?? modelVersion}
        </p>
      )}

      <div className="flex items-center gap-3 rounded-lg bg-brand-50 px-4 py-4">
        <CheckCircle2 className="h-8 w-8 shrink-0 text-brand-600" />
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-brand-700">
            Predicted class
          </p>
          <p className="truncate text-xl font-bold text-slate-800">{predictedClass}</p>
        </div>
        <div className="ml-auto shrink-0 text-right">
          <p className="text-2xl font-bold text-brand-600">{(confidence * 100).toFixed(2)}%</p>
          <p className="text-xs text-slate-500">Confidence</p>
        </div>
      </div>

      {otherPredictions.length > 0 && (
        <div className="mt-5">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">
            Other possibilities
          </p>
          <div className="divide-y divide-slate-100">
            {otherPredictions.map((prediction) => (
              <div
                key={prediction.className}
                className="flex items-center justify-between py-2 text-sm"
              >
                <span className="text-slate-600">{prediction.className}</span>
                <span className="font-medium text-slate-700">
                  {(prediction.probability * 100).toFixed(2)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-5 flex items-start gap-2 rounded-lg border border-amber-100 bg-amber-50 px-3 py-2.5 text-xs text-amber-700">
        <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
        <span>For research and educational use only. Not a medical diagnosis.</span>
      </div>
    </div>
  );
}