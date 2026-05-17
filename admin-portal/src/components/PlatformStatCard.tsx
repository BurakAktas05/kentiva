import type { LucideIcon } from 'lucide-react';

type Props = {
  name: string;
  value: number;
  sub?: string;
  icon: LucideIcon;
  iconWrap: string;
};

/** Belediye dashboard ile aynı kart stili (süper admin + platform). */
export default function PlatformStatCard({ name, value, sub, icon: Icon, iconWrap }: Props) {
  return (
    <div className="group rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm transition-all hover:border-primary/20 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-primary/25">
      <div className={`mb-4 flex h-11 w-11 items-center justify-center rounded-xl ring-1 ${iconWrap}`}>
        <Icon size={22} strokeWidth={2} />
      </div>
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{name}</p>
      <p className="mt-1 text-2xl font-extrabold tabular-nums text-slate-900 dark:text-white">{value}</p>
      {sub ? <p className="mt-0.5 text-xs text-slate-500">{sub}</p> : null}
    </div>
  );
}
