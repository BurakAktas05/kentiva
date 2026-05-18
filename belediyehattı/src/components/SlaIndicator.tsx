import { Clock } from 'lucide-react';
import { Lang } from '../i18n';

function hoursSince(iso: string): number {
  const ms = Date.now() - new Date(iso).getTime();
  return Math.max(0, ms / (1000 * 60 * 60));
}

function formatHours(h: number, lang: Lang): string {
  if (h < 1) {
    return lang === 'tr' ? '<1 sa' : lang === 'ar' ? '<1 س' : '<1h';
  }
  if (h < 24) {
    return lang === 'tr' ? `${Math.round(h)} sa` : lang === 'ar' ? `${Math.round(h)} س` : `${Math.round(h)}h`;
  }
  const d = Math.floor(h / 24);
  return lang === 'tr' ? `${d} gün` : lang === 'ar' ? `${d} ي` : `${d}d`;
}

export default function SlaIndicator({
  createdAt,
  aiSlaRisk,
  lang,
  compact,
}: {
  createdAt: string;
  aiSlaRisk?: string | null;
  lang: Lang;
  compact?: boolean;
}) {
  const hours = hoursSince(createdAt);
  const risk = (aiSlaRisk || '').toUpperCase();
  const urgent = risk === 'HIGH' || risk === 'CRITICAL' || hours >= 48;
  const warn = !urgent && (risk === 'MEDIUM' || hours >= 24);

  const tone = urgent
    ? 'bg-red-500/15 text-red-700 dark:text-red-300 ring-red-500/25'
    : warn
      ? 'bg-amber-500/15 text-amber-800 dark:text-amber-200 ring-amber-500/25'
      : 'bg-slate-500/10 text-slate-600 dark:text-slate-400 ring-slate-400/20';

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-lg font-bold ring-1 ${tone} ${
        compact ? 'px-1.5 py-0.5 text-[9px]' : 'px-2 py-1 text-[10px]'
      }`}
      title={lang === 'tr' ? 'İhbar süresi' : 'Report age'}
    >
      <Clock className={compact ? 'h-3 w-3' : 'h-3.5 w-3.5'} />
      {formatHours(hours, lang)}
      {risk && !compact && <span className="opacity-70">· SLA {risk}</span>}
    </span>
  );
}
