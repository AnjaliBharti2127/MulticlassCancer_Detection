/**
 * Confidence values are stored by the backend as unit probabilities (0..1).
 * Convert to a percentage only at the UI boundary.
 */
export function confidenceToPercent(value: number | null | undefined): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  return value * 100;
}

export function formatConfidence(value: number | null | undefined, digits = 1): string {
  return `${confidenceToPercent(value).toFixed(digits)}%`;
}
