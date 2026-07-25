import type { ReactNode } from 'react';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  isDark?: boolean;
  className?: string;
}

export default function EmptyState({
  icon,
  title,
  description,
  action,
  isDark = false,
  className = '',
}: EmptyStateProps) {
  return (
    <div
      className={`rounded-2xl border py-14 text-center ${
        isDark ? 'border-slate-700 bg-slate-800' : 'border-slate-200 bg-white'
      } ${className}`}
      role="status"
    >
      {icon ? <div className="mx-auto mb-3 flex justify-center text-slate-300 dark:text-slate-600">{icon}</div> : null}
      <p className={`text-sm font-semibold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{title}</p>
      {description ? (
        <p className="mt-2 px-6 text-xs leading-relaxed text-slate-400">{description}</p>
      ) : null}
      {action ? <div className="mt-4 flex justify-center px-6">{action}</div> : null}
    </div>
  );
}
