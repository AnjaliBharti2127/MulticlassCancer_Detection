import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpDown, ChevronLeft, ChevronRight, FileText, Search } from "lucide-react";
import { getReports } from "../services/reportService";
import type { ReportDetail } from "../types/report";
import type { PaginatedResponse, SortDirection } from "../types/pagination";
import LoadingSpinner from "../components/LoadingSpinner";
import ErrorState from "../components/ErrorState";
import { formatDate } from "../utils/formatDate";
import { formatConfidence } from "../utils/formatConfidence";
import { PAGINATION_CONFIG } from "../config/api";

const PAGE_SIZE = PAGINATION_CONFIG.defaultPageSize;
type SortKey = "generatedAt" | "patientName" | "confidence" | "predictedClass";

export default function ReportsList() {
  const [response, setResponse] = useState<PaginatedResponse<ReportDetail> | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("generatedAt");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);

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
    getReports({
      page,
      pageSize: PAGE_SIZE,
      search: debouncedSearch,
      sortBy: sortKey,
      sortDirection,
    })
      .then((data) => {
        if (isMounted) setResponse(data);
      })
      .catch(() => {
        if (isMounted) setError("Could not load reports. Please try again.");
      });
    return () => {
      isMounted = false;
    };
  }, [page, debouncedSearch, sortKey, sortDirection, refreshToken]);

  const toggleSort = (key: SortKey) => {
    setPage(1);
    if (key === sortKey) setSortDirection((value) => (value === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDirection("asc");
    }
  };

  if (error && !response) {
    return <ErrorState message={error} onRetry={() => setRefreshToken((n) => n + 1)} />;
  }

  if (!response) return <LoadingSpinner label="Loading reports..." />;

  const pagination = response.totalPages > 1 && (
    <div className="flex flex-col gap-3 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
      <span>Page {response.page} of {response.totalPages} · {response.total} reports</span>
      <div className="grid grid-cols-2 gap-2 sm:flex">
        <button type="button" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={response.page <= 1} className="flex items-center justify-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 font-medium text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40">
          <ChevronLeft className="h-4 w-4" /> Prev
        </button>
        <button type="button" onClick={() => setPage((p) => Math.min(response.totalPages, p + 1))} disabled={response.page >= response.totalPages} className="flex items-center justify-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 font-medium text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40">
          Next <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input value={searchInput} onChange={(e) => setSearchInput(e.target.value)} placeholder="Search report, case, patient, diagnosis" aria-label="Search reports" className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400" />
        </div>
        <select value={`${sortKey}:${sortDirection}`} onChange={(e) => { const [key, direction] = e.target.value.split(":") as [SortKey, SortDirection]; setSortKey(key); setSortDirection(direction); setPage(1); }} aria-label="Sort reports" className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 focus:border-brand-400 focus:outline-none sm:w-auto">
          <option value="generatedAt:desc">Newest first</option>
          <option value="generatedAt:asc">Oldest first</option>
          <option value="confidence:desc">Highest confidence</option>
          <option value="patientName:asc">Patient A–Z</option>
        </select>
      </div>

      {response.items.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-slate-200 bg-white px-4 py-16 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400"><FileText className="h-6 w-6" /></div>
          <p className="text-sm font-medium text-slate-700">No reports found</p>
          <p className="max-w-sm text-sm text-slate-500">Try another search. Reports appear after a case is completed and signed off.</p>
        </div>
      ) : (
        <>
          <div className="grid gap-3 md:hidden">
            {response.items.map((report) => (
              <Link key={report.id} to={`/reports/${report.id}`} className="rounded-xl border border-slate-200 bg-white p-4 transition hover:border-brand-200 hover:shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div><p className="font-semibold text-brand-700">{report.id}</p><p className="mt-0.5 text-sm text-slate-500">{report.caseId} · {report.patientName}</p></div>
                  <span className="rounded-full bg-brand-50 px-2 py-1 text-xs font-semibold text-brand-700">{formatConfidence(report.confidence)}</span>
                </div>
                <p className="mt-3 text-sm font-medium text-slate-800">{report.predictedClass}</p>
                <div className="mt-3 flex items-center justify-between text-xs text-slate-500"><span>{report.pathologist}</span><span>{formatDate(report.generatedAt)}</span></div>
              </Link>
            ))}
          </div>

          <div className="hidden overflow-x-auto rounded-xl border border-slate-200 bg-white md:block">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead><tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-400">
                {[{key:"generatedAt",label:"Report"},{key:"patientName",label:"Patient"},{key:"predictedClass",label:"Diagnosis"},{key:"confidence",label:"Confidence"}].map((column) => <th key={column.key} className="px-4 py-3 font-medium"><button type="button" onClick={() => toggleSort(column.key as SortKey)} className="flex items-center gap-1 hover:text-slate-600">{column.label}<ArrowUpDown className={`h-3 w-3 ${sortKey === column.key ? "text-brand-600" : "text-slate-300"}`} /></button></th>)}
                <th className="px-4 py-3 font-medium">Case</th><th className="px-4 py-3 font-medium">Pathologist</th><th className="px-4 py-3 font-medium">Generated</th>
              </tr></thead>
              <tbody className="divide-y divide-slate-100">{response.items.map((r) => <tr key={r.id} className="text-slate-700 hover:bg-slate-50/70">
                <td className="whitespace-nowrap px-4 py-3 font-medium"><Link to={`/reports/${r.id}`} className="text-brand-700 hover:underline">{r.id}</Link></td>
                <td className="whitespace-nowrap px-4 py-3">{r.patientName}</td><td className="px-4 py-3">{r.predictedClass}</td><td className="whitespace-nowrap px-4 py-3">{formatConfidence(r.confidence)}</td>
                <td className="whitespace-nowrap px-4 py-3 text-slate-500"><Link to={`/cases/${r.caseId}`} className="hover:underline">{r.caseId}</Link></td><td className="whitespace-nowrap px-4 py-3 text-slate-500">{r.pathologist}</td><td className="whitespace-nowrap px-4 py-3 text-slate-500">{formatDate(r.generatedAt)}</td>
              </tr>)}</tbody>
            </table>
          </div>
          {pagination}
        </>
      )}
    </div>
  );
}
