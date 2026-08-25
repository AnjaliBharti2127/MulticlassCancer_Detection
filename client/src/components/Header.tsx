import { Menu } from "lucide-react";

interface HeaderProps {
  title: string;
  subtitle?: string;
  onMenuClick: () => void;
}

export default function Header({ title, subtitle, onMenuClick }: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur print:hidden sm:px-6 sm:py-4">
      <button
        type="button"
        onClick={onMenuClick}
        aria-label="Open navigation menu"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 lg:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      <div className="min-w-0">
        <h1 className="truncate text-base font-semibold text-slate-800 sm:text-lg">{title}</h1>
        {subtitle && <p className="truncate text-sm text-slate-500">{subtitle}</p>}
      </div>
    </header>
  );
}
