import type { ReactNode } from 'react';

export default function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="kentiva-empty">
      <p className="text-base font-bold text-slate-800 dark:text-slate-200">{title}</p>
      {description ? <p className="mt-2 text-sm font-medium text-slate-500 dark:text-slate-400">{description}</p> : null}
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  );
}
