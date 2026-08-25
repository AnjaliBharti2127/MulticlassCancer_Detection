import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  tone?: "default" | "warning";
}

export default function StatCard({ label, value, icon: Icon, tone = "default" }: StatCardProps) {
  const iconStyles =
    tone === "warning" ? "bg-amber-50 text-amber-600" : "bg-brand-50 text-brand-600";

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{label}</p>
        <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${iconStyles}`}>
          <Icon className="h-4.5 w-4.5" />
        </div>
      </div>
      <p className="mt-3 text-2xl font-semibold text-slate-800">{value}</p>
    </div>
  );
}
