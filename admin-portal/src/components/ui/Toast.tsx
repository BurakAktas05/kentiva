import { AlertCircle, CheckCircle2, X } from 'lucide-react';

export type ToastState = { type: 'success' | 'error'; message: string } | null;

/** Lightweight toast aligned with ToastBanner / kentiva alert tokens. */
export default function Toast({
  toast,
  onDismiss,
}: {
  toast: ToastState;
  onDismiss: () => void;
}) {
  if (!toast) return null;

  const isSuccess = toast.type === 'success';

  return (
    <div
      role="status"
      className={`fixed right-6 top-20 z-50 flex max-w-md items-start gap-2 rounded-xl border px-4 py-3 text-sm font-semibold shadow-lg ${
        isSuccess
          ? 'border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-100'
          : 'border-red-200 bg-red-50 text-red-900 dark:border-red-800 dark:bg-red-950/80 dark:text-red-100'
      }`}
    >
      {isSuccess ? (
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
      ) : (
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
      )}
      <span>{toast.message}</span>
      <button type="button" onClick={onDismiss} className="ml-2 opacity-60 hover:opacity-100" aria-label="Kapat">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
