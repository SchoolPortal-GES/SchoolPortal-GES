import { useEffect, useState, type ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

export function Spinner({ className = '' }: { className?: string }) {
  return <Loader2 className={`animate-spin ${className}`} size={20} />;
}

export function Button({
  children,
  variant = 'primary',
  loading = false,
  className = '',
  ...props
}: {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'danger';
  loading?: boolean;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const cls = variant === 'danger' ? 'btn-danger' : variant === 'secondary' ? 'btn-secondary' : 'btn-primary';
  return (
    <button className={`${cls} ${className}`} disabled={loading || props.disabled} {...props}>
      {loading && <Spinner className="h-4 w-4" />}
      {children}
    </button>
  );
}

export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
      {hint && <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{hint}</p>}
    </div>
  );
}

export function Alert({
  type = 'info',
  children,
}: {
  type?: 'info' | 'success' | 'error' | 'warning';
  children: ReactNode;
}) {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    setVisible(true);
    const timer = setTimeout(() => setVisible(false), 5000);
    return () => clearTimeout(timer);
  }, [type, children]);
  if (!visible) return null;
  const styles: Record<string, string> = {
    info: 'bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-950/40 dark:text-blue-200 dark:border-blue-900',
    success: 'bg-green-50 text-green-800 border-green-200 dark:bg-green-950/40 dark:text-green-200 dark:border-green-900',
    error: 'bg-red-50 text-red-800 border-red-200 dark:bg-red-950/40 dark:text-red-200 dark:border-red-900',
    warning: 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-200 dark:border-amber-900',
  };
  return <div className={`rounded-lg border px-4 py-3 text-sm ${styles[type]} animate-slide-down`}>{children}</div>;
}

export function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4 animate-fade-in">
      <div
        className="w-full max-w-lg rounded-t-2xl bg-white p-5 shadow-xl dark:bg-gray-900 sm:rounded-2xl"
        role="dialog"
        aria-modal="true"
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
            aria-label="Close"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function EmptyState({ title, message }: { title: string; message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 px-6 py-12 text-center dark:border-gray-700">
      <p className="font-medium text-gray-700 dark:text-gray-300">{title}</p>
      {message && <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{message}</p>}
    </div>
  );
}
