import { Lang } from '../i18n';

const STYLES: Record<string, string> = {
  CRITICAL: 'bg-red-500/15 text-red-700 dark:text-red-300',
  HIGH: 'bg-orange-500/15 text-orange-800 dark:text-orange-200',
  MEDIUM: 'bg-amber-500/15 text-amber-800 dark:text-amber-200',
  LOW: 'bg-slate-500/15 text-slate-700 dark:text-slate-300',
};

const LABELS: Record<string, { tr: string; en: string; ar: string }> = {
  CRITICAL: { tr: 'Kritik', en: 'Critical', ar: 'حرج' },
  HIGH: { tr: 'Yüksek', en: 'High', ar: 'عالي' },
  MEDIUM: { tr: 'Orta', en: 'Medium', ar: 'متوسط' },
  LOW: { tr: 'Düşük', en: 'Low', ar: 'منخفض' },
};

export default function AiPriorityBadge({ priority, lang }: { priority: string; lang: Lang }) {
  const key = priority.toUpperCase();
  const labels = LABELS[key];
  const label = labels ? labels[lang] ?? labels.en : priority;
  const style = STYLES[key] ?? STYLES.LOW;

  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${style}`}>
      {label}
    </span>
  );
}
