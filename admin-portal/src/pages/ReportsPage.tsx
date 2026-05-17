import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  Filter,
  RefreshCw,
  UserPlus,
  X,
} from 'lucide-react';
import axios from 'axios';
import api, { type BulkReportOperationResult, type ReportListItem, type SpringPage, type User } from '../api';

const STATUS_OPTIONS = [
  { value: '', label: 'Tüm durumlar' },
  { value: 'PENDING', label: 'Bekleyen' },
  { value: 'PROCESSING', label: 'İşleniyor' },
  { value: 'RESOLVED', label: 'Çözüldü' },
  { value: 'REJECTED', label: 'Reddedildi' },
];

const BULK_STATUS_OPTIONS = [
  { value: 'PROCESSING', label: 'İşleniyor' },
  { value: 'RESOLVED', label: 'Çözüldü' },
  { value: 'REJECTED', label: 'Reddedildi' },
];

type BulkModal = 'assign' | 'status' | 'export' | null;
type Toast = { type: 'success' | 'error'; message: string } | null;

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

function hasAnyRole(roles: string[], allowed: string[]) {
  return roles.some((r) => allowed.includes(r));
}

export default function ReportsPage() {
  const [page, setPage] = useState(0);
  const [size] = useState(15);
  const [status, setStatus] = useState('');
  const [data, setData] = useState<SpringPage<ReportListItem> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [roles, setRoles] = useState<string[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [modal, setModal] = useState<BulkModal>(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [toast, setToast] = useState<Toast>(null);
  const [officers, setOfficers] = useState<User[]>([]);
  const [assigneeId, setAssigneeId] = useState('');
  const [bulkStatus, setBulkStatus] = useState('PROCESSING');
  const [bulkNote, setBulkNote] = useState('');
  const [exportFormat, setExportFormat] = useState<'excel' | 'pdf'>('excel');

  const canAssign = hasAnyRole(roles, ['ROLE_DEPT_MANAGER', 'ROLE_ADMIN', 'ROLE_SUPER_ADMIN']);
  const canChangeStatus = hasAnyRole(roles, [
    'ROLE_FIELD_OFFICER',
    'ROLE_DEPT_MANAGER',
    'ROLE_ADMIN',
    'ROLE_SUPER_ADMIN',
  ]);
  const canExport = hasAnyRole(roles, ['ROLE_DEPT_MANAGER', 'ROLE_ADMIN', 'ROLE_SUPER_ADMIN']);

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

  useEffect(() => {
    api
      .get('/auth/me')
      .then((res) => setRoles(res.data.data?.roles ?? []))
      .catch(() => setRoles([]));
  }, []);

  useEffect(() => {
    if (!canAssign) return;
    api
      .get('/users', { params: { role: 'ROLE_FIELD_OFFICER' } })
      .then((res) => setOfficers(res.data.data as User[]))
      .catch(() => setOfficers([]));
  }, [canAssign]);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 5000);
    return () => window.clearTimeout(t);
  }, [toast]);

  const totalPages = data?.totalPages ?? 0;
  const rows = data?.content ?? [];
  const selectedCount = selected.size;

  const pageIds = useMemo(() => rows.map((r) => r.id), [rows]);
  const allOnPageSelected = rows.length > 0 && pageIds.every((id) => selected.has(id));
  const someOnPageSelected = pageIds.some((id) => selected.has(id));

  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const togglePage = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allOnPageSelected) {
        pageIds.forEach((id) => next.delete(id));
      } else {
        pageIds.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  const clearSelection = () => setSelected(new Set());

  const showToast = (type: 'success' | 'error', message: string) => setToast({ type, message });

  const applyBulkResult = (result: BulkReportOperationResult, okLabel: string) => {
    if (result.failureCount === 0) {
      showToast('success', `${result.successCount} ${okLabel}`);
    } else if (result.successCount === 0) {
      const detail = result.failures[0]?.message ?? 'İşlem başarısız.';
      showToast('error', `Hiçbiri işlenemedi. ${detail}`);
    } else {
      showToast(
        'error',
        `${result.successCount} başarılı, ${result.failureCount} başarısız. İlk hata: ${result.failures[0]?.message ?? '—'}`,
      );
    }
    clearSelection();
    void load();
  };

  const runBulkAssign = async () => {
    if (!assigneeId || selectedCount === 0) return;
    setBulkBusy(true);
    try {
      const res = await api.post('/reports/batch/assign', {
        reportIds: [...selected],
        assigneeId,
      });
      applyBulkResult(res.data.data as BulkReportOperationResult, 'rapor atandı');
      setModal(null);
      setAssigneeId('');
    } catch (err: unknown) {
      const msg = axios.isAxiosError(err)
        ? String((err.response?.data as { message?: string } | undefined)?.message ?? 'Toplu atama başarısız.')
        : 'Toplu atama başarısız.';
      showToast('error', msg);
    } finally {
      setBulkBusy(false);
    }
  };

  const runBulkStatus = async () => {
    if (selectedCount === 0) return;
    setBulkBusy(true);
    try {
      const res = await api.patch('/reports/batch/status', {
        reportIds: [...selected],
        status: bulkStatus,
        note: bulkNote.trim() || null,
      });
      applyBulkResult(res.data.data as BulkReportOperationResult, 'rapor güncellendi');
      setModal(null);
      setBulkNote('');
    } catch (err: unknown) {
      const msg = axios.isAxiosError(err)
        ? String((err.response?.data as { message?: string } | undefined)?.message ?? 'Toplu durum güncellemesi başarısız.')
        : 'Toplu durum güncellemesi başarısız.';
      showToast('error', msg);
    } finally {
      setBulkBusy(false);
    }
  };

  const runBulkExport = async () => {
    if (selectedCount === 0) return;
    setBulkBusy(true);
    try {
      const path = exportFormat === 'excel' ? '/export/reports/excel' : '/export/reports/pdf';
      const params = new URLSearchParams();
      [...selected].forEach((id) => params.append('reportIds', id));
      const res = await api.get(`${path}?${params.toString()}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `kentiva-secili-${new Date().toISOString().slice(0, 10)}.${exportFormat === 'excel' ? 'xlsx' : 'pdf'}`;
      a.click();
      window.URL.revokeObjectURL(url);
      showToast('success', `${selectedCount} rapor dışa aktarıldı.`);
      setModal(null);
    } catch {
      showToast('error', 'Dışa aktarma başarısız oldu.');
    } finally {
      setBulkBusy(false);
    }
  };

  const colSpan = 7;

  return (
    <div className="space-y-6 p-6">
      {toast && (
        <div
          role="status"
          className={`fixed right-6 top-20 z-50 flex max-w-md items-start gap-2 rounded-xl border px-4 py-3 text-sm font-semibold shadow-lg ${
            toast.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-100'
              : 'border-red-200 bg-red-50 text-red-900 dark:border-red-800 dark:bg-red-950/80 dark:text-red-100'
          }`}
        >
          {toast.type === 'success' ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> : null}
          <span>{toast.message}</span>
          <button type="button" onClick={() => setToast(null)} className="ml-2 opacity-60 hover:opacity-100">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">İş listesi</p>
          <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">Raporlar</h2>
          <p className="mt-1 text-sm font-medium text-slate-600 dark:text-slate-400">
            Tüm ihbarlar, sayfalama, filtre ve toplu işlemler.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Filter className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(0);
                clearSelection();
              }}
              disabled={bulkBusy}
              className="appearance-none rounded-xl border border-slate-200/90 bg-white py-2.5 pl-10 pr-8 text-sm font-semibold text-slate-800 shadow-sm focus:ring-2 focus:ring-primary disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
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
            disabled={bulkBusy}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200/90 bg-white px-4 py-2.5 text-sm font-semibold shadow-sm hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Yenile
          </button>
        </div>
      </div>

      {selectedCount > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-primary/25 bg-primary/5 px-4 py-3 dark:border-primary/30 dark:bg-primary/10">
          <span className="text-sm font-bold text-primary">{selectedCount} seçili</span>
          {canAssign && (
            <button
              type="button"
              disabled={bulkBusy}
              onClick={() => setModal('assign')}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-white hover:bg-primary-hover disabled:opacity-50"
            >
              <UserPlus className="h-3.5 w-3.5" />
              Ata
            </button>
          )}
          {canChangeStatus && (
            <button
              type="button"
              disabled={bulkBusy}
              onClick={() => setModal('status')}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-800 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            >
              Durum değiştir
            </button>
          )}
          {canExport && (
            <button
              type="button"
              disabled={bulkBusy}
              onClick={() => setModal('export')}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-800 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            >
              <Download className="h-3.5 w-3.5" />
              Dışa aktar
            </button>
          )}
          <button
            type="button"
            disabled={bulkBusy}
            onClick={clearSelection}
            className="ml-auto text-xs font-semibold text-slate-500 hover:text-slate-800 disabled:opacity-50 dark:hover:text-slate-200"
          >
            Seçimi temizle
          </button>
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        {error && (
          <div className="border-b border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
            {error}
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200/80 bg-slate-50/90 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-400">
                <th className="w-10 px-3 py-4">
                  <input
                    type="checkbox"
                    checked={allOnPageSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = someOnPageSelected && !allOnPageSelected;
                    }}
                    onChange={togglePage}
                    disabled={rows.length === 0 || bulkBusy}
                    className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                    aria-label="Sayfadaki tümünü seç"
                  />
                </th>
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
                  <td colSpan={colSpan} className="px-4 py-16 text-center text-slate-500">
                    Yükleniyor…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={colSpan} className="px-4 py-16 text-center text-slate-500">
                    Kayıt bulunamadı.
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr
                    key={r.id}
                    className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 ${selected.has(r.id) ? 'bg-primary/5 dark:bg-primary/10' : ''}`}
                  >
                    <td className="px-3 py-3">
                      <input
                        type="checkbox"
                        checked={selected.has(r.id)}
                        onChange={() => toggleOne(r.id)}
                        disabled={bulkBusy}
                        className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                        aria-label={`${r.title} seç`}
                      />
                    </td>
                    <td className="max-w-[220px] truncate px-4 py-3 font-medium text-slate-900 dark:text-white">{r.title}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{r.categoryName}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{r.district ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${badge(r.status)}`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-500 dark:text-slate-400">
                      {r.createdAt ? new Date(r.createdAt).toLocaleString('tr-TR') : '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link to={`/reports/${r.id}`} className="text-xs font-bold text-primary hover:underline">
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
                disabled={page <= 0 || bulkBusy}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold disabled:opacity-40 dark:border-slate-700"
              >
                <ChevronLeft className="h-4 w-4" />
                Önceki
              </button>
              <button
                type="button"
                disabled={page >= totalPages - 1 || bulkBusy}
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

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xl dark:border-slate-700 dark:bg-slate-900">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                {modal === 'assign' && 'Toplu atama'}
                {modal === 'status' && 'Toplu durum güncelle'}
                {modal === 'export' && 'Seçili raporları dışa aktar'}
              </h3>
              <button
                type="button"
                disabled={bulkBusy}
                onClick={() => setModal(null)}
                className="rounded-lg p-1 text-slate-500 hover:bg-slate-100 disabled:opacity-50 dark:hover:bg-slate-800"
              >
                <X size={20} />
              </button>
            </div>

            <p className="mb-4 text-sm text-slate-600 dark:text-slate-400">
              <span className="font-bold text-slate-900 dark:text-white">{selectedCount}</span> rapor için işlem
              onaylıyor musunuz?
            </p>

            {modal === 'assign' && (
              <label className="mb-4 block text-sm">
                <span className="mb-1.5 block font-semibold text-slate-700 dark:text-slate-300">Saha görevlisi</span>
                <select
                  value={assigneeId}
                  onChange={(e) => setAssigneeId(e.target.value)}
                  disabled={bulkBusy}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                >
                  <option value="">Seçin…</option>
                  {officers.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.firstName} {o.lastName}
                    </option>
                  ))}
                </select>
              </label>
            )}

            {modal === 'status' && (
              <div className="mb-4 space-y-3">
                <label className="block text-sm">
                  <span className="mb-1.5 block font-semibold text-slate-700 dark:text-slate-300">Yeni durum</span>
                  <select
                    value={bulkStatus}
                    onChange={(e) => setBulkStatus(e.target.value)}
                    disabled={bulkBusy}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  >
                    {BULK_STATUS_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-sm">
                  <span className="mb-1.5 block font-semibold text-slate-700 dark:text-slate-300">Not (isteğe bağlı)</span>
                  <textarea
                    value={bulkNote}
                    onChange={(e) => setBulkNote(e.target.value)}
                    disabled={bulkBusy}
                    rows={2}
                    maxLength={500}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </label>
              </div>
            )}

            {modal === 'export' && (
              <label className="mb-4 block text-sm">
                <span className="mb-1.5 block font-semibold text-slate-700 dark:text-slate-300">Format</span>
                <select
                  value={exportFormat}
                  onChange={(e) => setExportFormat(e.target.value as 'excel' | 'pdf')}
                  disabled={bulkBusy}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                >
                  <option value="excel">Excel (.xlsx)</option>
                  <option value="pdf">PDF</option>
                </select>
              </label>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                disabled={bulkBusy}
                onClick={() => setModal(null)}
                className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                İptal
              </button>
              <button
                type="button"
                disabled={bulkBusy || (modal === 'assign' && !assigneeId)}
                onClick={() => {
                  if (modal === 'assign') void runBulkAssign();
                  else if (modal === 'status') void runBulkStatus();
                  else void runBulkExport();
                }}
                className="flex-1 rounded-xl bg-primary py-2.5 text-sm font-semibold text-white hover:bg-primary-hover disabled:opacity-60"
              >
                {bulkBusy ? 'İşleniyor…' : 'Onayla'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}