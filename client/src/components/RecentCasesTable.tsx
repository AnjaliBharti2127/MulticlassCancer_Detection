import { Link } from "react-router-dom";
import type { RecentCase } from "../types/dashboard";
import StatusBadge from "./StatusBadge";
import { formatDate } from "../utils/formatDate";
import { formatConfidence } from "../utils/formatConfidence";

interface RecentCasesTableProps {
  cases: RecentCase[];
}

export default function RecentCasesTable({ cases }: RecentCasesTableProps) {
  if (cases.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 py-10 text-center text-sm text-slate-400">
        No cases submitted yet.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-400">
            <th className="px-4 py-3 font-medium">Case</th>
            <th className="px-4 py-3 font-medium">Patient</th>
            <th className="px-4 py-3 font-medium">Predicted class</th>
            <th className="px-4 py-3 font-medium">Confidence</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3 font-medium">Submitted</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {cases.map((c) => (
            <tr key={c.id} className="text-slate-700">
              <td className="whitespace-nowrap px-4 py-3 font-medium">
                <Link
                  to={`/cases/${c.id}`}
                  className="text-brand-700 hover:text-brand-800 hover:underline"
                >
                  {c.id}
                </Link>
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-slate-500">{c.patientId}</td>
              <td className="px-4 py-3">{c.predictedClass}</td>
              <td className="whitespace-nowrap px-4 py-3">
                {c.status === "pending" ? "—" : formatConfidence(c.confidence)}
              </td>
              <td className="whitespace-nowrap px-4 py-3">
                <StatusBadge status={c.status} />
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-slate-500">
                {formatDate(c.submittedAt)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
