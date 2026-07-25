import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CalendarClock,
  Clock3,
  Download,
  PlayCircle,
  Plus,
  RefreshCw,
  Trash2,
  X,
} from 'lucide-react';
import axios from 'axios';
import api, {
  type CreateExportScheduleRequest,
  type ExportFormat,
  type ExportFrequency,
  type ExportRun,
  type ExportSchedule,
  type SpringPage,
} from '../api';
import { downloadBlobResponse } from '../lib/downloadExport';
import LoadingState from '../components/ui/LoadingState';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import Toast, { type ToastState } from '../components/ui/Toast';

const FORMAT_LABELS: Record<ExportFormat, string> = { EXCEL: 'Excel', PDF: 'PDF' };
const FREQUENCY_LABELS: Record<ExportFrequency, string> = { DAILY: 'Günlük', WEEKLY: 'Haftalık' };

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('tr-TR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function statusBadge(status: ExportRun['status']) {
  return status === 'SUCCESS'
    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200'
    : 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-200';
}

export default function ScheduledExportsPage({ embedded = false }: { embedded?: boolean }) {
  const [schedules, setSchedules] = useState<ExportSchedule[]>([]);
  const [runs, setRuns] = useState<ExportRun[]>([]);
  const [runsPage, setRunsPage] = useState(0);
  const [runsTotalPages, setRunsTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scopeError, setScopeError] = useState<string | null>(null);
  const [canManage, setCanManage] = useState(false);
  const [municipalityName, setMunicipalityName] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [toast, setToast] = useState<ToastState>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [runningScheduleId, setRunningScheduleId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ExportSchedule | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [format, setFormat] = useState<ExportFormat>('EXCEL');
  const [frequency, setFrequency] = useState<ExportFrequency>('DAILY');
  const [hourOfDay, setHourOfDay] = useState(6);

  const loadData = useCallback(async () => {
    setError(null);
    setScopeError(null);
    try {
      const [schedRes, runsRes] = await Promise.all([
        api.get('/export/schedules'),
        api.get('/export/schedules/runs', { params: { page: runsPage, size: 15, sort: 'createdAt,desc' } }),
      ]);
      setSchedules(schedRes.data.data as ExportSchedule[]);
      const page = runsRes.data.data as SpringPage<ExportRun>;
      setRuns(page.content ?? []);
      setRunsTotalPages(page.totalPages ?? 0);
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const code = (err.response?.data as { code?: string } | undefined)?.code;
        const message = (err.response?.data as { message?: string } | undefined)?.message;
        if (code === 'MUNICIPALITY_REQUIRED' || err.response?.status === 403) {
          setScopeError(message ?? 'Planlı dışa aktarma yalnızca belediye hesapları için kullanılabilir.');
          setSchedules([]);
          setRuns([]);
          return;
        }
      }
      setError('Veriler yüklenemedi. Lütfen sayfayı yenileyin.');
    }
  }, [runsPage]);

  useEffect(() => {
    api
      .get('/auth/me')
      .then((res) => {
        const roles: string[] = res.data.data?.roles ?? [];
        setCanManage(roles.includes('ROLE_ADMIN') || roles.includes('ROLE_SUPER_ADMIN'));
        setMunicipalityName(res.data.data?.municipality?.displayName ?? res.data.data?.municipality?.name ?? null);
      })
      .catch(() => {
        setCanManage(false);
        setMunicipalityName(null);
      });
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      await loadData();
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [loadData]);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 4500);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const activeCount = useMemo(() => schedules.filter((schedule) => schedule.enabled).length, [schedules]);
  const successCount = useMemo(() => runs.filter((run) => run.status === 'SUCCESS').length, [runs]);
  const failureCount = useMemo(() => runs.filter((run) => run.status === 'FAILED').length, [runs]);

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError('');
    setSaving(true);
    try {
      const body: CreateExportScheduleRequest = { format, frequency, hourOfDay };
      await api.post('/export/schedules', body);
      setModalOpen(false);
      setFormat('EXCEL');
      setFrequency('DAILY');
      setHourOfDay(6);
      await loadData();
      setToast({ type: 'success', message: 'Plan oluşturuldu.' });
    } catch (err: unknown) {
      setFormError(
        axios.isAxiosError(err)
          ? String((err.response?.data as { message?: string } | undefined)?.message ?? 'Plan oluşturulamadı.')
          : 'Plan oluşturulamadı.',
      );
    } finally {
      setSaving(false);
    }
  };

  const confirmDeleteSchedule = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/export/schedules/${deleteTarget.id}`);
      await loadData();
      setDeleteTarget(null);
      setToast({ type: 'success', message: 'Plan silindi.' });
    } catch {
      setToast({ type: 'error', message: 'Plan silinemedi.' });
    } finally {
      setDeleting(false);
    }
  };

  const handleRunNow = async (scheduleId: string) => {
    setRunningScheduleId(scheduleId);
    try {
      await api.post(`/export/schedules/${scheduleId}/run-now`);
      await loadData();
      setToast({ type: 'success', message: 'Export üretimi başlatıldı ve dosya hazırlandı.' });
    } catch (err: unknown) {
      setToast({
        type: 'error',
        message:
          axios.isAxiosError(err)
            ? String((err.response?.data as { message?: string } | undefined)?.message ?? 'Export çalıştırılamadı.')
            : 'Export çalıştırılamadı.',
      });
    } finally {
      setRunningScheduleId(null);
    }
  };

  const handleDownload = async (run: ExportRun) => {
    if (run.status !== 'SUCCESS') return;
    setDownloadingId(run.id);
    try {
      const response = await api.get(`/export/schedules/runs/${run.id}/download`, { responseType: 'blob' });
      await downloadBlobResponse(response, run.fileName || 'kentiva-export.xlsx');
    } catch (err: unknown) {
      setToast({
        type: 'error',
        message: err instanceof Error ? err.message : 'Dosya indirilemedi.',
      });
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className={embedded ? 'space-y-6' : 'space-y-6 p-6'}>
      <Toast toast={toast} onDismiss={() => setToast(null)} />

      {!embedded && (
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="kentiva-eyebrow">Dışa aktarma merkezi</p>
            <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Planlı export operasyonu
            </h2>
            <p className="mt-1 max-w-2xl text-sm font-medium text-slate-600 dark:text-slate-400">
              Excel ve PDF çıktılarını otomatik üretin, koşu geçmişini izleyin ve hata durumlarını tek yerden yönetin.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void loadData()}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200/90 bg-white px-4 py-2.5 text-sm font-semibold shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800"
            >
              <RefreshCw className="h-4 w-4" />
              Yenile
            </button>
            {canManage && !scopeError && (
              <button
                type="button"
                onClick={() => {
                  setFormError('');
                  setModalOpen(true);
                }}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary-hover"
              >
                <Plus className="h-4 w-4" />
                Yeni plan
              </button>
            )}
          </div>
        </div>
      )}

      {embedded && (
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => void loadData()}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200/90 bg-white px-4 py-2.5 text-sm font-semibold shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800"
          >
            <RefreshCw className="h-4 w-4" />
            Yenile
          </button>
          {canManage && !scopeError && (
            <button
              type="button"
              onClick={() => {
                setFormError('');
                setModalOpen(true);
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary-hover"
            >
              <Plus className="h-4 w-4" />
              Yeni plan
            </button>
          )}
        </div>
      )}

      {municipalityName && (
        <div className="rounded-3xl border border-primary/20 bg-primary/5 px-5 py-4 dark:border-primary/30 dark:bg-primary/10">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">Kapsam</p>
          <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">{municipalityName}</p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Tüm planlar ve dosyalar aktif belediye tenant'ı kapsamında üretilir.
          </p>
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-3">
        <SummaryCard label="Aktif plan" value={String(activeCount)} helper="Çalışan otomasyonlar" />
        <SummaryCard label="Hazır dosya" value={String(successCount)} helper="İndirilebilir export koşuları" />
        <SummaryCard label="Hata" value={String(failureCount)} helper="Müdahale gerektiren koşular" danger={failureCount > 0} />
      </div>

      {scopeError && (
        <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100">
          {scopeError}
        </p>
      )}

      {error && (
        <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200">
          {error}
        </p>
      )}

      {!scopeError &&
        (loading ? (
          <div className="rounded-3xl border border-slate-200/90 bg-white px-6 py-12 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <LoadingState label="Veriler yükleniyor…" />
          </div>
        ) : (
          <>
            <section className="rounded-3xl border border-slate-200/90 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="mb-4 flex items-center gap-2">
                <CalendarClock className="h-4 w-4 text-primary" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Aktif planlar</h3>
              </div>

              {schedules.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                  Henüz planlı dışa aktarma yok.
                </p>
              ) : (
                <div className="grid gap-4 xl:grid-cols-2">
                  {schedules.map((schedule) => (
                    <div
                      key={schedule.id}
                      className="rounded-2xl border border-slate-200/90 bg-slate-50/70 p-4 dark:border-slate-700 dark:bg-slate-950/50"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                              {FORMAT_LABELS[schedule.format]}
                            </span>
                            <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-primary">
                              {FREQUENCY_LABELS[schedule.frequency]}
                            </span>
                          </div>
                          <p className="mt-3 text-sm font-semibold text-slate-900 dark:text-white">
                            Saat {String(schedule.hourOfDay).padStart(2, '0')}:00
                          </p>
                          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                            Son koşu: {formatDateTime(schedule.lastRunAt)}
                          </p>
                          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                            Sonraki koşu: {formatDateTime(schedule.nextRunAt)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${
                              schedule.enabled
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200'
                                : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                            }`}
                          >
                            {schedule.enabled ? 'Aktif' : 'Pasif'}
                          </span>
                          {canManage && (
                            <>
                              <button
                                type="button"
                                onClick={() => void handleRunNow(schedule.id)}
                                disabled={runningScheduleId === schedule.id}
                                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                              >
                                <PlayCircle className={`h-3.5 w-3.5 ${runningScheduleId === schedule.id ? 'animate-pulse' : ''}`} />
                                {runningScheduleId === schedule.id ? 'Çalışıyor' : 'Hemen üret'}
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeleteTarget(schedule)}
                                className="rounded-xl p-2 text-slate-500 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/30"
                                title="Sil"
                                aria-label="Planı sil"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="rounded-3xl border border-slate-200/90 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="mb-4 flex items-center gap-2">
                <Download className="h-4 w-4 text-primary" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Koşu geçmişi</h3>
              </div>

              {runs.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                  Henüz üretilmiş dosya yok.
                </p>
              ) : (
                <div className="space-y-3">
                  {runs.map((run) => (
                    <article
                      key={run.id}
                      className="rounded-2xl border border-slate-200/90 bg-slate-50/70 p-4 dark:border-slate-700 dark:bg-slate-950/50"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${statusBadge(run.status)}`}>
                              {run.status === 'SUCCESS' ? 'Hazır' : 'Hatalı'}
                            </span>
                            <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                              {FORMAT_LABELS[run.format]}
                            </span>
                          </div>
                          <p className="mt-3 truncate text-sm font-semibold text-slate-900 dark:text-white" title={run.fileName}>
                            {run.fileName}
                          </p>
                          <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                            <span>{formatBytes(run.byteSize)}</span>
                            <span>{formatDateTime(run.createdAt)}</span>
                            {run.municipalityName ? <span>{run.municipalityName}</span> : null}
                          </div>
                          {run.status === 'FAILED' && run.errorMessage && (
                            <p className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700 dark:border-rose-800 dark:bg-rose-950/30 dark:text-rose-200">
                              {run.errorMessage}
                            </p>
                          )}
                        </div>
                        {run.status === 'SUCCESS' ? (
                          <button
                            type="button"
                            onClick={() => void handleDownload(run)}
                            disabled={downloadingId === run.id}
                            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white hover:bg-primary-hover disabled:opacity-60"
                          >
                            <Download className="h-3.5 w-3.5" />
                            {downloadingId === run.id ? 'İniyor' : 'İndir'}
                          </button>
                        ) : (
                          <div className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-white px-3 py-2 text-xs font-semibold text-rose-700 dark:border-rose-900 dark:bg-slate-900 dark:text-rose-200">
                            <Clock3 className="h-3.5 w-3.5" />
                            Tekrar koşulması gerekir
                          </div>
                        )}
                      </div>
                    </article>
                  ))}

                  {runsTotalPages > 1 && (
                    <div className="flex items-center justify-between border-t border-slate-100 pt-3 dark:border-slate-800">
                      <button
                        type="button"
                        disabled={runsPage <= 0}
                        onClick={() => setRunsPage((page) => Math.max(0, page - 1))}
                        className="rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40 dark:text-slate-400 dark:hover:bg-slate-800"
                      >
                        Önceki
                      </button>
                      <span className="text-xs font-medium text-slate-500">
                        Sayfa {runsPage + 1} / {runsTotalPages}
                      </span>
                      <button
                        type="button"
                        disabled={runsPage >= runsTotalPages - 1}
                        onClick={() => setRunsPage((page) => page + 1)}
                        className="rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40 dark:text-slate-400 dark:hover:bg-slate-800"
                      >
                        Sonraki
                      </button>
                    </div>
                  )}
                </div>
              )}
            </section>
          </>
        ))}

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/55 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-slate-200/90 bg-white p-6 shadow-xl dark:border-slate-700 dark:bg-slate-900">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">Yeni plan</p>
                <h3 className="mt-1 text-lg font-bold text-slate-900 dark:text-white">Planlı export oluştur</h3>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-lg p-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <label className="block text-sm">
                <span className="mb-1.5 block font-semibold text-slate-700 dark:text-slate-300">Format</span>
                <select
                  value={format}
                  onChange={(event) => setFormat(event.target.value as ExportFormat)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                >
                  <option value="EXCEL">Excel (.xlsx)</option>
                  <option value="PDF">PDF</option>
                </select>
              </label>

              <label className="block text-sm">
                <span className="mb-1.5 block font-semibold text-slate-700 dark:text-slate-300">Sıklık</span>
                <select
                  value={frequency}
                  onChange={(event) => setFrequency(event.target.value as ExportFrequency)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                >
                  <option value="DAILY">Günlük</option>
                  <option value="WEEKLY">Haftalık (Pazartesi)</option>
                </select>
              </label>

              <label className="block text-sm">
                <span className="mb-1.5 block font-semibold text-slate-700 dark:text-slate-300">Çalışma saati (0-23)</span>
                <input
                  type="number"
                  min={0}
                  max={23}
                  value={hourOfDay}
                  onChange={(event) => setHourOfDay(Number(event.target.value))}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  required
                />
              </label>

              <p className="text-xs text-slate-500 dark:text-slate-400">
                Planlar Europe/Istanbul saat diliminde çalışır. Haftalık planlar Pazartesi günü tetiklenir.
              </p>

              {formError && <p className="text-sm font-medium text-rose-600 dark:text-rose-400">{formError}</p>}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 rounded-xl bg-primary py-2.5 text-sm font-semibold text-white hover:bg-primary-hover disabled:opacity-60"
                >
                  {saving ? 'Kaydediliyor...' : 'Oluştur'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Planı sil"
        message="Bu planı silmek istediğinize emin misiniz?"
        confirmLabel="Sil"
        tone="danger"
        busy={deleting}
        onConfirm={() => void confirmDeleteSchedule()}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

function SummaryCard({
  label,
  value,
  helper,
  danger,
}: {
  label: string;
  value: string;
  helper: string;
  danger?: boolean;
}) {
  return (
    <div className="rounded-3xl border border-slate-200/90 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">{label}</p>
      <p className={`mt-2 text-3xl font-black tracking-tight ${danger ? 'text-rose-600' : 'text-slate-900 dark:text-white'}`}>{value}</p>
      <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">{helper}</p>
    </div>
  );
}
