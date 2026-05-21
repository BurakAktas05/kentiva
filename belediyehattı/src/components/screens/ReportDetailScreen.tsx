import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { motion } from 'motion/react';
import { ChevronLeft, Clock, ExternalLink, Layers, MapPin, Sparkles, UserRound } from 'lucide-react';
import {
  getReportDetail,
  getReportTimeline,
  resolveMediaUrl,
  type ApiReportDetail,
  type ReportTimelineEntry,
} from '../../api';
import { Lang, t } from '../../i18n';
import {
  detailBackBtnClass,
  detailHeaderBar,
  detailTitleClass,
  kentivaCard,
  mediaThumbClass,
  reportStatusBadgeClass,
  screenBg,
} from '../../lib/ui';

interface ReportDetailScreenProps {
  reportId: string;
  lang: Lang;
  isDark: boolean;
  onClose: () => void;
}

const STATUS_LABELS: Record<string, { tr: string; en: string; ar: string }> = {
  PENDING: { tr: 'Beklemede', en: 'Pending', ar: 'قيد الانتظار' },
  PROCESSING: { tr: 'Islemde', en: 'In progress', ar: 'قيد المعالجة' },
  RESOLVED: { tr: 'Cozuldu', en: 'Resolved', ar: 'تم الحل' },
  REJECTED: { tr: 'Reddedildi', en: 'Rejected', ar: 'مرفوض' },
  FORWARDED: { tr: 'Yonlendirildi', en: 'Forwarded', ar: 'تم التحويل' },
};

function localeForLang(lang: Lang) {
  if (lang === 'tr') return 'tr-TR';
  if (lang === 'ar') return 'ar';
  return 'en-US';
}

function copy(lang: Lang) {
  if (lang === 'ar') {
    return {
      status: 'الحالة',
      category: 'الفئة',
      district: 'المنطقة',
      createdAt: 'تم الإنشاء',
      updatedAt: 'آخر تحديث',
      openMap: 'افتح الخريطة',
      noDescription: 'لا يوجد وصف مفصل لهذا البلاغ بعد.',
      attachments: 'الصور والمرفقات',
      quickInfo: 'ملخص سريع',
    };
  }
  if (lang === 'en') {
    return {
      status: 'Status',
      category: 'Category',
      district: 'District',
      createdAt: 'Created',
      updatedAt: 'Last updated',
      openMap: 'Open map',
      noDescription: 'There is no detailed description for this report yet.',
      attachments: 'Photos and attachments',
      quickInfo: 'Quick overview',
    };
  }
  return {
    status: 'Durum',
    category: 'Kategori',
    district: 'Ilce',
    createdAt: 'Olusturuldu',
    updatedAt: 'Son guncelleme',
    openMap: 'Haritada ac',
    noDescription: 'Bu rapor icin detayli aciklama henuz girilmemis.',
    attachments: 'Fotograflar ve ekler',
    quickInfo: 'Hizli ozet',
  };
}

function statusLabel(status: string | null | undefined, lang: Lang): string {
  if (!status) return '—';
  const labels = STATUS_LABELS[status];
  if (!labels) return status;
  return labels[lang];
}

function mapUrl(lat: number | null | undefined, lng: number | null | undefined) {
  if (lat == null || lng == null) return null;
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
}

function infoCard(isDark: boolean) {
  return kentivaCard(isDark, 'overflow-hidden');
}

export default function ReportDetailScreen({ reportId, lang, isDark, onClose }: ReportDetailScreenProps) {
  const [detail, setDetail] = useState<ApiReportDetail | null>(null);
  const [timeline, setTimeline] = useState<ReportTimelineEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const ui = copy(lang);
  const locale = localeForLang(lang);
  const resolvedMapUrl = useMemo(() => mapUrl(detail?.latitude, detail?.longitude), [detail?.latitude, detail?.longitude]);

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

  return (
    <div className={`absolute inset-0 z-40 flex flex-col ${screenBg(isDark)}`}>
      <header className={detailHeaderBar(isDark)}>
        <button type="button" onClick={onClose} className={detailBackBtnClass(isDark)} aria-label={t('announcement.detail.back', lang)}>
          <ChevronLeft className="h-6 w-6" />
        </button>
        <h1 className={detailTitleClass(isDark)}>{t('report.detail.title', lang)}</h1>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-4 pb-8">
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
          <div className="space-y-4">
            {detail.duplicateGroupSize != null && detail.duplicateGroupSize > 1 && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
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

            <motion.section
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={`${infoCard(isDark)} bg-gradient-to-br ${isDark ? 'from-slate-900 via-slate-900 to-sky-950/40' : 'from-white via-sky-50 to-slate-50'}`}
            >
              <div className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={reportStatusBadgeClass(detail.status)}>{statusLabel(detail.status, lang)}</span>
                      <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${isDark ? 'bg-slate-800 text-slate-300' : 'bg-white text-slate-600 shadow-sm'}`}>
                        #{detail.id.slice(0, 8)}
                      </span>
                    </div>
                    <h2 className={`mt-3 text-lg font-semibold leading-snug ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      {detail.title}
                    </h2>
                  </div>
                  {resolvedMapUrl && (
                    <a
                      href={resolvedMapUrl}
                      target="_blank"
                      rel="noreferrer"
                      className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold ${
                        isDark ? 'bg-slate-800 text-slate-100' : 'bg-white text-slate-700 shadow-sm'
                      }`}
                    >
                      <MapPin className="h-3.5 w-3.5 text-primary" />
                      {ui.openMap}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>

                <p className={`mt-3 whitespace-pre-wrap text-sm leading-7 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                  {detail.description || ui.noDescription}
                </p>

                <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                  <QuickInfoTile
                    label={ui.category}
                    value={detail.categoryName}
                    isDark={isDark}
                    icon={<Sparkles className="h-3.5 w-3.5 text-primary" />}
                  />
                  <QuickInfoTile
                    label={ui.district}
                    value={detail.district || '—'}
                    isDark={isDark}
                    icon={<MapPin className="h-3.5 w-3.5 text-primary" />}
                  />
                  <QuickInfoTile
                    label={ui.createdAt}
                    value={new Date(detail.createdAt).toLocaleString(locale)}
                    isDark={isDark}
                    icon={<Clock className="h-3.5 w-3.5 text-primary" />}
                  />
                  <QuickInfoTile
                    label={ui.updatedAt}
                    value={new Date(detail.updatedAt).toLocaleString(locale)}
                    isDark={isDark}
                    icon={<Clock className="h-3.5 w-3.5 text-primary" />}
                  />
                </div>

                {detail.assigneeFullName && (
                  <div className={`mt-4 inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs ${isDark ? 'bg-slate-800 text-slate-200' : 'bg-white text-slate-700 shadow-sm'}`}>
                    <UserRound className="h-3.5 w-3.5 text-primary" />
                    {t('report.detail.assignee', lang)}: <span className="font-semibold">{detail.assigneeFullName}</span>
                  </div>
                )}
              </div>
            </motion.section>

            {detail.mediaUrls && detail.mediaUrls.length > 0 && (
              <motion.section
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={kentivaCard(isDark)}
              >
                <p className={`mb-3 text-sm font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  {ui.attachments}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {detail.mediaUrls.map((url, i) => (
                    <a key={i} href={resolveMediaUrl(url)} target="_blank" rel="noreferrer" className="block">
                      <img
                        src={resolveMediaUrl(url)}
                        alt=""
                        className={`${mediaThumbClass(isDark)} h-28 w-full`}
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    </a>
                  ))}
                </div>
              </motion.section>
            )}

            <motion.section
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={kentivaCard(isDark)}
            >
              <div className="mb-3">
                <h3 className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-slate-800'}`}>
                  {t('report.detail.timeline', lang)}
                </h3>
                <p className={`mt-1 text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{ui.quickInfo}</p>
              </div>
              {timeline.length === 0 ? (
                <p className="text-xs text-slate-500">{t('report.detail.timelineEmpty', lang)}</p>
              ) : (
                <div className="relative space-y-0 border-l-2 border-primary/30 pl-4">
                  {timeline.map((entry, i) => (
                    <div key={i} className="relative pb-5 last:pb-0">
                      <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-primary ring-4 ring-white dark:ring-slate-900" />
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                        {entry.at ? new Date(entry.at).toLocaleString(locale) : ''}
                      </p>
                      <p className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        {statusLabel(entry.oldStatus, lang)} → {statusLabel(entry.newStatus, lang)}
                      </p>
                      {entry.actorName && <p className="text-xs text-slate-500">{entry.actorName}</p>}
                      {entry.note && (
                        <div className={`mt-2 rounded-xl p-3 text-xs leading-6 ${isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-50 text-slate-600'}`}>
                          {entry.note}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </motion.section>
          </div>
        )}
      </div>
    </div>
  );
}

function QuickInfoTile({
  label,
  value,
  icon,
  isDark,
}: {
  label: string;
  value: string;
  icon: ReactNode;
  isDark: boolean;
}) {
  return (
    <div className={`rounded-2xl border p-3 ${isDark ? 'border-slate-700 bg-slate-900/80' : 'border-white bg-white/90 shadow-sm'}`}>
      <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
        {icon}
        {label}
      </div>
      <p className={`mt-2 text-sm font-semibold leading-6 ${isDark ? 'text-white' : 'text-slate-900'}`}>{value}</p>
    </div>
  );
}
