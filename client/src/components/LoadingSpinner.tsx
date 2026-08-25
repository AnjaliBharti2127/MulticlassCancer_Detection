interface LoadingSpinnerProps {
  label?: string;
}

export default function LoadingSpinner({ label = "Loading..." }: LoadingSpinnerProps) {
  return (
    <output aria-live="polite" className="flex flex-col items-center justify-center gap-3 py-10">
      <div className="h-9 w-9 rounded-full border-4 border-brand-100 border-t-brand-500 animate-spin" aria-hidden="true" />
      <p className="text-sm text-slate-500">{label}</p>
    </output>
  );
}
