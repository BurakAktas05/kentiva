import { motion } from 'framer-motion';
import { CheckCircle2, AlertCircle, X } from 'lucide-react';

export type ToastState = { type: 'success' | 'error'; message: string } | null;

export default function ToastBanner({
  toast,
  onDismiss,
}: {
  toast: ToastState;
  onDismiss: () => void;
}) {
  if (!toast) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      role="status"
      className={`fixed bottom-6 right-6 z-50 flex max-w-md items-start gap-2 rounded-xl border px-4 py-3 text-sm font-medium shadow-lg ${
        toast.type === 'success'
          ? 'border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/90 dark:text-emerald-100'
          : 'border-red-200 bg-red-50 text-red-900 dark:border-red-800 dark:bg-red-950/90 dark:text-red-100'
      }`}
    >
      {toast.type === 'success' ? (
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
      ) : (
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
      )}
      <span>{toast.message}</span>
      <button type="button" onClick={onDismiss} className="ml-2 opacity-60 hover:opacity-100" aria-label="Kapat">
        <X className="h-4 w-4" />
      </button>
    </motion.div>
  );
}
