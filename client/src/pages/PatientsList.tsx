import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpDown, ChevronLeft, ChevronRight, Search, UserPlus } from "lucide-react";
import { getPatients } from "../services/patientService";
import type { Patient } from "../types/patient";
import type { PaginatedResponse, SortDirection } from "../types/pagination";
import LoadingSpinner from "../components/LoadingSpinner";
import ErrorState from "../components/ErrorState";
import PatientFormModal from "../components/PatientFormModal";
import { formatDate } from "../utils/formatDate";
import { useToast } from "../context/ToastContext";
import { PAGINATION_CONFIG } from "../config/api";

type SortKey = "id" | "name" | "totalCases" | "lastVisit";

const COLUMNS: { key: SortKey; label: string }[] = [
  { key: "id", label: "Patient ID" },
  { key: "name", label: "Name" },
  { key: "totalCases", label: "Total cases" },
  { key: "lastVisit", label: "Last visit" },
];

const PAGE_SIZE = PAGINATION_CONFIG.defaultPageSize;

export default function PatientsList() {
  const [response, setResponse] = useState<PaginatedResponse<Patient> | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("lastVisit");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [page, setPage] = useState(1);
  const [isAddPatientOpen, setIsAddPatientOpen] = useState(false);
  const [refreshToken, setRefreshToken] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const { showToast } = useToast();

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
    getPatients({
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
        if (isMounted) setError("Could not load patients. Please try again.");
      });
    return () => {
      isMounted = false;
    };
  }, [page, debouncedSearch, sortKey, sortDirection, refreshToken]);

  const handlePatientCreated = (patient: Patient) => {
    setIsAddPatientOpen(false);
    showToast(`${patient.name} (${patient.id}) was added successfully.`, "success");
    setPage(1);
    setSortKey("lastVisit");
    setSortDirection("desc");
    setRefreshToken((n) => n + 1);
  };

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
    return <LoadingSpinner label="Loading patients..." />;
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
            placeholder="Search by patient name or ID"
            aria-label="Search patients"
            className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
          />
        </div>

        <button
          type="button"
          onClick={() => setIsAddPatientOpen(true)}
          className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-brand-600 px-3.5 py-2 text-sm font-medium text-white transition hover:bg-brand-700"
        >
          <UserPlus className="h-4 w-4" />
          Add patient
        </button>
      </div>

      {response.items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-white py-10 text-center text-sm text-slate-400">
          No patients match your search.
        </div>
      ) : (
        <>
          <div className="grid gap-3 md:hidden">
            {response.items.map((patient) => (
              <div key={patient.id} className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div><p className="font-semibold text-slate-800">{patient.name}</p><p className="mt-0.5 text-xs text-slate-500">{patient.id}</p></div>
                  <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">{patient.totalCases} cases</span>
                </div>
                <div className="mt-4 flex items-center justify-between text-sm"><span className="text-slate-500">Last visit {formatDate(patient.lastVisit)}</span><Link to={`/cases?q=${encodeURIComponent(patient.id)}`} className="font-medium text-brand-700">View cases</Link></div>
              </div>
            ))}
          </div>

          <div className="hidden overflow-x-auto rounded-xl border border-slate-200 bg-white md:block">
            <table className="w-full min-w-[560px] text-left text-sm">
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
                  <th className="px-4 py-3 font-medium">Cases</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {response.items.map((p) => (
                  <tr key={p.id} className="text-slate-700">
                    <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-800">
                      {p.id}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">{p.name}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-500">{p.totalCases}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-500">
                      {formatDate(p.lastVisit)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <Link
                        to={`/cases?q=${encodeURIComponent(p.id)}`}
                        className="text-brand-700 hover:text-brand-800 hover:underline"
                      >
                        View cases
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {response.totalPages > 1 && (
            <div className="flex flex-col gap-3 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
              <span>
                Page {response.page} of {response.totalPages} · {response.total} patients
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

      {isAddPatientOpen && (
        <PatientFormModal
          onClose={() => setIsAddPatientOpen(false)}
          onCreated={handlePatientCreated}
        />
      )}
    </div>
  );
}
