import type { ReactNode } from 'react';
import { AlertCircle } from 'lucide-react';
import Button from './Button';

interface ErrorStateProps {
  title: string;
  description?: string;
  onRetry?: () => void;
  retryLabel?: string;
  isDark?: boolean;
  className?: string;
  action?: ReactNode;
}

export default function ErrorState({
  title,
  description,
  onRetry,
  retryLabel = 'Retry',
  isDark = false,
  className = '',
  action,
}: ErrorStateProps) {
  return (
    <div
      className={`rounded-2xl border py-10 px-4 text-center ${
        isDark ? 'border-red-900/40 bg-red-950/30' : 'border-red-100 bg-red-50'
      } ${className}`}
      role="alert"
    >
      <AlertCircle
        className={`mx-auto mb-3 h-10 w-10 ${isDark ? 'text-red-400' : 'text-red-500'}`}
        aria-hidden
      />
      <p className={`text-sm font-semibold ${isDark ? 'text-red-200' : 'text-red-700'}`}>{title}</p>
      {description ? (
        <p className={`mt-2 px-2 text-xs leading-relaxed ${isDark ? 'text-red-300/80' : 'text-red-600/90'}`}>
          {description}
        </p>
      ) : null}
      {(action || onRetry) && (
        <div className="mt-4 flex justify-center">
          {action ?? (
            <Button
              type="button"
              variant="secondary"
              onClick={onRetry}
              className="max-w-xs flex-none px-6"
            >
              {retryLabel}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
