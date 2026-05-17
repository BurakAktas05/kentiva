import { useEffect, useState } from 'react';
import { ArrowLeft, Clock, Layers, MapPin, Sparkles } from 'lucide-react';
import { getReportDetail, getReportTimeline, resolveMediaUrl, type ApiReportDetail, type ReportTimelineEntry } from '../../api';
import { Lang, t } from '../../i18n';
import AiPriorityBadge from '../AiPriorityBadge';

interface ReportDetailScreenProps {
  reportId: string;
  lang: Lang;
  isDark: boolean;
  onClose: () => void;
}

export default function ReportDetailScreen({ reportId, lang, isDark, onClose }: ReportDetailScreenProps) {
  const [detail, setDetail] = useState<ApiReportDetail | null>(null);
  const [timeline, setTimeline] = useState<ReportTimelineEntry[]>([]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [d, tl] = await Promise.all([getReportDetail(reportId), getReportTimeline(reportId)]);
        if (!cancelled) {
          setDetail(d);
          setTimeline(tl);
        }
      } catch (e: unknown) {
        if (!cancelled) setErr(e instanceof Error ? e.message : 'Hata');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reportId]);

  return (
    <div className={`absolute inset-0 z-30 flex flex-col ${isDark ? 'bg-slate-900' : 'bg-slate-50'}`}>
      <div
        className={`flex shrink-0 items-center gap-3 border-b px-4 py-3 pt-safe ${isDark ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-white'}`}
      >
        <button
          type="button"
          onClick={onClose}
          className={`rounded-xl p-2 ${isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`}
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h2 className={`flex-1 text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{t('report.detail.title', lang)}</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {err && <p className="text-center text-sm text-red-600">{err}</p>}
        {!err && !detail && <p className="text-center text-slate-500">{t('report.detail.loading', lang)}</p>}
        {detail && (
          <div className="space-y-6">
            {detail.duplicateGroupSize != null && detail.duplicateGroupSize > 1 && (
              <div
                className={`flex items-start gap-3 rounded-2xl border p-4 text-sm ${
                  isDark ? 'border-violet-900/50 bg-violet-950/40 text-violet-100' : 'border-violet-200 bg-violet-50 text-violet-900'
                }`}
              >
                <Layers className="mt-0.5 h-5 w-5 shrink-0" />
                <p className="font-medium">
                  {t('report.detail.duplicate', lang).replace('{n}', String(detail.duplicateGroupSize - 1))}
                </p>
              </div>
            )}

            <div className={`rounded-2xl border p-4 ${isDark ? 'border-slate-700 bg-slate-800' : 'border-slate-200 bg-white'}`}>
              <h3 className={`text-base font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{detail.title}</h3>
              <p className={`mt-2 text-sm ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>{detail.description}</p>
              <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
                <span className="rounded-lg bg-primary/10 px-2 py-1 font-semibold text-primary">{detail.categoryName}</span>
                {detail.aiPriority && <AiPriorityBadge priority={detail.aiPriority} lang={lang} />}
                {detail.district && (
                  <span className="flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-1 dark:bg-slate-700">
                    <MapPin className="h-3 w-3" />
                    {detail.district}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {new Date(detail.createdAt).toLocaleString(lang === 'tr' ? 'tr-TR' : 'en-US')}
                </span>
              </div>
              {(detail.aiSummary || detail.aiSuggestedCategory) && (
                <div
                  className={`mt-4 flex gap-2 rounded-xl border p-3 text-xs ${isDark ? 'border-secondary/30 bg-primary/10 text-slate-200' : 'border-primary/20 bg-primary/5 text-slate-700'}`}
                >
                  <Sparkles className="h-4 w-4 shrink-0 text-secondary" />
                  <div>
                    {detail.aiSummary && <p className="font-medium">{detail.aiSummary}</p>}
                    {detail.aiSuggestedCategory && (
                      <p className="mt-1 text-slate-500 dark:text-slate-400">
                        {t('report.detail.aiCategory', lang)}: {detail.aiSuggestedCategory}
                      </p>
                    )}
                  </div>
                </div>
              )}
              {detail.mediaUrls && detail.mediaUrls.length > 0 && (
                <div className="mt-4">
                  <p className={`mb-2 text-xs font-semibold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{lang === 'tr' ? 'Fotoğraflar' : 'Photos'}</p>
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {detail.mediaUrls.map((url, i) => (
                      <img
                        key={i}
                        src={resolveMediaUrl(url)}
                        alt={`${i + 1}`}
                        className="h-24 w-24 shrink-0 rounded-xl border border-slate-200 object-cover dark:border-slate-700"
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div>
              <h4 className={`mb-3 text-sm font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>{t('report.detail.timeline', lang)}</h4>
              <div className="relative space-y-0 border-l-2 border-primary/30 pl-4">
                {timeline.map((e, i) => (
                  <div key={i} className="relative pb-6 last:pb-0">
                    <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-primary ring-4 ring-white dark:ring-slate-900" />
                    <p className="text-[11px] font-semibold uppercase text-slate-500">
                      {e.at ? new Date(e.at).toLocaleString(lang === 'tr' ? 'tr-TR' : 'en-US') : ''}
                    </p>
                    <p className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      {e.oldStatus ?? '—'} → {e.newStatus ?? '—'}
                    </p>
                    <p className="text-xs text-slate-500">{e.actorName}</p>
                    {e.note && <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">{e.note}</p>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
