import type { CaseStatus } from "../types/dashboard";

const STATUS_CONFIG: Record<CaseStatus, { label: string; className: string }> = {
  completed: { label: "Completed", className: "bg-emerald-50 text-emerald-700" },
  pending: { label: "Pending", className: "bg-slate-100 text-slate-600" },
  needs_review: { label: "Needs review", className: "bg-amber-50 text-amber-700" },
};

interface StatusBadgeProps {
  status: CaseStatus;
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status];
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${config.className}`}
    >
      {config.label}
    </span>
  );
}
