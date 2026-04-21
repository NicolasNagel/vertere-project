import { useEffect } from 'react';
import { CheckCircle, XCircle, X } from 'lucide-react';

export interface ToastData {
  id: number;
  type: 'success' | 'error';
  message: string;
}

interface ToastProps {
  toasts: ToastData[];
  dismiss: (id: number) => void;
}

export function ToastContainer({ toasts, dismiss }: ToastProps) {
  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <Toast key={t.id} toast={t} dismiss={dismiss} />
      ))}
    </div>
  );
}

function Toast({ toast, dismiss }: { toast: ToastData; dismiss: (id: number) => void }) {
  useEffect(() => {
    const timer = setTimeout(() => dismiss(toast.id), 4000);
    return () => clearTimeout(timer);
  }, [toast.id, dismiss]);

  const isSuccess = toast.type === 'success';

  return (
    <div
      role="status"
      aria-live="polite"
      className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl shadow-modal border text-sm font-medium
        ${isSuccess
          ? 'bg-white border-emerald-200 text-emerald-800'
          : 'bg-white border-red-200 text-red-800'
        }`}
    >
      {isSuccess
        ? <CheckCircle size={16} className="text-emerald-500 shrink-0" />
        : <XCircle size={16} className="text-red-500 shrink-0" />
      }
      <span>{toast.message}</span>
      <button
        onClick={() => dismiss(toast.id)}
        className="ml-2 text-slate-400 hover:text-slate-600 transition-colors"
        aria-label="Dispensar notificação"
      >
        <X size={14} />
      </button>
    </div>
  );
}
