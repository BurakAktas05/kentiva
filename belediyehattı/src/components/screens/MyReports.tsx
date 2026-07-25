import { useState, useEffect, useCallback } from 'react';
import { motion } from 'motion/react';
import {
  ArrowLeft,
  Clock,
  AlertCircle,
  Trash2,
  HardHat,
  Lightbulb,
  TreePine,
  Construction,
} from 'lucide-react';
import { getMyReports, type ApiReportList } from '../../api';
import { Lang, t } from '../../i18n';
import AiPriorityBadge from '../AiPriorityBadge';
import SlaIndicator from '../SlaIndicator';
import { reportStatusBadgeClass } from '../../lib/ui';
import EmptyState from '../ui/EmptyState';
import ErrorState from '../ui/ErrorState';
import LoadingState from '../ui/LoadingState';

const PAGE_SIZE = 120;

interface MyReportsProps {
  onBack: () => void;
  onOpenReport?: (reportId: string) => void;
  onCreateReport?: () => void;
  lang: Lang;
  isDark: boolean;
}

const getCategoryIcon = (category: string) => {
  const c = category.toLowerCase();
  if (c.includes('çukur') || c.includes('yol') || c.includes('pothole')) return <Construction className="w-5 h-5" />;
  if (c.includes('çöp') || c.includes('temiz') || c.includes('waste') || c.includes('trash')) return <Trash2 className="w-5 h-5" />;
  if (c.includes('park') || c.includes('bahçe') || c.includes('garden')) return <TreePine className="w-5 h-5" />;
  if (c.includes('aydınlatma') || c.includes('ışık') || c.includes('light')) return <Lightbulb className="w-5 h-5" />;
  return <AlertCircle className="w-5 h-5" />;
};

const StatusBadge = ({ status, lang }: { status: string; lang: Lang }) => (
  <span className={reportStatusBadgeClass(status)}>{t(`status.${status}`, lang)}</span>
);

function reportUrgencyScore(r: ApiReportList): number {
  const hours = (Date.now() - new Date(r.createdAt).getTime()) / 3600000;
  const risk = (r.aiSlaRisk || '').toUpperCase();
  let score = hours;
  if (risk === 'CRITICAL') score += 100;
  else if (risk === 'HIGH') score += 60;
  else if (risk === 'MEDIUM') score += 30;
  if (r.status === 'PENDING') score += 20;
  return score;
}

export default function MyReports({ onBack, onOpenReport, onCreateReport, lang, isDark }: MyReportsProps) {
  const [reports, setReports] = useState<ApiReportList[]>([]);
  const [totalMyReports, setTotalMyReports] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const loadReports = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const rep = await getMyReports(0, PAGE_SIZE);
      setReports(rep.content || []);
      setTotalMyReports(rep.totalElements ?? (rep.content || []).length);
    } catch {
      setReports([]);
      setTotalMyReports(0);
      setLoadError(
        lang === 'tr'
          ? 'İhbarlarınız yüklenemedi. Bağlantınızı kontrol edip tekrar deneyin.'
          : 'Could not load your reports. Check your connection and try again.',
      );
    } finally {
      setLoading(false);
    }
  }, [lang]);

  useEffect(() => {
    void loadReports();
  }, [loadReports]);

  const card = isDark ? 'border-slate-700 bg-slate-800' : 'border-slate-200 bg-white';
  const muted = isDark ? 'text-slate-400' : 'text-slate-500';
  const sortedReports = [...reports].sort((a, b) => reportUrgencyScore(b) - reportUrgencyScore(a));
  const isEmpty = !loading && !loadError && totalMyReports === 0;
  const pendingCount = reports.filter((r) => r.status === 'PENDING').length;
  const processingCount = reports.filter((r) => r.status === 'PROCESSING' || r.status === 'FORWARDED').length;
  const resolvedCount = reports.filter((r) => r.status === 'RESOLVED').length;

  return (
    <div className={`flex min-h-full flex-col pb-8 ${isDark ? 'bg-slate-900' : 'bg-slate-50'}`}>
      <div
        className={`sticky top-0 z-10 flex items-center gap-3 border-b px-4 py-3 pt-safe ${
          isDark ? 'border-slate-800 bg-slate-900/95' : 'border-slate-200 bg-white/95'
        } backdrop-blur-md`}
      >
        <button
          type="button"
          onClick={onBack}
          aria-label={lang === 'tr' ? 'Geri' : 'Back'}
          className={`flex h-10 w-10 items-center justify-center rounded-xl transition active:scale-95 ${
            isDark ? 'bg-slate-800 text-slate-200' : 'bg-slate-100 text-slate-700'
          }`}
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className={`truncate text-base font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
            {t('home.reports.title', lang)}
          </h1>
          {!loading && !loadError && (
            <p className={`text-xs ${muted}`}>{t('home.reports.count', lang, { n: totalMyReports })}</p>
          )}
        </div>
      </div>

      <div className="flex-1 px-4 pt-4">
        {loading ? (
          <LoadingState isDark={isDark} rows={3} />
        ) : loadError ? (
          <ErrorState
            isDark={isDark}
            title={lang === 'tr' ? 'Yükleme başarısız' : 'Failed to load'}
            description={loadError}
            onRetry={() => void loadReports()}
            retryLabel={lang === 'tr' ? 'Tekrar dene' : 'Try again'}
          />
        ) : isEmpty ? (
          <EmptyState
            isDark={isDark}
            icon={<HardHat className="h-10 w-10" />}
            title={t('home.reports.empty.title', lang)}
            description={t('home.reports.empty.desc', lang)}
            action={
              onCreateReport ? (
                <button
                  type="button"
                  onClick={onCreateReport}
                  className="inline-flex min-h-11 items-center justify-center rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white shadow-sm active:scale-[0.98]"
                >
                  {lang === 'tr' ? 'Yeni ihbar oluştur' : 'Create a new report'}
                </button>
              ) : undefined
            }
          />
        ) : (
          <>
            <div className={`mb-3 grid grid-cols-3 gap-2 rounded-2xl border p-3 ${card}`}>
              {[
                { label: lang === 'tr' ? 'Bekleyen' : 'Pending', value: pendingCount },
                { label: lang === 'tr' ? 'İşlemde' : 'In progress', value: processingCount },
                { label: lang === 'tr' ? 'Çözülen' : 'Resolved', value: resolvedCount },
              ].map((item) => (
                <div key={item.label} className="text-center">
                  <p className={`text-[10px] font-bold uppercase tracking-wide ${muted}`}>{item.label}</p>
                  <p className={`mt-0.5 text-lg font-black tabular-nums ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    {item.value}
                  </p>
                </div>
              ))}
            </div>
          <ul className="space-y-2">
            {sortedReports.map((report, idx) => (
              <li key={report.id}>
                <motion.button
                  type="button"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(idx * 0.03, 0.2) }}
                  onClick={() => onOpenReport?.(report.id)}
                  disabled={!onOpenReport}
                  className={`w-full rounded-2xl border p-4 text-left transition active:scale-[0.99] disabled:cursor-default ${card} ${
                    onOpenReport ? (isDark ? 'hover:border-slate-600' : 'hover:border-slate-300') : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`shrink-0 rounded-xl p-2.5 ${isDark ? 'bg-slate-900 text-slate-400' : 'bg-slate-50 text-slate-600'}`}
                    >
                      {getCategoryIcon(report.categoryName)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={`truncate font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        {report.title}
                      </p>
                      <p className={`mt-0.5 truncate text-xs ${muted}`}>{report.categoryName}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span className={`inline-flex items-center gap-1 text-[10px] ${muted}`}>
                          <Clock className="h-3 w-3" />
                          {new Date(report.createdAt).toLocaleDateString(
                            lang === 'tr' ? 'tr-TR' : lang === 'ar' ? 'ar' : 'en-US',
                            { day: 'numeric', month: 'short' },
                          )}
                        </span>
                        <StatusBadge status={report.status} lang={lang} />
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <SlaIndicator createdAt={report.createdAt} aiSlaRisk={report.aiSlaRisk} lang={lang} compact />
                      {report.aiPriority && <AiPriorityBadge priority={report.aiPriority} lang={lang} />}
                    </div>
                  </div>
                </motion.button>
              </li>
            ))}
          </ul>
          </>
        )}
      </div>
    </div>
  );
}
