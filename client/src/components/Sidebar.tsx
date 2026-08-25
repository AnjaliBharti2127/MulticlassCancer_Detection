import { NavLink } from "react-router-dom";
import { LayoutDashboard, Microscope, Activity, ClipboardList, Users, FileText, X } from "lucide-react";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const navItems = [
  { label: "Dashboard", to: "/dashboard", icon: LayoutDashboard },
  { label: "Patients", to: "/patients", icon: Users },
  { label: "Cases", to: "/cases", icon: ClipboardList },
  { label: "Diagnose", to: "/diagnose", icon: Microscope },
  { label: "Reports", to: "/reports", icon: FileText },
];

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  return (
    <aside
      aria-label="Main navigation"
      className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-slate-200 bg-white transition-transform duration-200 ease-in-out print:hidden lg:static lg:translate-x-0 ${
        isOpen ? "translate-x-0" : "-translate-x-full"
      }`}
    >
      <div className="flex items-center gap-3 border-b border-slate-200 px-5 py-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-white">
          <Activity className="h-4.5 w-4.5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-800">Patho</p>
          <p className="text-xs text-slate-400">Pathology Copilot</p>
        </div>
        <button type="button" onClick={onClose} aria-label="Close navigation menu" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 lg:hidden">
          <X className="h-4.5 w-4.5" />
        </button>
      </div>

      <nav aria-label="Primary" className="flex-1 space-y-1 px-3 py-4">
        {navItems.map(({ label, to, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-brand-50 text-brand-700"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-800"
              }`
            }
          >
            <Icon className="h-4.5 w-4.5 shrink-0" aria-hidden="true" />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-slate-200 px-6 py-4">
        <p className="text-xs text-slate-400">Patho v0.1 · Research build</p>
      </div>
    </aside>
  );
}
