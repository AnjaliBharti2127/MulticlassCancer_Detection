import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowUpDown, ChevronLeft, ChevronRight, Search, Plus } from "lucide-react";
import { getCases } from "../services/caseService";
import type { CaseDetail } from "../types/case";
import type { CaseStatus } from "../types/dashboard";
import type { PaginatedResponse, SortDirection } from "../types/pagination";
import StatusBadge from "../components/StatusBadge";
import LoadingSpinner from "../components/LoadingSpinner";
import ErrorState from "../components/ErrorState";
import { formatDate } from "../utils/formatDate";
import { formatConfidence } from "../utils/formatConfidence";
import { PAGINATION_CONFIG } from "../config/api";

type SortKey = "id" | "patientName" | "predictedClass" | "confidence" | "submittedAt";
type StatusFilter = CaseStatus | "all";

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All statuses" },
  { value: "completed", label: "Completed" },
  { value: "pending", label: "Pending" },
  { value: "needs_review", label: "Needs review" },
];

const COLUMNS: { key: SortKey; label: string }[] = [
  { key: "id", label: "Case" },
  { key: "patientName", label: "Patient" },
  { key: "predictedClass", label: "Predicted class" },
  { key: "confidence", label: "Confidence" },
  { key: "submittedAt", label: "Submitted" },
];

const PAGE_SIZE = PAGINATION_CONFIG.defaultPageSize;

export default function CasesList() {
  const [searchParams] = useSearchParams();
  const [response, setResponse] = useState<PaginatedResponse<CaseDetail> | null>(null);
  const [searchInput, setSearchInput] = useState(searchParams.get("q") ?? "");
  const [debouncedSearch, setDebouncedSearch] = useState(searchParams.get("q") ?? "");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("submittedAt");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);

  // Keep search state in sync with the ?q= param (e.g. deep links from Patients).
  useEffect(() => {
    const q = searchParams.get("q") ?? "";
    setSearchInput(q);
    setDebouncedSearch(q);
    setPage(1);
  }, [searchParams]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    let isMounted = true;
    setError(null);
    getCases({
      page,
      pageSize: PAGE_SIZE,
      search: debouncedSearch,
      status: statusFilter === "all" ? undefined : statusFilter,
      sortBy: sortKey,
      sortDirection,
    })
      .then((data) => {
        if (isMounted) setResponse(data);
      })
      .catch(() => {
        if (isMounted) setError("Could not load cases. Please try again.");
      });
    return () => {
      isMounted = false;
    };
  }, [page, debouncedSearch, statusFilter, sortKey, sortDirection, refreshToken]);

  const toggleSort = (key: SortKey) => {
    setPage(1);
    if (key === sortKey) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDirection("asc");
    }
  };

  if (error && !response) {
    return <ErrorState message={error} onRetry={() => setRefreshToken((n) => n + 1)} />;
  }

  if (!response) {
    return <LoadingSpinner label="Loading cases..." />;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by case, patient, or class"
            aria-label="Search cases"
            className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
          />
        </div>

        <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 sm:flex">
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as StatusFilter);
              setPage(1);
            }}
            aria-label="Filter by status"
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400 sm:w-auto"
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <Link
            to="/cases/new"
            className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg bg-brand-600 px-3.5 py-2 text-sm font-medium text-white transition hover:bg-brand-700"
          >
            <Plus className="h-4 w-4" />
            New case
          </Link>
        </div>
      </div>

      {response.items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-white py-10 text-center text-sm text-slate-400">
          No cases match your search or filter.
        </div>
      ) : (
        <>
          <div className="grid gap-3 md:hidden">
            {response.items.map((caseItem) => (
              <Link key={caseItem.id} to={`/cases/${caseItem.id}`} className="rounded-xl border border-slate-200 bg-white p-4 transition hover:border-brand-200">
                <div className="flex items-start justify-between gap-3"><div><p className="font-semibold text-brand-700">{caseItem.id}</p><p className="mt-0.5 text-sm text-slate-500">{caseItem.patientName}</p></div><StatusBadge status={caseItem.status} /></div>
                <p className="mt-3 text-sm font-medium text-slate-800">{caseItem.predictedClass}</p>
                <div className="mt-3 flex items-center justify-between text-xs text-slate-500"><span>{formatDate(caseItem.submittedAt)}</span><span>{caseItem.status === "pending" ? "Awaiting result" : `${formatConfidence(caseItem.confidence)} confidence`}</span></div>
              </Link>
            ))}
          </div>

          <div className="hidden overflow-x-auto rounded-xl border border-slate-200 bg-white md:block">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-400">
                  {COLUMNS.map((column) => (
                    <th
                      key={column.key}
                      className="px-4 py-3 font-medium"
                      aria-sort={
                        sortKey === column.key
                          ? sortDirection === "asc"
                            ? "ascending"
                            : "descending"
                          : "none"
                      }
                    >
                      <button
                        type="button"
                        onClick={() => toggleSort(column.key)}
                        className="flex items-center gap-1 hover:text-slate-600"
                      >
                        {column.label}
                        <ArrowUpDown
                          className={`h-3 w-3 ${
                            sortKey === column.key ? "text-brand-600" : "text-slate-300"
                          }`}
                        />
                      </button>
                    </th>
                  ))}
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {response.items.map((c) => (
                  <tr key={c.id} className="text-slate-700">
                    <td className="whitespace-nowrap px-4 py-3 font-medium">
                      <Link
                        to={`/cases/${c.id}`}
                        className="text-brand-700 hover:text-brand-800 hover:underline"
                      >
                        {c.id}
                      </Link>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-500">
                      {c.patientName}
                    </td>
                    <td className="px-4 py-3">{c.predictedClass}</td>
                    <td className="whitespace-nowrap px-4 py-3">
                      {c.status === "pending" ? "—" : formatConfidence(c.confidence)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-500">
                      {formatDate(c.submittedAt)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <StatusBadge status={c.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {response.totalPages > 1 && (
            <div className="flex flex-col gap-3 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
              <span>
                Page {response.page} of {response.totalPages} · {response.total} cases
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={response.page <= 1}
                  className="flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 font-medium text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronLeft className="h-4 w-4" /> Prev
                </button>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(response.totalPages, p + 1))}
                  disabled={response.page >= response.totalPages}
                  className="flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 font-medium text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
