import type { ReactNode } from 'react';

export function StatCard({
  icon,
  label,
  value,
  suffix = '',
}: {
  icon: ReactNode;
  label: string;
  value: number | string;
  suffix?: string;
}) {
  return (
    <div className="group rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/20 hover:shadow-lg hover:shadow-primary/5">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/8 ring-1 ring-primary/10 transition-colors group-hover:bg-primary/12">
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
          <div className="mt-1 text-2xl font-extrabold tabular-nums tracking-tight text-slate-900">
            {value === '-' ? (
              <span className="inline-block h-8 w-14 animate-pulse rounded-lg bg-slate-200" aria-hidden />
            ) : (
              <>
                {value}
                {suffix}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
