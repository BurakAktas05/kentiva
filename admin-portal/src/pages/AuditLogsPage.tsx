import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Filter, RefreshCw, ScrollText } from 'lucide-react';
import axios from 'axios';
import api, { type AuditLogEntry, type AuditLogQueryParams, type SpringPage } from '../api';
import ScheduledExportsPage from './ScheduledExportsPage';

const ACTION_OPTIONS = [
  { value: '', label: 'Tüm işlemler' },
  { value: 'REPORT_CREATE', label: 'Rapor oluşturma' },
  { value: 'REPORT_STATUS_UPDATE', label: 'Rapor durumu güncelleme' },
  { value: 'STAFF_CREATE', label: 'Personel oluşturma' },
  { value: 'USER_ROLE_UPDATE', label: 'Rol güncelleme' },
  { value: 'USER_TOGGLE_STATUS', label: 'Hesap durumu' },
  { value: 'DEPARTMENT_CREATE', label: 'Departman oluşturma' },
  { value: 'DEPARTMENT_UPDATE', label: 'Departman güncelleme' },
  { value: 'DEPARTMENT_DELETE', label: 'Departman silme' },
  { value: 'PROFILE_UPDATE', label: 'Profil güncelleme' },
  { value: 'PASSWORD_CHANGE', label: 'Şifre değişikliği' },
];

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('tr-TR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function actionLabel(action: string): string {
  return ACTION_OPTIONS.find((o) => o.value === action)?.label ?? action;
}

function reportLinkFor(row: AuditLogEntry): string | null {
  const id = row.entityId;
  if (!id) return null;
  if (row.action.startsWith('REPORT_')) return `/reports/${id}`;
  return null;
}

export default function AuditLogsPage() {
  const [page, setPage] = useState(0);
  const [size] = useState(25);
  const [username, setUsername] = useState('');
  const [action, setAction] = useState('');
  const [entityId, setEntityId] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [municipalityId, setMunicipalityId] = useState('');
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [municipalities, setMunicipalities] = useState<{ id: string; name: string }[]>([]);
  const [data, setData] = useState<SpringPage<AuditLogEntry> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scopeError, setScopeError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'logs' | 'exports'>('logs');

  useEffect(() => {
    api
      .get('/auth/me')
      .then((res) => {
        const roles: string[] = res.data.data?.roles ?? [];
        setIsSuperAdmin(roles.includes('ROLE_SUPER_ADMIN'));
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!isSuperAdmin) return;
    api
      .get('/admin/municipalities')
      .then((res) => {
        const list = (res.data.data?.content ?? []) as { id: string; name: string }[];
        setMunicipalities(list);
      })
      .catch(() => {});
  }, [isSuperAdmin]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setScopeError(null);
    try {
      const params: AuditLogQueryParams = {
        page,
        size,
        sort: 'createdAt,desc',
      };
      if (username.trim()) params.username = username.trim();
      if (action) params.action = action;
      if (entityId.trim()) params.entityId = entityId.trim();
      if (from) params.from = from;
      if (to) params.to = to;
      if (isSuperAdmin && municipalityId) params.municipalityId = municipalityId;

      const res = await api.get('/audit-logs', { params });
      setData(res.data.data as SpringPage<AuditLogEntry>);
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const code = (err.response?.data as { errorCode?: string } | undefined)?.errorCode;
        const msg = (err.response?.data as { message?: string } | undefined)?.message;
        if (code === 'MUNICIPALITY_REQUIRED' || code === 'CROSS_MUNICIPALITY_ACCESS') {
          setScopeError(msg ?? 'Bu hesap için denetim günlüğü kullanılamıyor.');
          setData(null);
          return;
        }
      }
      setError('Denetim kayıtları yüklenemedi.');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [page, size, username, action, entityId, from, to, municipalityId, isSuperAdmin]);

  useEffect(() => {
    queueMicrotask(() => {
      void load();
    });
  }, [load]);

  const totalPages = data?.totalPages ?? 0;
  const rows = data?.content ?? [];
  const totalElements = data?.totalElements ?? 0;

  if (scopeError && activeTab === 'logs') {
    return (
      <div className="p-6">
        <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100">
          {scopeError}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="kentiva-eyebrow">Denetim</p>
          <h2 className="mt-1 flex items-center gap-2 text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            <ScrollText className="h-7 w-7 text-primary" />
            Denetim ve Dışa Aktarma Raporu
          </h2>
          <p className="mt-1 text-sm font-medium text-slate-600 dark:text-slate-400">
            Sistem işlem geçmişi ve otomatik planlı veri dışa aktarma paneli.
          </p>
        </div>
        {activeTab === 'logs' && (
          <button
            type="button"
            onClick={() => load()}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200/90 bg-white px-4 py-2.5 text-sm font-semibold shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Yenile
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="mb-6 flex border-b border-slate-200 dark:border-slate-700">
        <button
          onClick={() => setActiveTab('logs')}
          className={`px-4 py-2.5 text-sm font-bold border-b-2 transition-all -mb-px ${
            activeTab === 'logs'
              ? 'border-primary text-primary'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          Denetim Günlüğü
        </button>
        <button
          onClick={() => setActiveTab('exports')}
          className={`px-4 py-2.5 text-sm font-bold border-b-2 transition-all -mb-px ${
            activeTab === 'exports'
              ? 'border-primary text-primary'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          Planlı Dışa Aktarma
        </button>
      </div>

      {activeTab === 'logs' ? (
        scopeError ? (
          <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100">
            {scopeError}
          </p>
        ) : (
          <>
            <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
                <Filter className="h-4 w-4 text-slate-400" />
                Filtreler
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                <label className="block">
                  <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500">Başlangıç</span>
                  <input
                    type="date"
                    value={from}
                    onChange={(e) => {
                      setFrom(e.target.value);
                      setPage(0);
                    }}
                    className="w-full rounded-xl border border-slate-200/90 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-100"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500">Bitiş</span>
                  <input
                    type="date"
                    value={to}
                    onChange={(e) => {
                      setTo(e.target.value);
                      setPage(0);
                    }}
                    className="w-full rounded-xl border border-slate-200/90 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-100"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500">Kullanıcı (e-posta)</span>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => {
                      setUsername(e.target.value);
                      setPage(0);
                    }}
                    placeholder="admin@belediye.gov.tr"
                    className="w-full rounded-xl border border-slate-200/90 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-100"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500">İşlem tipi</span>
                  <select
                    value={action}
                    onChange={(e) => {
                      setAction(e.target.value);
                      setPage(0);
                    }}
                    className="w-full rounded-xl border border-slate-200/90 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-100"
                  >
                    {ACTION_OPTIONS.map((o) => (
                      <option key={o.value || 'all'} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block sm:col-span-2">
                  <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500">Rapor / varlık ID</span>
                  <input
                    type="text"
                    value={entityId}
                    onChange={(e) => {
                      setEntityId(e.target.value);
                      setPage(0);
                    }}
                    placeholder="UUID veya kısmi eşleşme"
                    className="w-full rounded-xl border border-slate-200/90 bg-slate-50 px-3 py-2 text-sm font-mono dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-100"
                  />
                </label>
                {isSuperAdmin && (
                  <label className="block sm:col-span-2">
                    <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500">Belediye</span>
                    <select
                      value={municipalityId}
                      onChange={(e) => {
                        setMunicipalityId(e.target.value);
                        setPage(0);
                      }}
                      className="w-full rounded-xl border border-slate-200/90 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-100"
                    >
                      <option value="">Tüm belediyeler</option>
                      {municipalities.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
              {error && (
                <div className="border-b border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
                  {error}
                </div>
              )}
              <div className="border-b border-slate-100 px-4 py-3 text-xs font-medium text-slate-500 dark:border-slate-800 dark:text-slate-400">
                Toplam {totalElements} kayıt
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[960px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200/80 bg-slate-50/90 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-400">
                      <th className="px-4 py-4">Zaman</th>
                      <th className="px-4 py-4">Kullanıcı</th>
                      <th className="px-4 py-4">İşlem</th>
                      <th className="px-4 py-4">Açıklama</th>
                      <th className="px-4 py-4">Varlık</th>
                      <th className="px-4 py-4">IP</th>
                      <th className="px-4 py-4">Meta</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {loading && rows.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-16 text-center text-slate-500">
                          Yükleniyor…
                        </td>
                      </tr>
                    ) : rows.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-16 text-center text-slate-500">
                          Kayıt bulunamadı.
                        </td>
                      </tr>
                    ) : (
                      rows.map((row) => {
                        const reportHref = reportLinkFor(row);
                        return (
                          <tr key={row.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                            <td className="whitespace-nowrap px-4 py-3 text-slate-600 dark:text-slate-300">
                              {formatDateTime(row.createdAt)}
                            </td>
                            <td className="px-4 py-3">
                              <p className="font-medium text-slate-900 dark:text-white">{row.username}</p>
                              {row.userId && (
                                <p className="mt-0.5 font-mono text-[10px] text-slate-400">{row.userId}</p>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                                {actionLabel(row.action)}
                              </span>
                            </td>
                            <td className="max-w-[200px] px-4 py-3 text-slate-600 dark:text-slate-300">
                              <p className="line-clamp-2">{row.description ?? '—'}</p>
                            </td>
                            <td className="px-4 py-3 font-mono text-xs">
                              {reportHref ? (
                                <Link to={reportHref} className="font-semibold text-primary hover:underline">
                                  {row.entityId}
                                </Link>
                              ) : row.entityId ? (
                                <span className="text-slate-600 dark:text-slate-300">{row.entityId}</span>
                              ) : (
                                '—'
                              )}
                            </td>
                            <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-slate-500">
                              {row.ipAddress ?? '—'}
                            </td>
                            <td className="max-w-[180px] px-4 py-3">
                              {row.methodName && (
                                <p className="truncate text-[10px] text-slate-400" title={row.methodName}>
                                  {row.methodName}
                                </p>
                              )}
                              {row.resultSummary && (
                                <p className="mt-1 line-clamp-2 text-[10px] text-slate-500" title={row.resultSummary}>
                                  {row.resultSummary}
                                </p>
                              )}
                              {!row.methodName && !row.resultSummary && '—'}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 dark:border-slate-800">
                  <button
                    type="button"
                    disabled={page <= 0 || loading}
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-40 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Önceki
                  </button>
                  <span className="text-xs font-medium text-slate-500">
                    Sayfa {page + 1} / {totalPages}
                  </span>
                  <button
                    type="button"
                    disabled={page >= totalPages - 1 || loading}
                    onClick={() => setPage((p) => p + 1)}
                    className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-40 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    Sonraki
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          </>
        )
      ) : (
        <ScheduledExportsPage embedded={true} />
      )}
    </div>
  );
}
