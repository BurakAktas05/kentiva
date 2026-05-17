import { useCallback, useEffect, useState } from 'react';
import { CalendarClock, Download, Plus, Trash2, X } from 'lucide-react';
import axios from 'axios';
import api, {
  type CreateExportScheduleRequest,
  type ExportFormat,
  type ExportFrequency,
  type ExportRun,
  type ExportSchedule,
  type SpringPage,
} from '../api';

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

export default function ScheduledExportsPage() {
  const [schedules, setSchedules] = useState<ExportSchedule[]>([]);
  const [runs, setRuns] = useState<ExportRun[]>([]);
  const [runsPage, setRunsPage] = useState(0);
  const [runsTotalPages, setRunsTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scopeError, setScopeError] = useState<string | null>(null);
  const [canManage, setCanManage] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
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
        const msg = (err.response?.data as { message?: string } | undefined)?.message;
        if (code === 'MUNICIPALITY_REQUIRED' || err.response?.status === 403) {
          setScopeError(msg ?? 'Planlı dışa aktarma yalnızca belediye hesapları için kullanılabilir.');
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
      })
      .catch(() => setCanManage(false));
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

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
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

  const handleDelete = async (id: string) => {
    if (!window.confirm('Bu planı silmek istediğinize emin misiniz?')) return;
    try {
      await api.delete(`/export/schedules/${id}`);
      await loadData();
    } catch {
      alert('Plan silinemedi.');
    }
  };

  const handleDownload = async (run: ExportRun) => {
    if (run.status !== 'SUCCESS') return;
    setDownloadingId(run.id);
    try {
      const res = await api.get(`/export/schedules/runs/${run.id}/download`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = run.fileName;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      alert('Dosya indirilemedi.');
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className="space-y-8 p-6">
      <PageHeader
        canManage={canManage && !scopeError}
        onNew={() => {
          setFormError('');
          setModalOpen(true);
        }}
      />

      {scopeError && (
        <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100">
          {scopeError}
        </p>
      )}

      {error && (
        <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
          {error}
        </p>
      )}

      {!scopeError &&
        (loading ? (
          <p className="text-sm text-slate-500">Yükleniyor…</p>
        ) : (
          <>
            <section className="rounded-2xl border border-slate-200/90 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center gap-2 border-b border-slate-100 px-6 py-4 dark:border-slate-800">
                <CalendarClock size={18} className="text-primary" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Aktif planlar</h3>
              </div>
              {schedules.length === 0 ? (
                <p className="px-6 pb-6 text-sm text-slate-500">Henüz planlı dışa aktarma yok.</p>
              ) : (
                <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                  {schedules.map((s) => (
                    <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 px-6 py-4">
                      <div>
                        <p className="font-semibold text-slate-900 dark:text-white">
                          {FORMAT_LABELS[s.format]} · {FREQUENCY_LABELS[s.frequency]}
                        </p>
                        <p className="text-xs text-slate-500">
                          Saat {String(s.hourOfDay).padStart(2, '0')}:00 · Son: {formatDateTime(s.lastRunAt)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                            s.enabled
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200'
                              : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                          }`}
                        >
                          {s.enabled ? 'Aktif' : 'Pasif'}
                        </span>
                        {canManage && (
                          <button
                            type="button"
                            onClick={() => handleDelete(s.id)}
                            className="rounded-lg p-2 text-slate-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30"
                            title="Sil"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="rounded-2xl border border-slate-200/90 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center gap-2 border-b border-slate-100 px-6 py-4 dark:border-slate-800">
                <Download size={18} className="text-primary" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Tamamlanan dosyalar</h3>
              </div>
              {runs.length === 0 ? (
                <p className="px-6 pb-6 text-sm text-slate-500">Henüz üretilmiş dosya yok.</p>
              ) : (
                <>
                  <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                    {runs.map((r) => (
                      <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 px-6 py-4">
                        <div className="min-w-0">
                          <p className="truncate font-medium text-slate-900 dark:text-white" title={r.fileName}>
                            {r.fileName}
                          </p>
                          <p className="text-xs text-slate-500">
                            {formatBytes(r.byteSize)} · {formatDateTime(r.createdAt)}
                          </p>
                        </div>
                        <RunActions run={r} downloadingId={downloadingId} onDownload={() => handleDownload(r)} />
                      </li>
                    ))}
                  </ul>
                  {runsTotalPages > 1 && (
                    <div className="flex items-center justify-between border-t border-slate-100 px-6 py-3 dark:border-slate-800">
                      <button
                        type="button"
                        disabled={runsPage <= 0}
                        onClick={() => setRunsPage((p) => Math.max(0, p - 1))}
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
                        onClick={() => setRunsPage((p) => p + 1)}
                        className="rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40 dark:text-slate-400 dark:hover:bg-slate-800"
                      >
                        Sonraki
                      </button>
                    </div>
                  )}
                </>
              )}
            </section>
          </>
        ))}

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xl dark:border-slate-700 dark:bg-slate-900">
            <ModalTitle onClose={() => setModalOpen(false)} />
            <form onSubmit={handleCreate} className="space-y-4">
              <label className="block text-sm">
                <span className="mb-1.5 block font-semibold text-slate-700 dark:text-slate-300">Format</span>
                <select
                  value={format}
                  onChange={(e) => setFormat(e.target.value as ExportFormat)}
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
                  onChange={(e) => setFrequency(e.target.value as ExportFrequency)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                >
                  <option value="DAILY">Günlük</option>
                  <option value="WEEKLY">Haftalık (Pazartesi)</option>
                </select>
              </label>
              <label className="block text-sm">
                <span className="mb-1.5 block font-semibold text-slate-700 dark:text-slate-300">Çalışma saati (0–23)</span>
                <input
                  type="number"
                  min={0}
                  max={23}
                  value={hourOfDay}
                  onChange={(e) => setHourOfDay(Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  required
                />
              </label>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Planlar Europe/Istanbul saat diliminde çalışır.
              </p>
              {formError && <p className="text-sm font-medium text-red-600 dark:text-red-400">{formError}</p>}
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
                  {saving ? 'Kaydediliyor…' : 'Oluştur'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function PageHeader({ canManage, onNew }: { canManage: boolean; onNew: () => void }) {
  return (
    <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">Dışa aktarma</p>
        <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">Planlı dışa aktarma</h2>
        <p className="mt-1 text-sm font-medium text-slate-600 dark:text-slate-400">
          Raporları otomatik Excel veya PDF olarak üretin; geçmiş dosyaları indirin.
        </p>
      </div>
      {canManage && (
        <button
          type="button"
          onClick={onNew}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary-hover"
        >
          <Plus size={17} />
          Yeni plan
        </button>
      )}
    </div>
  );
}

function RunActions({
  run,
  downloadingId,
  onDownload,
}: {
  run: ExportRun;
  downloadingId: string | null;
  onDownload: () => void;
}) {
  if (run.status === 'SUCCESS') {
    return (
      <button
        type="button"
        disabled={downloadingId === run.id}
        onClick={onDownload}
        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200/90 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
      >
        <Download size={14} />
        {downloadingId === run.id ? '…' : 'İndir'}
      </button>
    );
  }
  return (
    <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold uppercase text-red-800 dark:bg-red-900/40 dark:text-red-200">
      Başarısız
    </span>
  );
}

function ModalTitle({ onClose }: { onClose: () => void }) {
  return (
    <div className="mb-5 flex items-center justify-between">
      <h3 className="text-lg font-bold text-slate-900 dark:text-white">Yeni planlı dışa aktarma</h3>
      <button type="button" onClick={onClose} className="rounded-lg p-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">
        <X size={20} />
      </button>
    </div>
  );
}
