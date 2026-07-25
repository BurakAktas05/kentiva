interface LoadingStateProps {
  label?: string;
  isDark?: boolean;
  className?: string;
  rows?: number;
}

export default function LoadingState({
  label,
  isDark = false,
  className = '',
  rows = 3,
}: LoadingStateProps) {
  return (
    <div className={`space-y-2 ${className}`} role="status" aria-live="polite" aria-busy="true">
      {label ? (
        <p className={`mb-3 text-center text-xs font-semibold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
          {label}
        </p>
      ) : null}
      {Array.from({ length: rows }, (_, i) => (
        <div
          key={i}
          className={`h-20 animate-pulse rounded-2xl border ${
            isDark ? 'border-slate-700 bg-slate-800' : 'border-slate-200 bg-white'
          }`}
        />
      ))}
    </div>
  );
}
