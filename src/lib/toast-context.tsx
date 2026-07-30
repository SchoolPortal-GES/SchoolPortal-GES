import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: number;
  type: ToastType;
  message: string;
}

interface ToastContextValue {
  notify: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

let toastIdCounter = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const notify = useCallback((message: string, type: ToastType = 'info') => {
    const id = ++toastIdCounter;
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => dismiss(id), 5000);
  }, [dismiss]);

  const icons: Record<ToastType, ReactNode> = {
    success: <CheckCircle2 size={18} className="text-green-500" />,
    error: <AlertCircle size={18} className="text-red-500" />,
    info: <Info size={18} className="text-blue-500" />,
    warning: <AlertTriangle size={18} className="text-amber-500" />,
  };

  const borders: Record<ToastType, string> = {
    success: 'border-l-green-500',
    error: 'border-l-red-500',
    info: 'border-l-blue-500',
    warning: 'border-l-amber-500',
  };

  return (
    <ToastContext.Provider value={{ notify }}>
      {children}
      <div className="fixed right-4 top-4 z-[100] flex flex-col gap-2 sm:right-6 sm:top-6" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`flex items-center gap-3 rounded-lg border border-l-4 ${borders[t.type]} bg-white px-4 py-3 shadow-lg dark:bg-gray-900 dark:border-gray-700 animate-slide-down min-w-[260px] max-w-[360px]`}
          >
            {icons[t.type]}
            <span className="flex-1 text-sm text-gray-700 dark:text-gray-200">{t.message}</span>
            <button onClick={() => dismiss(t.id)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200" aria-label="Dismiss">
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
