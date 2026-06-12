import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, FileText, ChevronRight, MapPin, Tag, Clock } from 'lucide-react';
import api, { type ReportListItem } from '../api';

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Beklemede',
  PROCESSING: 'İşlemde',
  RESOLVED: 'Çözüldü',
  REJECTED: 'Reddedildi',
  OUT_OF_JURISDICTION: 'Yetki Dışı',
};

const STATUS_CLASSES: Record<string, string> = {
  PENDING: 'bg-amber-50 text-amber-700 ring-1 ring-amber-600/15 dark:bg-amber-950/30 dark:text-amber-200',
  PROCESSING: 'bg-sky-50 text-sky-700 ring-1 ring-sky-600/15 dark:bg-sky-950/40 dark:text-sky-200',
  RESOLVED: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/15 dark:bg-emerald-950/30 dark:text-emerald-200',
  REJECTED: 'bg-rose-50 text-rose-700 ring-1 ring-rose-600/15 dark:bg-rose-950/30 dark:text-rose-200',
  OUT_OF_JURISDICTION: 'bg-purple-50 text-purple-700 ring-1 ring-purple-600/15 dark:bg-purple-950/30 dark:text-purple-200',
};

export default function SuperAdminRecentReportsPage() {
  const [reports, setReports] = useState<ReportListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    api
      .get('/reports', { params: { page: 0, size: 100, sort: 'createdAt,desc' } })
      .then((res) => {
        setReports((res.data.data?.content ?? []) as ReportListItem[]);
      })
      .catch(() => {
        setError('Sistem genelindeki ihbarlar yüklenemedi.');
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-8 p-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <Link
            to="/"
            className="mb-3 inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline dark:text-sky-400"
          >
            <ArrowLeft size={14} />
            Platform yönetimi
          </Link>
          <p className="kentiva-eyebrow">Sistem Geneli</p>
          <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Son 100 İhbar
          </h2>
          <p className="mt-2 max-w-2xl text-sm font-medium text-slate-600 dark:text-slate-400">
            Tüm belediyelerden sisteme düşen en son ihbarlar ve güncel durumları.
          </p>
        </div>
        <div>
          <button
            onClick={load}
            disabled={loading}
            className="kentiva-btn-secondary text-xs"
          >
            Yenile
          </button>
        </div>
      </div>

      {error && (
        <div className="kentiva-alert-error">
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        {loading ? (
          <div className="p-12 text-center text-sm font-medium text-slate-500 dark:text-slate-400">
            <Clock className="mx-auto mb-3 h-6 w-6 animate-spin text-primary dark:text-sky-400" />
            İhbarlar yükleniyor...
          </div>
        ) : reports.length === 0 ? (
          <div className="kentiva-empty p-12">
            <FileText className="mx-auto mb-3 h-10 w-10 text-slate-400" />
            Henüz sisteme düşmüş herhangi bir ihbar bulunmuyor.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[950px] text-sm text-left">
              <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-500 dark:bg-slate-850 dark:text-slate-400 border-b border-slate-200/90 dark:border-slate-800">
                <tr>
                  <th className="p-4 pl-6">İhbar</th>
                  <th className="p-4">Belediye</th>
                  <th className="p-4">Kategori</th>
                  <th className="p-4">Bölge / İlçe</th>
                  <th className="p-4">Durum</th>
                  <th className="p-4">Tarih</th>
                  <th className="p-4 pr-6 text-right">Detay</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {reports.map((r) => (
                  <tr
                    key={r.id}
                    className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="p-4 pl-6 font-semibold text-slate-950 dark:text-slate-100">
                      <div className="max-w-xs truncate" title={r.title}>
                        {r.title}
                      </div>
                      <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500 block mt-0.5">
                        #{r.id.slice(0, 8)}
                      </span>
                    </td>
                    <td className="p-4 text-slate-700 dark:text-slate-300 font-medium">
                      {r.municipalityName || '—'}
                    </td>
                    <td className="p-4 text-slate-600 dark:text-slate-400">
                      <span className="inline-flex items-center gap-1">
                        <Tag size={12} className="opacity-70" />
                        {r.categoryName}
                      </span>
                    </td>
                    <td className="p-4 text-slate-600 dark:text-slate-400">
                      <span className="inline-flex items-center gap-1">
                        <MapPin size={12} className="opacity-70 text-slate-500" />
                        {r.district || 'Belirtilmedi'}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className={`kentiva-status-badge ${STATUS_CLASSES[r.status] || ''}`}>
                        {STATUS_LABELS[r.status] || r.status}
                      </span>
                    </td>
                    <td className="p-4 text-slate-500 dark:text-slate-400 tabular-nums">
                      {r.createdAt ? new Date(r.createdAt).toLocaleString('tr-TR') : '—'}
                    </td>
                    <td className="p-4 pr-6 text-right">
                      <Link
                        to={`/reports/${r.id}`}
                        className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:text-primary-hover dark:text-sky-400 dark:hover:text-sky-300"
                      >
                        İncele
                        <ChevronRight size={14} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
