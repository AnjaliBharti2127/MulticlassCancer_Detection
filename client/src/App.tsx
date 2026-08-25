import { Routes, Route, Navigate } from "react-router-dom";
import AppLayout from "./layouts/AppLayout";
import Dashboard from "./pages/Dashboard";
import Diagnose from "./pages/Diagnose";
import PatientsList from "./pages/PatientsList";
import CasesList from "./pages/CasesList";
import CreateCase from "./pages/CreateCase";
import CaseDetails from "./pages/CaseDetails";
import ReportsList from "./pages/ReportsList";
import ReportDetails from "./pages/ReportDetails";
import NotFound from "./pages/NotFound";
import { ToastProvider } from "./context/ToastContext";

function App() {
  return (
    <ToastProvider>
      <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />

      <Route element={<AppLayout />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/patients" element={<PatientsList />} />
        <Route path="/cases" element={<CasesList />} />
        <Route path="/cases/new" element={<CreateCase />} />
        <Route path="/cases/:id" element={<CaseDetails />} />
        <Route path="/diagnose" element={<Diagnose />} />
        <Route path="/reports" element={<ReportsList />} />
        <Route path="/reports/:id" element={<ReportDetails />} />
      </Route>

      <Route path="*" element={<NotFound />} />
      </Routes>
    </ToastProvider>
  );
}

export default App;
