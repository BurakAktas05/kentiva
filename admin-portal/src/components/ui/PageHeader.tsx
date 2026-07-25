import type { ReactNode } from 'react';

export default function PageHeader({
  eyebrow,
  title,
  subtitle,
  actions,
}: {
  eyebrow?: string;
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="relative flex flex-col gap-5 overflow-hidden rounded-[2rem] border border-slate-200/80 bg-white p-6 shadow-[0_24px_70px_-40px_rgba(15,23,42,.4)] sm:p-7 lg:flex-row lg:items-end lg:justify-between dark:border-slate-800 dark:bg-slate-900">
      <div>
        {eyebrow ? <p className="kentiva-eyebrow">{eyebrow}</p> : null}
        <h2 className="kentiva-page-title">{title}</h2>
        {subtitle ? <p className="kentiva-page-subtitle">{subtitle}</p> : null}
      </div>
      {actions ? <div className="relative flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}
