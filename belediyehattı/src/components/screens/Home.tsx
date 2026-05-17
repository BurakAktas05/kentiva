import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  MapPin,
  Clock,
  AlertCircle,
  Trash2,
  HardHat,
  Lightbulb,
  TreePine,
  Construction,
  Sparkles,
} from 'lucide-react';
import {
  getMyReports,
  ApiReportList,
  fetchPublicStatsOverview,
  type PublicStatsOverview,
} from '../../api';
import { Lang, t } from '../../i18n';
import AiPriorityBadge from '../AiPriorityBadge';

const MY_REPORTS_PAGE_SIZE = 120;

interface HomeProps {
  onNavigate: (tab: 'report') => void;
  onOpenReport?: (reportId: string) => void;
  lang: Lang;
  isDark: boolean;
}

const getCategoryIcon = (category: string) => {
  if (category.includes('Ã‡ukur') || category.includes('Yol')) return <Construction className="w-5 h-5" />;
  if (category.includes('Ã‡Ã¶p') || category.includes('Temiz')) return <Trash2 className="w-5 h-5" />;
  if (category.includes('Park') || category.includes('BahÃ§e')) return <TreePine className="w-5 h-5" />;
  if (category.includes('AydÄ±nlatma') || category.includes('IÅŸÄ±k')) return <Lightbulb className="w-5 h-5" />;
  return <AlertCircle className="w-5 h-5" />;
};

const getStatusBadge = (status: string, lang: Lang) => {
  const label = t(`status.${status}`, lang);
  switch (status) {
    case 'RESOLVED':
      return (
        <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
          {label}
        </span>
      );
    case 'PROCESSING':
      return (
        <span className="rounded-full bg-sky-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-sky-800 dark:bg-sky-900/35 dark:text-sky-200">
          {label}
        </span>
      );
    case 'REJECTED':
      return (
        <span className="rounded-full bg-red-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-red-700 dark:bg-red-900/30 dark:text-red-400">
          {label}
        </span>
      );
    default:
      return (
        <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
          {label}
        </span>
      );
  }
};

export default function Home({ onNavigate, onOpenReport, lang, isDark }: HomeProps) {
  const [reports, setReports] = useState<ApiReportList[]>([]);
  const [totalMyReports, setTotalMyReports] = useState(0);
  const [loading, setLoading] = useState(true);
  const [publicOverview, setPublicOverview] = useState<PublicStatsOverview | null>(null);
  const [publicError, setPublicError] = useState(false);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setPublicError(false);
      try {
        const [rep, overview] = await Promise.all([
          getMyReports(0, MY_REPORTS_PAGE_SIZE),
          fetchPublicStatsOverview().catch(() => null),
        ]);
        if (cancelled) return;
        setReports(rep.content || []);
        setTotalMyReports(rep.totalElements ?? (rep.content || []).length);
        setPublicOverview(overview);
      } catch (e) {
        console.error('AkÄ±ÅŸ yÃ¼klenemedi', e);
        if (!cancelled) {
          setReports([]);
          setTotalMyReports(0);
          setPublicError(true);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const cardBorder = isDark ? 'border-slate-700 bg-slate-800/90' : 'border-slate-200/90 bg-white';
  const muted = isDark ? 'text-slate-400' : 'text-slate-600';

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-5 p-4 pb-8">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary to-primary-dark p-5 text-white shadow-lg shadow-primary/20 ring-1 ring-white/10">
        <div
          className="pointer-events-none absolute -right-8 top-0 h-32 w-32 rounded-full bg-secondary/25 blur-2xl"
          aria-hidden
        />
        <div className="relative z-10">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/70">{t('app.name', lang)}</p>
          <h2 className="mt-1 text-lg font-extrabold tracking-tight">{t('home.hero.title', lang)}</h2>
          <p className="mt-2 text-sm font-medium leading-relaxed text-white/90">{t('home.hero.desc', lang)}</p>
          <button
            type="button"
            onClick={() => onNavigate('report')}
            className="mt-4 rounded-xl bg-accent px-4 py-2.5 text-sm font-bold text-slate-900 shadow-md transition-transform active:scale-[0.98]"
          >
            {t('home.hero.btn', lang)}
          </button>
        </div>
        <div className="pointer-events-none absolute -bottom-8 -right-4 opacity-[0.12]" aria-hidden>
          <AlertCircle className="h-28 w-28" />
        </div>
      </div>

      {/* Kamu istatistikleri */}
      <section className={`rounded-2xl border p-4 shadow-sm ${cardBorder}`} aria-label={t('home.public.title', lang)}>
        <div className="mb-3 flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/15">
            <Sparkles className="h-4 w-4" strokeWidth={2} />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-primary">{t('home.public.eyebrow', lang)}</p>
            <h3 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{t('home.public.title', lang)}</h3>
          </div>
        </div>
        {publicError || !publicOverview ? (
          <p className={`text-xs font-medium ${muted}`}>{t('home.public.loadError', lang)}</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className={`rounded-xl border p-3 ${isDark ? 'border-slate-600 bg-slate-900/50' : 'border-slate-100 bg-slate-50'}`}>
              <p className="text-[9px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                {t('home.public.total', lang)}
              </p>
              <p className={`mt-1 text-lg font-extrabold tabular-nums ${isDark ? 'text-white' : 'text-slate-900'}`}>
                {publicOverview.totalReports}
              </p>
            </div>
            <div className={`rounded-xl border p-3 ${isDark ? 'border-slate-600 bg-slate-900/50' : 'border-slate-100 bg-slate-50'}`}>
              <p className="text-[9px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                {t('home.public.resolved', lang)}
              </p>
              <p className={`mt-1 text-lg font-extrabold tabular-nums ${isDark ? 'text-white' : 'text-slate-900'}`}>
                {publicOverview.resolvedReports}
              </p>
            </div>
            <div className={`rounded-xl border p-3 ${isDark ? 'border-slate-600 bg-slate-900/50' : 'border-slate-100 bg-slate-50'}`}>
              <p className="text-[9px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                {t('home.public.rate', lang)}
              </p>
              <p className={`mt-1 text-lg font-extrabold tabular-nums text-primary`}>
                %{publicOverview.resolutionRatePercent}
              </p>
            </div>
            <div className={`rounded-xl border p-3 ${isDark ? 'border-slate-600 bg-slate-900/50' : 'border-slate-100 bg-slate-50'}`}>
              <p className="text-[9px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                {t('home.public.municipalities', lang)}
              </p>
              <p className={`mt-1 text-lg font-extrabold tabular-nums ${isDark ? 'text-white' : 'text-slate-900'}`}>
                {publicOverview.onboardedMunicipalityCount}
              </p>
            </div>
          </div>
        )}
      </section>

      {/* Ä°puÃ§larÄ± */}
      <section className={`rounded-2xl border p-4 shadow-sm ${cardBorder}`}>
        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-primary">{t('home.tips.eyebrow', lang)}</p>
        <h3 className={`mt-1 text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{t('home.tips.title', lang)}</h3>
        <ul className={`mt-3 space-y-2 text-xs font-medium leading-relaxed ${muted}`}>
          <li className="flex gap-2">
            <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
            {t('home.tips.a', lang)}
          </li>
          <li className="flex gap-2">
            <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-secondary" />
            {t('home.tips.b', lang)}
          </li>
          <li className="flex gap-2">
            <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
            {t('home.tips.c', lang)}
          </li>
        </ul>
      </section>

      {/* Bildirimler listesi */}
      <div>
        <div className="mb-3 px-0.5">
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-primary">{t('home.reports.sectionEyebrow', lang)}</p>
          <h3 className={`mt-1 flex items-center justify-between text-base font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-800'}`}>
            <span>{t('home.reports.title', lang)}</span>
            <span className={`text-xs font-semibold ${muted}`}>{t('home.reports.count', lang, { n: totalMyReports })}</span>
          </h3>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className={`animate-pulse rounded-2xl border p-4 ${isDark ? 'border-slate-700 bg-slate-800' : 'border-slate-200 bg-white'}`}
              >
                <div className="flex gap-3">
                  <div className={`h-10 w-10 rounded-xl ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`} />
                  <div className="flex-1 space-y-2">
                    <div className={`h-4 w-3/4 rounded ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`} />
                    <div className={`h-3 w-1/2 rounded ${isDark ? 'bg-slate-700/50' : 'bg-slate-100'}`} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : reports.length === 0 ? (
          <div
            className={`rounded-2xl border py-12 text-center ${isDark ? 'border-slate-700 bg-slate-800' : 'border-slate-200 bg-white'}`}
          >
            <HardHat className="mx-auto mb-3 h-12 w-12 text-slate-300 dark:text-slate-600" />
            <p className={`text-sm font-semibold ${muted}`}>{t('home.reports.empty.title', lang)}</p>
            <p className={`mt-1 text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{t('home.reports.empty.desc', lang)}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {reports.map((report, idx) => (
              <motion.div
                key={report.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(idx * 0.04, 0.35) }}
                role={onOpenReport ? 'button' : undefined}
                tabIndex={onOpenReport ? 0 : undefined}
                onClick={() => onOpenReport?.(report.id)}
                onKeyDown={(ev) => {
                  if (onOpenReport && (ev.key === 'Enter' || ev.key === ' ')) {
                    ev.preventDefault();
                    onOpenReport(report.id);
                  }
                }}
                className={`flex flex-col gap-3 rounded-2xl border p-4 shadow-sm transition-colors ${
                  onOpenReport ? `cursor-pointer active:scale-[0.99] ${isDark ? 'hover:border-slate-600' : 'hover:border-slate-300'}` : ''
                } ${isDark ? 'border-slate-700 bg-slate-800' : 'border-slate-200/90 bg-white'}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex min-w-0 gap-3">
                    <div
                      className={`shrink-0 rounded-xl border p-2.5 ${isDark ? 'border-slate-600 bg-slate-900 text-slate-400' : 'border-slate-100 bg-slate-50 text-slate-600'}`}
                    >
                      {getCategoryIcon(report.categoryName)}
                    </div>
                    <div className="min-w-0">
                      <h4 className={`truncate text-sm font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>{report.title}</h4>
                      <p className={`mt-0.5 truncate text-xs ${muted}`}>{report.categoryName}</p>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    {report.aiPriority && <AiPriorityBadge priority={report.aiPriority} lang={lang} />}
                    {getStatusBadge(report.status, lang)}
                  </div>
                </div>

                <div
                  className={`flex items-center justify-between border-t pt-2 text-xs ${isDark ? 'border-slate-700 text-slate-500' : 'border-slate-100 text-slate-500'}`}
                >
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 shrink-0" />
                    <span>
                      {new Date(report.createdAt).toLocaleDateString(lang === 'tr' ? 'tr-TR' : lang === 'ar' ? 'ar' : 'en-US', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                  <div className="flex min-w-0 items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{report.district || `${report.latitude?.toFixed(3)}, ${report.longitude?.toFixed(3)}`}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}
