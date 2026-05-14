import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Filter, RefreshCw } from 'lucide-react';
import api, { type ReportListItem, type SpringPage } from '../api';

const STATUS_OPTIONS = [
  { value: '', label: 'Tüm durumlar' },
  { value: 'PENDING', label: 'Bekleyen' },
  { value: 'PROCESSING', label: 'İşleniyor' },
  { value: 'RESOLVED', label: 'Çözüldü' },
  { value: 'REJECTED', label: 'Reddedildi' },
];

const badge = (status: string) => {
  switch (status) {
    case 'PENDING':
      return 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200';
    case 'PROCESSING':
      return 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-200';
    case 'RESOLVED':
      return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200';
    case 'REJECTED':
      return 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200';
    default:
      return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200';
  }
};

export default function ReportsPage() {
  const [page, setPage] = useState(0);
  const [size] = useState(15);
  const [status, setStatus] = useState('');
  const [data, setData] = useState<SpringPage<ReportListItem> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string | number> = { page, size, sort: 'createdAt,desc' };
      if (status) params.status = status;
      const res = await api.get('/reports', { params });
      setData(res.data.data as SpringPage<ReportListItem>);
    } catch {
      setError('Raporlar yüklenemedi.');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [page, size, status]);

  useEffect(() => {
    queueMicrotask(() => {
      void load();
    });
  }, [load]);

  const totalPages = data?.totalPages ?? 0;
  const rows = data?.content ?? [];

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">İş listesi</p>
          <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">Raporlar</h2>
          <p className="mt-1 text-sm font-medium text-slate-600 dark:text-slate-400">Tüm ihbarlar, sayfalama ve filtre.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Filter className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(0);
              }}
              className="appearance-none rounded-xl border border-slate-200/90 bg-white py-2.5 pl-10 pr-8 text-sm font-semibold text-slate-800 shadow-sm focus:ring-2 focus:ring-primary dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value || 'all'} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={() => load()}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200/90 bg-white px-4 py-2.5 text-sm font-semibold shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Yenile
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        {error && <div className="border-b border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">{error}</div>}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200/80 bg-slate-50/90 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-400">
                <th className="px-4 py-4">Başlık</th>
                <th className="px-4 py-4">Kategori</th>
                <th className="px-4 py-4">İlçe</th>
                <th className="px-4 py-4">Durum</th>
                <th className="px-4 py-4">Tarih</th>
                <th className="px-4 py-4 text-right">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading && rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-16 text-center text-slate-500">
                    Yükleniyor…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-16 text-center text-slate-500">
                    Kayıt bulunamadı.
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                    <td className="max-w-[220px] truncate px-4 py-3 font-medium text-slate-900 dark:text-white">{r.title}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{r.categoryName}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{r.district ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${badge(r.status)}`}>{r.status}</span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-500 dark:text-slate-400">
                      {r.createdAt ? new Date(r.createdAt).toLocaleString('tr-TR') : '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        to={`/reports/${r.id}`}
                        className="text-xs font-bold text-primary hover:underline"
                      >
                        Detay
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {data && totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 dark:border-slate-800">
            <p className="text-xs text-slate-500">
              Toplam {data.totalElements} kayıt — sayfa {page + 1} / {totalPages}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={page <= 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold disabled:opacity-40 dark:border-slate-700"
              >
                <ChevronLeft className="h-4 w-4" />
                Önceki
              </button>
              <button
                type="button"
                disabled={page >= totalPages - 1}
                onClick={() => setPage((p) => p + 1)}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold disabled:opacity-40 dark:border-slate-700"
              >
                Sonraki
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
