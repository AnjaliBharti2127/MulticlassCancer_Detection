import { useState } from "react";
import { Eye, Info } from "lucide-react";

interface ExplainabilityViewerProps {
  /** The uploaded/original slide image. */
  originalImageUrl: string;
  /** Grad-CAM style heatmap image, same dimensions as the original. */
  heatmapUrl: string;
  /** Optional pre-blended overlay image, if the backend provides one. */
  overlayUrl?: string;
}

/**
 * Displays the original slide next to its AI attention heatmap, with a
 * slider that blends the heatmap over the original so a reviewer can judge
 * which regions the model focused on. Purely a frontend visualization —
 * the heatmap/overlay URLs are expected to come from the prediction
 * service's explainability step (mocked for now, real Grad-CAM output later).
 */
export default function ExplainabilityViewer({
  originalImageUrl,
  heatmapUrl,
  overlayUrl,
}: ExplainabilityViewerProps) {
  const [opacity, setOpacity] = useState(50);
  const blendImage = overlayUrl ?? heatmapUrl;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="mb-4 flex items-center gap-2">
        <Eye className="h-4 w-4 text-brand-600" />
        <h2 className="text-sm font-semibold text-slate-700">AI explainability</h2>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-slate-400">
            Original slide
          </p>
          <div className="aspect-square w-full overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
            <img
              src={originalImageUrl}
              alt="Original histopathology slide"
              className="h-full w-full object-contain"
            />
          </div>
        </div>
        <div>
          <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-slate-400">
            AI attention heatmap
          </p>
          <div className="aspect-square w-full overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
            <img
              src={heatmapUrl}
              alt="AI attention heatmap"
              className="h-full w-full object-contain"
            />
          </div>
        </div>
      </div>

      <div className="mt-5">
        <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-slate-400">
          Overlay comparison
        </p>
        <div className="relative aspect-square w-full overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
          <img
            src={originalImageUrl}
            alt="Original histopathology slide"
            className="absolute inset-0 h-full w-full object-contain"
          />
          <img
            src={blendImage}
            alt="AI attention overlay blended onto the original slide"
            className="absolute inset-0 h-full w-full object-contain transition-opacity"
            style={{ opacity: opacity / 100 }}
          />
        </div>

        <div className="mt-3 flex items-center gap-3">
          <label htmlFor="overlay-opacity" className="shrink-0 text-xs font-medium text-slate-500">
            Original
          </label>
          <input
            id="overlay-opacity"
            type="range"
            min={0}
            max={100}
            value={opacity}
            onChange={(e) => setOpacity(Number(e.target.value))}
            aria-label="Overlay opacity between original slide and AI attention heatmap"
            className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-slate-200 accent-brand-600"
          />
          <span className="shrink-0 text-xs font-medium text-slate-500">Heatmap</span>
        </div>
      </div>

      <div className="mt-5 flex items-start gap-2 rounded-lg border border-amber-100 bg-amber-50 px-3 py-2.5 text-xs text-amber-700">
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
        <span>
          This visualization highlights regions the model attended to during inference. It does
          not definitively indicate cancerous tissue and must be interpreted by a qualified
          pathologist.
        </span>
      </div>
    </div>
  );
}
