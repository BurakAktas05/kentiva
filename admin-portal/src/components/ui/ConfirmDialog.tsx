import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import Button from './Button';

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Onayla',
  cancelLabel = 'İptal',
  busy = false,
  tone = 'primary',
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  busy?: boolean;
  tone?: 'primary' | 'danger';
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const cancelButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    cancelButtonRef.current?.focus();
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) {
        e.stopPropagation();
        onCancel();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, busy]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="kentiva-confirm-title"
    >
      <div className="w-full max-w-md rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xl dark:border-slate-700 dark:bg-slate-900">
        <div className="mb-4 flex items-start justify-between gap-3">
          <h3 id="kentiva-confirm-title" className="text-lg font-bold text-slate-900 dark:text-white">
            {title}
          </h3>
          <button
            type="button"
            disabled={busy}
            onClick={onCancel}
            className="rounded-lg p-1 text-slate-500 hover:bg-slate-100 disabled:opacity-50 dark:hover:bg-slate-800"
            aria-label="Kapat"
          >
            <X size={20} />
          </button>
        </div>
        <p className="mb-6 text-sm text-slate-600 dark:text-slate-400">{message}</p>
        <div className="flex gap-3">
          <Button ref={cancelButtonRef} variant="secondary" className="flex-1" disabled={busy} onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button
            variant="primary"
            className={`flex-1 ${tone === 'danger' ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/15' : ''}`}
            disabled={busy}
            onClick={onConfirm}
          >
            {busy ? 'İşleniyor…' : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
