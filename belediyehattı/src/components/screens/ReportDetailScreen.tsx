import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, Clock, Layers, MapPin, Sparkles } from 'lucide-react';
import { getReportDetail, getReportTimeline, resolveMediaUrl, type ApiReportDetail, type ReportTimelineEntry } from '../../api';
import { Lang, t } from '../../i18n';
import AiPriorityBadge from '../AiPriorityBadge';
import { reportStatusBadgeClass } from '../../lib/ui';

interface ReportDetailScreenProps {
  reportId: string;
  lang: Lang;
  isDark: boolean;
  onClose: () => void;
}

function statusLabel(status: string | null | undefined, lang: Lang): string {
  if (!status) return '—';
  const key = `status.${status}` as 'status.PENDING';
  const translated = t(key, lang);
  return translated === key ? status : translated;
}

export default function ReportDetailScreen({ reportId, lang, isDark, onClose }: ReportDetailScreenProps) {
  const [detail, setDetail] = useState<ApiReportDetail | null>(null);
  const [timeline, setTimeline] = useState<ReportTimelineEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        const [d, tl] = await Promise.all([getReportDetail(reportId), getReportTimeline(reportId)]);
        if (!cancelled) {
          setDetail(d);
          setTimeline(tl);
        }
      } catch (e: unknown) {
        if (!cancelled) setErr(e instanceof Error ? e.message : 'Hata');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reportId]);

  const card = isDark ? 'border-slate-700 bg-slate-800' : 'border-slate-200 bg-white';

  return (
    <motion.div
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 24 }}
      className={`absolute inset-0 z-40 flex flex-col ${isDark ? 'bg-slate-900' : 'bg-slate-50'}`}
    >
      <motion.div
        className={`flex shrink-0 items-center gap-3 border-b px-4 py-3 pt-safe ${isDark ? 'border-slate-800 bg-slate-900/95 backdrop-blur-md' : 'border-slate-200 bg-white/95 backdrop-blur-md'}`}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label={lang === 'tr' ? 'Geri' : 'Back'}
          className={`rounded-xl p-2 ${isDark ? 'hover:bg-slate-800 text-slate-200' : 'hover:bg-slate-100 text-slate-700'}`}
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h2 className={`flex-1 truncate text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
          {t('report.detail.title', lang)}
        </h2>
      </motion.div>

      <motion.div className="flex-1 overflow-y-auto p-4 pb-8">
        {loading && (
          <div className="flex flex-col items-center justify-center gap-3 py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <p className="text-sm text-slate-500">{t('report.detail.loading', lang)}</p>
          </div>
        )}

        {!loading && err && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-center text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
            {err}
          </div>
        )}

        {!loading && !err && detail && (
          <div className="space-y-5">
            {detail.duplicateGroupSize != null && detail.duplicateGroupSize > 1 && (
              <motion.div
                className={`flex items-start gap-3 rounded-2xl border p-4 text-sm ${
                  isDark ? 'border-violet-900/50 bg-violet-950/40 text-violet-100' : 'border-violet-200 bg-violet-50 text-violet-900'
                }`}
              >
                <Layers className="mt-0.5 h-5 w-5 shrink-0" />
                <p className="font-medium">
                  {t('report.detail.duplicate', lang).replace('{n}', String(detail.duplicateGroupSize - 1))}
                </p>
              </motion.div>
            )}

            <div className={`rounded-2xl border p-4 shadow-sm ${card}`}>
              <motion.div className="flex flex-wrap items-start justify-between gap-2">
                <h3 className={`text-base font-bold leading-snug ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  {detail.title}
                </h3>
                <span className={reportStatusBadgeClass(detail.status)}>{statusLabel(detail.status, lang)}</span>
              </motion.div>

              <p className={`mt-3 text-sm leading-relaxed whitespace-pre-wrap ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                {detail.description}
              </p>

              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                <span className="rounded-lg bg-primary/10 px-2 py-1 font-semibold text-primary">{detail.categoryName}</span>
                {detail.aiPriority && <AiPriorityBadge priority={detail.aiPriority} lang={lang} />}
                {detail.district && (
                  <span
                    className={`flex items-center gap-1 rounded-lg px-2 py-1 ${isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'}`}
                  >
                    <MapPin className="h-3 w-3" />
                    {detail.district}
                  </span>
                )}
                <span className={`flex items-center gap-1 ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
                  <Clock className="h-3 w-3" />
                  {new Date(detail.createdAt).toLocaleString(lang === 'tr' ? 'tr-TR' : 'en-US')}
                </span>
              </div>

              {(detail.aiSummary || detail.aiSuggestedCategory) && (
                <div
                  className={`mt-4 flex gap-2 rounded-xl border p-3 text-xs ${isDark ? 'border-secondary/30 bg-primary/10 text-slate-200' : 'border-primary/20 bg-primary/5 text-slate-700'}`}
                >
                  <Sparkles className="h-4 w-4 shrink-0 text-secondary" />
                  <motion.div>
                    {detail.aiSummary && <p className="font-medium">{detail.aiSummary}</p>}
                    {detail.aiSuggestedCategory && (
                      <p className="mt-1 opacity-80">
                        {t('report.detail.aiCategory', lang)}: {detail.aiSuggestedCategory}
                      </p>
                    )}
                  </motion.div>
                </div>
              )}

              {detail.mediaUrls && detail.mediaUrls.length > 0 && (
                <div className="mt-4">
                  <p className={`mb-2 text-xs font-semibold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    {lang === 'tr' ? 'Fotoğraflar' : 'Photos'}
                  </p>
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {detail.mediaUrls.map((url, i) => (
                      <a
                        key={i}
                        href={resolveMediaUrl(url)}
                        target="_blank"
                        rel="noreferrer"
                        className="block shrink-0"
                      >
                        <img
                          src={resolveMediaUrl(url)}
                          alt={`${i + 1}`}
                          className="h-28 w-28 rounded-xl border border-slate-200 object-cover dark:border-slate-700"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div>
              <h4 className={`mb-3 text-sm font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>
                {t('report.detail.timeline', lang)}
              </h4>
              {timeline.length === 0 ? (
                <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                  {lang === 'tr' ? 'Henüz durum geçmişi yok.' : 'No status history yet.'}
                </p>
              ) : (
                <div className="relative space-y-0 border-l-2 border-primary/30 pl-4">
                  {timeline.map((e, i) => (
                    <div key={i} className="relative pb-6 last:pb-0">
                      <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-primary ring-4 ring-white dark:ring-slate-900" />
                      <p className="text-[11px] font-semibold uppercase text-slate-500">
                        {e.at ? new Date(e.at).toLocaleString(lang === 'tr' ? 'tr-TR' : 'en-US') : ''}
                      </p>
                      <p className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        {statusLabel(e.oldStatus, lang)} → {statusLabel(e.newStatus, lang)}
                      </p>
                      {e.actorName && <p className="text-xs text-slate-500">{e.actorName}</p>}
                      {e.note && <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">{e.note}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
