import { useEffect, useMemo, useState, type ReactNode, type UIEvent } from 'react';
import { motion } from 'motion/react';
import { 
  ChevronLeft, 
  Clock, 
  MapPin, 
  Sparkles, 
  UserRound,
  CheckCircle2,
  Calendar,
  Hash,
  ArrowRight,
  TrendingUp,
  Layers
} from 'lucide-react';
import {
  getReportDetail,
  getReportTimeline,
  resolveMediaUrl,
  type ApiReportDetail,
  type ReportTimelineEntry,
} from '../../api';
import { Lang, t } from '../../i18n';
import {
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
  PENDING: { tr: 'Beklemede', en: 'Pending', ar: 'قide الانتظار' },
  PROCESSING: { tr: 'İşlemde', en: 'In progress', ar: 'قيد المعالجة' },
  RESOLVED: { tr: 'Çözüldü', en: 'Resolved', ar: 'تم الحل' },
  REJECTED: { tr: 'Reddedildi', en: 'Rejected', ar: 'مرفوض' },
  OUT_OF_JURISDICTION: { tr: 'Yetki Alanı Dışı', en: 'Out of Jurisdiction', ar: 'خارج نطاق الصلاحية' },
  FORWARDED: { tr: 'Yönlendirildi', en: 'Forwarded', ar: 'تم التحويل' },
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
      officialResponse: 'رد البلدية الرسمي',
      processTimeline: 'سجل العمليات',
      stageTitle: 'مراحل المتابعة',
      stageSent: 'تم الإرسال',
      stageProcess: 'قيد المعالجة',
      stageResolved: 'تم الحل',
      stageRejected: 'مرفوض',
      assignee: 'الموظف المسؤول',
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
      officialResponse: 'Official Response',
      processTimeline: 'Status Timeline',
      stageTitle: 'PROCESSING STAGE',
      stageSent: 'Submitted',
      stageProcess: 'In Progress',
      stageResolved: 'Resolved',
      stageRejected: 'Rejected',
      assignee: 'Assignee',
    };
  }
  return {
    status: 'Durum',
    category: 'Kategori',
    district: 'İlçe',
    createdAt: 'Oluşturuldu',
    updatedAt: 'Son Güncelleme',
    openMap: 'Haritada Aç',
    noDescription: 'Bu rapor için detaylı açıklama henüz girilmemiş.',
    attachments: 'Fotoğraflar ve Ekler',
    quickInfo: 'Hızlı Özet',
    officialResponse: 'Belediye Resmi Yanıtı',
    processTimeline: 'İşlem Geçmişi',
    stageTitle: 'İŞLEM SÜRECİ',
    stageSent: 'Gönderildi',
    stageProcess: 'İşlemde',
    stageResolved: 'Çözümlendi',
    stageRejected: 'Reddedildi',
    assignee: 'Atanan Personel',
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

export default function ReportDetailScreen({ reportId, lang, isDark, onClose }: ReportDetailScreenProps) {
  const [detail, setDetail] = useState<ApiReportDetail | null>(null);
  const [timeline, setTimeline] = useState<ReportTimelineEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [activeSlide, setActiveSlide] = useState(0);

  const ui = copy(lang);
  const locale = localeForLang(lang);
  const resolvedMapUrl = useMemo(() => mapUrl(detail?.latitude, detail?.longitude), [detail?.latitude, detail?.longitude]);

  // Find the latest official note/update with a message
  const officialResponse = useMemo(() => {
    if (!timeline || timeline.length === 0) return null;
    return (
      timeline.find((t) => t.note && t.newStatus === 'RESOLVED') ||
      timeline.find((t) => t.note && t.newStatus === 'PROCESSING') ||
      timeline.find((t) => t.note && t.newStatus === 'FORWARDED') ||
      timeline.find((t) => t.note) ||
      null
    );
  }, [timeline]);

  // Stepper calculations
  const stepperInfo = useMemo(() => {
    if (!detail) return { activeStep: 0, isRejected: false };
    const isRejected = detail.status === 'REJECTED' || detail.status === 'OUT_OF_JURISDICTION';
    let activeStep = 0;
    if (detail.status === 'PROCESSING' || detail.status === 'FORWARDED') {
      activeStep = 1;
    } else if (detail.status === 'RESOLVED' || detail.status === 'REJECTED' || detail.status === 'OUT_OF_JURISDICTION') {
      activeStep = 2;
    }
    return { activeStep, isRejected };
  }, [detail]);

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

  const handleScroll = (e: UIEvent<HTMLDivElement>) => {
    const container = e.currentTarget;
    const slideWidth = container.clientWidth;
    const scrollLeft = container.scrollLeft;
    if (slideWidth > 0) {
      setActiveSlide(Math.round(scrollLeft / slideWidth));
    }
  };

  return (
    <div className={`absolute inset-0 z-40 flex flex-col ${screenBg(isDark)}`}>
      {/* Floating Action Buttons */}
      <div className="absolute top-0 left-0 right-0 z-50 flex items-center justify-between p-4 pt-safe">
        <button
          type="button"
          onClick={onClose}
          className="rounded-full p-2.5 bg-slate-900/40 dark:bg-slate-950/60 text-white backdrop-blur-md border border-white/10 hover:bg-slate-900/60 active:scale-95 transition-all shadow-md"
          aria-label={t('announcement.detail.back', lang)}
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        {resolvedMapUrl && (
          <a
            href={resolvedMapUrl}
            target="_blank"
            rel="noreferrer"
            className="rounded-full p-2.5 bg-slate-900/40 dark:bg-slate-950/60 text-white backdrop-blur-md border border-white/10 hover:bg-slate-900/60 active:scale-95 transition-all shadow-md"
            aria-label={ui.openMap}
          >
            <MapPin className="h-5 w-5 text-primary" />
          </a>
        )}
      </div>

      {loading && (
        <div className="flex-1 flex flex-col items-center justify-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm text-slate-500">{t('report.detail.loading', lang)}</p>
        </div>
      )}

      {!loading && err && (
        <div className="flex-1 p-6 flex items-center justify-center">
          <div className="w-full rounded-2xl border border-red-200 bg-red-50 p-4 text-center text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
            {err}
          </div>
        </div>
      )}

      {!loading && !err && detail && (
        <div className="flex-1 overflow-y-auto scrollbar-none flex flex-col">
          {/* Header Banner / Photo Carousel */}
          {detail.mediaUrls && detail.mediaUrls.length > 0 ? (
            <div className="relative w-full aspect-[16/10] overflow-hidden bg-slate-950 shrink-0">
              <div
                className="flex w-full h-full overflow-x-auto snap-x snap-mandatory scrollbar-none"
                onScroll={handleScroll}
              >
                {detail.mediaUrls.map((url, i) => (
                  <div key={i} className="w-full h-full shrink-0 snap-center relative overflow-hidden">
                    <img
                      src={resolveMediaUrl(url)}
                      alt=""
                      className="w-full h-full object-cover scale-110 origin-center transition-transform duration-500 hover:scale-115"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  </div>
                ))}
              </div>

              {/* Bottom Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/65 via-transparent to-black/25 pointer-events-none" />

              {/* Slide Indicators */}
              {detail.mediaUrls.length > 1 && (
                <div className="absolute bottom-10 left-0 right-0 flex justify-center gap-1.5 z-20">
                  {detail.mediaUrls.map((_, i) => (
                    <span
                      key={i}
                      className={`h-1.5 rounded-full transition-all duration-300 ${
                        activeSlide === i ? 'w-4 bg-white' : 'w-1.5 bg-white/50'
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* Category Based Beautiful Gradient Header */
            <div className="relative w-full aspect-[16/6] min-h-[140px] flex items-center justify-center overflow-hidden bg-gradient-to-br from-primary via-indigo-600 to-indigo-900 shrink-0">
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/65 via-transparent to-transparent pointer-events-none" />
              <Sparkles className="absolute -right-6 -bottom-6 h-36 w-36 text-white/5 rotate-12" />
              <Layers className="absolute -left-6 -top-6 h-36 w-36 text-white/5 -rotate-12" />
              <div className="flex flex-col items-center gap-1 text-white/90 z-10 px-6 text-center mt-3">
                <span className="text-[10px] font-extrabold uppercase tracking-[0.2em] opacity-75">
                  KENTİVA MOBİL BİLDİRİM
                </span>
                <span className="text-base font-semibold tracking-wide truncate max-w-xs">
                  {detail.categoryName}
                </span>
              </div>
            </div>
          )}

          {/* Overlapping Content Sheet */}
          <div
            className={`relative -mt-6 rounded-t-[2.5rem] border-t px-5 pt-5 pb-10 shadow-2xl flex-1 flex flex-col ${
              isDark
                ? 'border-slate-800/80 bg-slate-900 text-slate-100'
                : 'border-slate-200/50 bg-white text-slate-900'
            }`}
          >
            {/* Sheet Handle */}
            <div className="mx-auto mb-4 h-1.5 w-14 rounded-full bg-slate-300 dark:bg-slate-800" />

            {/* Duplicate Notice */}
            {detail.duplicateGroupSize != null && detail.duplicateGroupSize > 1 && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex items-start gap-3 rounded-2xl border p-4 mb-4 text-xs font-medium leading-relaxed ${
                  isDark
                    ? 'border-violet-950/60 bg-violet-950/20 text-violet-300'
                    : 'border-violet-100 bg-violet-50/50 text-violet-800'
                }`}
              >
                <Layers className="mt-0.5 h-4 w-4 shrink-0 text-violet-500" />
                <p>
                  {t('report.detail.duplicate', lang).replace('{n}', String(detail.duplicateGroupSize - 1))}
                </p>
              </motion.div>
            )}

            {/* Title Block */}
            <div className="mb-4">
              <div className="flex items-center gap-2 flex-wrap mb-2">
                <span className={reportStatusBadgeClass(detail.status)}>
                  {statusLabel(detail.status, lang)}
                </span>
                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                  isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-500'
                }`}>
                  <Hash className="h-3 w-3" />
                  {detail.id.slice(0, 8).toUpperCase()}
                </span>
              </div>
              <h1 className={`text-xl font-bold tracking-tight leading-snug ${isDark ? 'text-white' : 'text-slate-900'}`}>
                {detail.title}
              </h1>
            </div>

            {/* Visual Stepper */}
            <div className={`rounded-2xl border p-4.5 mb-5 ${
              isDark ? 'border-slate-800 bg-slate-950/20' : 'border-slate-100 bg-slate-50/25'
            }`}>
              <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-4.5">
                <TrendingUp className="h-3.5 w-3.5 text-primary" />
                {ui.stageTitle}
              </div>
              <div className="relative flex items-center justify-between px-2">
                {/* Stepper progress track background */}
                <div className="absolute left-4 right-4 top-[18px] h-0.5 bg-slate-200 dark:bg-slate-800 -z-10" />
                {/* Stepper active track */}
                <div
                  className={`absolute left-4 top-[18px] h-0.5 transition-all duration-500 -z-10 ${
                    stepperInfo.isRejected ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]' : 'bg-primary shadow-[0_0_8px_rgba(14,165,233,0.5)]'
                  }`}
                  style={{ width: stepperInfo.activeStep === 0 ? '0%' : stepperInfo.activeStep === 1 ? 'calc(50% - 1rem)' : 'calc(100% - 2rem)' }}
                />

                {/* Stepper items */}
                {[ui.stageSent, ui.stageProcess, ui.stageResolved].map((name, idx) => {
                  const isCompleted = idx < stepperInfo.activeStep;
                  const isActive = idx === stepperInfo.activeStep;

                  let stepLabel = name;
                  if (idx === 2 && stepperInfo.isRejected) {
                    stepLabel = ui.stageRejected;
                  }

                  return (
                    <div key={idx} className="flex flex-col items-center flex-1">
                      <div
                        className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs border-2 transition-all duration-300 ${
                          isActive
                            ? stepperInfo.isRejected
                              ? 'bg-red-500 border-red-500 text-white shadow-md shadow-red-500/25 scale-110'
                              : 'bg-primary border-primary text-white shadow-md shadow-primary/25 scale-110'
                            : isCompleted
                            ? stepperInfo.isRejected && idx === 2
                              ? 'bg-red-100 border-red-500 text-red-600 dark:bg-red-950/20'
                              : 'bg-primary/10 border-primary text-primary dark:bg-primary/20 dark:text-sky-300'
                            : 'bg-white border-slate-300 text-slate-400 dark:bg-slate-900 dark:border-slate-800'
                        }`}
                      >
                        {isCompleted ? (
                          <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3.2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        ) : isActive ? (
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                          </span>
                        ) : (
                          idx + 1
                        )}
                      </div>
                      <span
                        className={`mt-2 text-[10px] font-black tracking-wide text-center ${
                          isActive
                            ? stepperInfo.isRejected
                              ? 'text-red-500'
                              : 'text-primary'
                            : isCompleted
                            ? 'text-slate-700 dark:text-slate-300'
                            : 'text-slate-500 dark:text-slate-400'
                        }`}
                      >
                        {stepLabel}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Description Card */}
            <div className="mb-4">
              <p className={`text-sm leading-relaxed whitespace-pre-wrap font-medium ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                {detail.description || ui.noDescription}
              </p>
            </div>

            {/* Official Response Highlight Box */}
            {officialResponse && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={`rounded-2xl border p-4.5 mb-4 border-l-4 shadow-sm relative overflow-hidden ${
                  isDark
                    ? 'border-emerald-500/30 bg-gradient-to-br from-slate-900 to-emerald-950/10 text-slate-300 border-l-emerald-500'
                    : 'border-emerald-200 bg-gradient-to-br from-white to-emerald-50/20 text-slate-800 border-l-emerald-500'
                }`}
              >
                <CheckCircle2 className="absolute -right-3 -bottom-3 h-20 w-20 text-emerald-500/5 pointer-events-none" />
                
                <div className="flex items-center justify-between mb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="flex h-5.5 w-5.5 items-center justify-center rounded-full bg-emerald-500 text-white shadow-sm shadow-emerald-500/20">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </span>
                    <h4 className="text-xs font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                      {ui.officialResponse}
                    </h4>
                  </div>
                  {officialResponse.actorName && (
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800">
                      {officialResponse.actorName}
                    </span>
                  )}
                </div>
                <p className="text-xs leading-relaxed font-semibold">
                  {officialResponse.note}
                </p>
                {officialResponse.at && (
                  <div className="mt-3 text-[9px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
                    {new Date(officialResponse.at).toLocaleString(locale)}
                  </div>
                )}
              </motion.div>
            )}

            {/* 2x2 Information Grid */}
            <div className="grid grid-cols-2 gap-3 mb-5">
              <QuickInfoTile
                label={ui.category}
                value={detail.categoryName}
                isDark={isDark}
                icon={<Sparkles className="h-3.5 w-3.5" />}
              />
              <QuickInfoTile
                label={ui.district}
                value={detail.district || '—'}
                isDark={isDark}
                icon={<MapPin className="h-3.5 w-3.5" />}
              />
              <QuickInfoTile
                label={ui.createdAt}
                value={new Date(detail.createdAt).toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' })}
                isDark={isDark}
                icon={<Calendar className="h-3.5 w-3.5" />}
              />
              <QuickInfoTile
                label={ui.updatedAt}
                value={new Date(detail.updatedAt).toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' })}
                isDark={isDark}
                icon={<Clock className="h-3.5 w-3.5" />}
              />
            </div>

            {/* Assigned Officer */}
            {detail.assigneeFullName && (
              <div className={`flex items-center gap-2.5 rounded-2xl p-3 mb-5 border ${
                isDark ? 'border-slate-800 bg-slate-950/20 text-slate-300' : 'border-slate-100 bg-slate-50/30 text-slate-700'
              }`}>
                <div className="p-1.5 rounded-xl bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary-light">
                  <UserRound className="h-4 w-4" />
                </div>
                <div className="text-xs">
                  <span className="text-slate-500 dark:text-slate-400 font-bold block text-[9px] uppercase tracking-wider">
                    {ui.assignee}
                  </span>
                  <span className="font-bold">{detail.assigneeFullName}</span>
                </div>
              </div>
            )}

            {/* Photo Attachments */}
            {detail.mediaUrls && detail.mediaUrls.length > 1 && (
              <div className="mb-6">
                <h3 className={`text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3`}>
                  {ui.attachments}
                </h3>
                <div className="grid grid-cols-4 gap-2">
                  {detail.mediaUrls.map((url, i) => (
                    <a
                      key={i}
                      href={resolveMediaUrl(url)}
                      target="_blank"
                      rel="noreferrer"
                      className={`block overflow-hidden rounded-xl aspect-square border ${
                        isDark ? 'border-slate-800 hover:border-slate-700' : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <img
                        src={resolveMediaUrl(url)}
                        alt=""
                        className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Detailed Timeline Audit Log */}
            <div>
              <div className="mb-4">
                <h3 className={`text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400`}>
                  {ui.processTimeline}
                </h3>
              </div>
              {timeline.length === 0 ? (
                <p className="text-xs text-slate-500">{t('report.detail.timelineEmpty', lang)}</p>
              ) : (
                <div className="relative border-l border-slate-200 dark:border-slate-800 pl-5 ml-2 space-y-5">
                  {timeline.map((entry, i) => {
                    return (
                      <div key={i} className="relative">
                        {/* Timeline Node Icon/Dot */}
                        <span className={`absolute -left-[25px] top-0.5 h-2.5 w-2.5 rounded-full ring-4 ${
                          isDark ? 'ring-slate-900' : 'ring-white'
                        } ${
                          entry.newStatus === 'RESOLVED'
                            ? 'bg-emerald-500'
                            : entry.newStatus === 'REJECTED'
                            ? 'bg-red-500'
                            : entry.newStatus === 'PROCESSING'
                            ? 'bg-sky-500'
                            : 'bg-amber-500'
                        }`} />

                        {/* Formatted Time */}
                        <p className="text-[9px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                          {entry.at ? new Date(entry.at).toLocaleString(locale) : ''}
                        </p>

                        {/* Status Change Line */}
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            entry.oldStatus
                              ? isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-500'
                              : 'bg-transparent text-slate-400'
                          }`}>
                            {entry.oldStatus ? statusLabel(entry.oldStatus, lang) : 'Rapor'}
                          </span>
                          <ArrowRight className="h-3 w-3 text-slate-400" />
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            entry.newStatus === 'RESOLVED'
                              ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                              : entry.newStatus === 'REJECTED'
                              ? 'bg-red-500/15 text-red-600 dark:text-red-400'
                              : entry.newStatus === 'PROCESSING'
                              ? 'bg-sky-500/15 text-sky-600 dark:text-sky-400'
                              : 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                          }`}>
                            {statusLabel(entry.newStatus, lang)}
                          </span>
                        </div>

                        {/* Actor Name */}
                        {entry.actorName && (
                          <p className="text-[10px] text-slate-600 dark:text-slate-400 mt-1 font-bold">
                            {entry.actorName}
                          </p>
                        )}

                        {/* Log Note / Comment Bubble */}
                        {entry.note && (
                          <div className={`mt-2 rounded-2xl p-3 text-xs leading-relaxed relative border ${
                            isDark
                              ? 'bg-slate-950/40 border-slate-800/80 text-slate-300'
                              : 'bg-slate-50/50 border-slate-200 text-slate-600'
                          }`}>
                            {entry.note}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>
        </div>
      )}
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
    <div className={`rounded-xl border p-3.5 transition-all duration-200 flex items-center gap-3 ${
      isDark 
        ? 'border-slate-800 bg-slate-900/30 hover:bg-slate-900/50 hover:border-slate-700/80' 
        : 'border-slate-200 bg-slate-50/30 hover:bg-slate-50 hover:border-slate-300'
    }`}>
      <div className="p-2 rounded-lg bg-primary/5 text-primary dark:bg-primary/20 dark:text-sky-300 shrink-0">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <span className="text-[9px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
          {label}
        </span>
        <p className={`mt-0.5 text-xs font-bold leading-normal truncate ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
          {value}
        </p>
      </div>
    </div>
  );
}
