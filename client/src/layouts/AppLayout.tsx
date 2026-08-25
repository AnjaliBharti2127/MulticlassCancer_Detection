import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";

const pageMeta: Record<string, { title: string; subtitle?: string }> = {
  "/dashboard": {
    title: "Dashboard",
    subtitle: "Overview of case activity and model performance",
  },
  "/patients": {
    title: "Patients",
    subtitle: "Search patients and review their case history",
  },
  "/cases": {
    title: "Cases",
    subtitle: "Search and review all submitted cases",
  },
  "/cases/new": {
    title: "New case",
    subtitle: "Select a patient and upload a slide to start a case",
  },
  "/diagnose": {
    title: "Diagnose",
    subtitle: "Upload a slide for AI-assisted analysis",
  },
  "/reports": {
    title: "Reports",
    subtitle: "Finalized diagnostic reports",
  },
};

export default function AppLayout() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();
  const meta =
    pageMeta[location.pathname] ??
    (location.pathname.startsWith("/cases/")
      ? { title: "Case details", subtitle: "Patient and analysis record" }
      : location.pathname.startsWith("/reports/")
        ? { title: "Report", subtitle: "Finalized diagnostic report" }
        : { title: "Patho" });

  return (
    <div className="flex min-h-screen overflow-x-hidden bg-slate-50">
      {isMobileMenuOpen && (
        <button
          type="button"
          aria-label="Close navigation menu"
          onClick={() => setIsMobileMenuOpen(false)}
          className="fixed inset-0 z-40 bg-slate-900/40 lg:hidden"
        />
      )}

      <Sidebar isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />

      <div className="flex min-h-screen min-w-0 flex-1 flex-col lg:pl-0">
        <Header
          title={meta.title}
          subtitle={meta.subtitle}
          onMenuClick={() => setIsMobileMenuOpen(true)}
        />
        <main className="min-w-0 flex-1 px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
