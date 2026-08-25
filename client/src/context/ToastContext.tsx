import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import { CheckCircle2, CircleAlert, Info, X } from "lucide-react";

type ToastVariant = "success" | "error" | "info";

interface ToastItem {
  id: number;
  message: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  showToast: (message: string, variant?: ToastVariant) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const variantStyles: Record<ToastVariant, string> = {
  success: "border-emerald-200 bg-white text-emerald-800",
  error: "border-red-200 bg-white text-red-800",
  info: "border-sky-200 bg-white text-sky-800",
};

const variantIcons = {
  success: CheckCircle2,
  error: CircleAlert,
  info: Info,
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, variant: ToastVariant = "info") => {
      const id = nextId.current++;
      setToasts((current) => [...current, { id, message, variant }]);
      window.setTimeout(() => dismiss(id), 4200);
    },
    [dismiss]
  );

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="pointer-events-none fixed inset-x-3 bottom-3 z-[80] flex flex-col items-end gap-2 sm:inset-x-auto sm:bottom-5 sm:right-5 sm:w-[360px]"
      >
        {toasts.map((toast) => {
          const Icon = variantIcons[toast.variant];
          return (
            <div
              key={toast.id}
              role={toast.variant === "error" ? "alert" : "status"}
              className={`pointer-events-auto flex w-full items-start gap-3 rounded-xl border px-4 py-3 text-sm shadow-lg shadow-slate-900/10 ${variantStyles[toast.variant]}`}
            >
              <Icon className="mt-0.5 h-4.5 w-4.5 shrink-0" />
              <p className="min-w-0 flex-1 leading-5">{toast.message}</p>
              <button
                type="button"
                onClick={() => dismiss(toast.id)}
                aria-label="Dismiss notification"
                className="rounded-md p-0.5 opacity-60 hover:bg-slate-100 hover:opacity-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used inside ToastProvider");
  return context;
}
