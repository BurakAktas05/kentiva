import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  Filter,
  Plus,
  RefreshCw,
  Search,
  Upload,
  UserPlus,
  Wifi,
  WifiOff,
  X,
} from 'lucide-react';
import axios from 'axios';
import api, { type BulkReportOperationResult, type ReportListItem, type SpringPage, type User } from '../api';
import { downloadBlobResponse } from '../lib/downloadExport';
import { reportStatusLabel } from '../lib/reportUtils';
import { reportStatusBadgeClass } from '../lib/ui';
import { useReportLive } from '../context/ReportLiveContext';
import { reportToListItem } from '../lib/reportUtils';
import type { Report } from '../api';

const STATUS_OPTIONS = [
  { value: '', label: 'Tüm durumlar' },
  { value: 'PENDING', label: 'Bekleyen' },
  { value: 'FORWARDED', label: 'Yönlendirildi' },
  { value: 'PROCESSING', label: 'İşleniyor' },
  { value: 'RESOLVED', label: 'Çözüldü' },
  { value: 'REJECTED', label: 'Reddedildi' },
  { value: 'OUT_OF_JURISDICTION', label: 'Yetki Alanı Dışı' },
];

const BULK_STATUS_OPTIONS = [
  { value: 'PROCESSING', label: 'İşleniyor' },
  { value: 'RESOLVED', label: 'Çözüldü' },
  { value: 'REJECTED', label: 'Reddedildi' },
  { value: 'OUT_OF_JURISDICTION', label: 'Yetki Alanı Dışı' },
];

type BulkModal = 'process' | 'export' | null;
type Toast = { type: 'success' | 'error'; message: string } | null;

function hasAnyRole(roles: string[], allowed: string[]) {
  return roles.some((r) => allowed.includes(r));
}

export default function ReportsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQuery = searchParams.get('q')?.trim() ?? '';
  const initialStatus = searchParams.get('status')?.trim() ?? '';
  const initialFrom = searchParams.get('from')?.trim() ?? '';
  const initialTo = searchParams.get('to')?.trim() ?? '';
  const [page, setPage] = useState(0);
  const [size] = useState(15);
  const [status, setStatus] = useState(initialStatus);
  const [searchText, setSearchText] = useState(initialQuery);
  const [fromDate, setFromDate] = useState(initialFrom);
  const [toDate, setToDate] = useState(initialTo);
  const [data, setData] = useState<SpringPage<ReportListItem> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [roles, setRoles] = useState<string[]>([]);
  const [currentUser, setCurrentUser] = useState<any | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [modal, setModal] = useState<BulkModal>(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [toast, setToast] = useState<Toast>(null);
  const [officers, setOfficers] = useState<User[]>([]);
  const [assigneeId, setAssigneeId] = useState('');
  const [bulkStatus, setBulkStatus] = useState('PROCESSING');
  const [bulkNote, setBulkNote] = useState('');
  const [exportFormat, setExportFormat] = useState<'excel' | 'pdf'>('excel');
  const [highlightedIds, setHighlightedIds] = useState<Set<string>>(new Set());
  const [incomingBanner, setIncomingBanner] = useState<Report | null>(null);
  const [sessionNewCount, setSessionNewCount] = useState(0);
  const lastHandledReportId = useRef<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { latestReport, wsConnected } = useReportLive();

  const [resolvingIds, setResolvingIds] = useState<Set<string>>(new Set());

  const handleQuickResolve = async (id: string) => {
    setResolvingIds((prev) => new Set(prev).add(id));
    try {
      await api.patch(`/reports/${id}/status`, {
        status: 'RESOLVED',
        note: 'Tablo üzerinden hızlıca çözüldü.',
        resolvedMediaUrls: null,
      });
      showToast('success', 'İhbar çözüldü olarak işaretlendi.');
      void load();
    } catch (err: unknown) {
      const msg = axios.isAxiosError(err)
        ? String((err.response?.data as { message?: string } | undefined)?.message ?? 'Çözme işlemi başarısız oldu.')
        : 'Çözme işlemi başarısız oldu.';
      showToast('error', msg);
    } finally {
      setResolvingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const getSlaRemainingHours = (r: ReportListItem) => {
    if (r.status === 'RESOLVED' || r.status === 'REJECTED' || r.status === 'OUT_OF_JURISDICTION') {
      return null;
    }
    if (r.slaBreached) {
      return -1;
    }
    const priority = r.aiPriority;
    let limit = 72;
    if (priority) {
      const p = priority.toUpperCase();
      if (p === 'CRITICAL' || p === 'HIGH') limit = 24;
      else if (p === 'MEDIUM') limit = 72;
      else if (p === 'LOW') limit = 168;
    }
    const start = r.status === 'PROCESSING' && r.processedAt ? r.processedAt : r.createdAt;
    if (!start) return null;
    const startTime = Date.parse(start);
    const now = Date.now();
    const elapsedHours = (now - startTime) / (1000 * 60 * 60);
    const remaining = limit - elapsedHours;
    return remaining;
  };

  const canAssign = hasAnyRole(roles, ['ROLE_DEPT_MANAGER', 'ROLE_ADMIN', 'ROLE_SUPER_ADMIN']);
  const canChangeStatus = hasAnyRole(roles, [
    'ROLE_FIELD_OFFICER',
    'ROLE_DEPT_MANAGER',
    'ROLE_ADMIN',
    'ROLE_SUPER_ADMIN',
  ]);
  const canExport = hasAnyRole(roles, ['ROLE_DEPT_MANAGER', 'ROLE_ADMIN', 'ROLE_SUPER_ADMIN']);
  const canImport = hasAnyRole(roles, ['ROLE_DEPT_MANAGER', 'ROLE_ADMIN', 'ROLE_SUPER_ADMIN']);

  const availableBulkStatusOptions = useMemo(() => {
    if (!currentUser || !currentUser.departmentId) {
      return BULK_STATUS_OPTIONS.filter((o) => o.value !== 'RESOLVED');
    }
    return BULK_STATUS_OPTIONS;
  }, [currentUser]);

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
      .then((res) => {
        setRoles(res.data.data?.roles ?? []);
        setCurrentUser(res.data.data);
      })
      .catch(() => {
        setRoles([]);
        setCurrentUser(null);
      });
  }, []);

  useEffect(() => {
    if (!canAssign) return;
    api
      .get('/users', { params: { role: 'ROLE_FIELD_OFFICER' } })
      .then((res) => setOfficers((res.data.data?.content ?? []) as User[]))
      .catch(() => setOfficers([]));
  }, [canAssign]);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 5000);
    return () => window.clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    if (!latestReport?.id || latestReport.id === lastHandledReportId.current) return;
    lastHandledReportId.current = latestReport.id;

    const item = reportToListItem(latestReport);
    const q = searchText.trim().toLowerCase();
    const matchesSearch =
      !q ||
      [item.title, item.categoryName, item.district, item.id].some((f) =>
        String(f ?? '')
          .toLowerCase()
          .includes(q),
      );
    const matchesStatus = !status || item.status === status;

    setData((prev) => {
      if (!prev) return prev;
      const index = prev.content.findIndex((r) => r.id === item.id);
      if (index !== -1) {
        const newContent = [...prev.content];
        newContent[index] = { ...newContent[index], ...item };
        return {
          ...prev,
          content: newContent,
        };
      } else if (page === 0 && matchesStatus && matchesSearch) {
        return {
          ...prev,
          content: [item, ...prev.content].slice(0, size),
          totalElements: prev.totalElements + 1,
        };
      }
      return prev;
    });

    setHighlightedIds((prev) => new Set(prev).add(item.id));
    const timer = window.setTimeout(() => {
      setHighlightedIds((prev) => {
        const next = new Set(prev);
        next.delete(item.id);
        return next;
      });
    }, 5000);

    if (latestReport.status === 'PENDING') {
      setIncomingBanner(latestReport);
      setSessionNewCount((c) => c + 1);
      const hide = window.setTimeout(() => setIncomingBanner(null), 7000);
      return () => {
        window.clearTimeout(timer);
        window.clearTimeout(hide);
      };
    }

    return () => {
      window.clearTimeout(timer);
    };
  }, [latestReport, page, size, status, searchText]);

  const totalPages = data?.totalPages ?? 0;
  const rows = data?.content ?? [];
  const filteredRows = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    const fromTs = fromDate ? Date.parse(`${fromDate}T00:00:00`) : null;
    const toTs = toDate ? Date.parse(`${toDate}T23:59:59`) : null;
    return rows.filter((r) => {
      const matchesSearch =
        !q ||
        [r.title, r.categoryName, r.district, r.id]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(q));
      const createdAtTs = r.createdAt ? Date.parse(r.createdAt) : null;
      const matchesFrom = fromTs == null || (createdAtTs != null && createdAtTs >= fromTs);
      const matchesTo = toTs == null || (createdAtTs != null && createdAtTs <= toTs);
      return matchesSearch && matchesFrom && matchesTo;
    });
  }, [fromDate, rows, searchText, toDate]);
  const selectedCount = selected.size;
  const visibleIds = useMemo(() => filteredRows.map((row) => row.id), [filteredRows]);
  const visiblePending = useMemo(
    () => filteredRows.filter((row) => row.status === 'PENDING').length,
    [filteredRows],
  );
  const visibleResolved = useMemo(
    () => filteredRows.filter((row) => row.status === 'RESOLVED').length,
    [filteredRows],
  );

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

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setBulkBusy(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await api.post('/reports/import', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      const result = res.data.data as BulkReportOperationResult;
      if (result.failureCount === 0) {
        showToast('success', `${result.successCount} rapor başarıyla içe aktarıldı.`);
      } else if (result.successCount === 0) {
        const detail = result.failures[0]?.message ?? 'İçe aktarma başarısız.';
        showToast('error', `İçe aktarma başarısız. Hata: ${detail}`);
      } else {
        showToast(
          'error',
          `${result.successCount} başarılı, ${result.failureCount} başarısız. İlk hata: ${result.failures[0]?.message ?? '—'}`,
        );
      }
      void load();
    } catch (err: unknown) {
      const msg = axios.isAxiosError(err)
        ? String((err.response?.data as { message?: string } | undefined)?.message ?? 'Toplu içe aktarma başarısız oldu.')
        : 'Toplu içe aktarma başarısız oldu.';
      showToast('error', msg);
    } finally {
      setBulkBusy(false);
    }
  };

  const showToast = (type: 'success' | 'error', message: string) => setToast({ type, message });

  const runBulkProcess = async () => {
    if (selectedCount === 0) return;
    setBulkBusy(true);
    try {
      let assignFailures = 0;

      if (assigneeId && canAssign) {
        const res = await api.post('/reports/batch/assign', {
          reportIds: [...selected],
          assigneeId,
        });
        const result = res.data.data as BulkReportOperationResult;
        assignFailures = result.failureCount;
        if (result.failureCount > 0 && result.successCount === 0) {
          showToast('error', `Atama başarısız. ${result.failures[0]?.message ?? ''}`);
          return;
        }
      }

      if (canChangeStatus && (bulkNote.trim() || bulkStatus !== 'PROCESSING' || !assigneeId)) {
        const res = await api.patch('/reports/batch/status', {
          reportIds: [...selected],
          status: bulkStatus,
          note: bulkNote.trim() || null,
        });
        const result = res.data.data as BulkReportOperationResult;
        if (result.failureCount === 0) {
          showToast('success', `${result.successCount} rapor güncellendi`);
        } else if (result.successCount === 0) {
          showToast('error', `Durum güncellenemedi. ${result.failures[0]?.message ?? ''}`);
          return;
        } else {
          showToast(
            'error',
            `${result.successCount} başarılı, ${result.failureCount} başarısız. İlk hata: ${result.failures[0]?.message ?? '—'}`,
          );
        }
      } else if (assigneeId && assignFailures === 0) {
        showToast('success', `${selectedCount} rapor atandı`);
      }

      setModal(null);
      setAssigneeId('');
      setBulkNote('');
      clearSelection();
      void load();
    } catch (err: unknown) {
      const msg = axios.isAxiosError(err)
        ? String((err.response?.data as { message?: string } | undefined)?.message ?? 'Toplu işlem başarısız.')
        : 'Toplu işlem başarısız.';
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
      await downloadBlobResponse(
        res,
        `kentiva-secili-${new Date().toISOString().slice(0, 10)}.${exportFormat === 'excel' ? 'xlsx' : 'pdf'}`,
      );
      showToast('success', `${selectedCount} rapor dışa aktarıldı.`);
      setModal(null);
    } catch (e: unknown) {
      showToast('error', e instanceof Error ? e.message : 'Dışa aktarma başarısız oldu.');
    } finally {
      setBulkBusy(false);
    }
  };

  const runVisibleExport = async (format: 'excel' | 'pdf') => {
    if (visibleIds.length === 0) return;
    setBulkBusy(true);
    try {
      const path = format === 'excel' ? '/export/reports/excel' : '/export/reports/pdf';
      const params = new URLSearchParams();
      visibleIds.forEach((id) => params.append('reportIds', id));
      const res = await api.get(`${path}?${params.toString()}`, { responseType: 'blob' });
      await downloadBlobResponse(
        res,
        `kentiva-gorunen-${new Date().toISOString().slice(0, 10)}.${format === 'excel' ? 'xlsx' : 'pdf'}`,
      );
      showToast('success', `${visibleIds.length} gorunen rapor disa aktarildi.`);
    } catch (e: unknown) {
      showToast('error', e instanceof Error ? e.message : 'Gorunen raporlar disa aktarilamadi.');
    } finally {
      setBulkBusy(false);
    }
  };

  const colSpan = 8;

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

      <AnimatePresence>
        {incomingBanner && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-300/80 bg-emerald-50 px-4 py-3 dark:border-emerald-800/60 dark:bg-emerald-950/40"
          >
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500 text-sm font-bold text-white">
                <Plus className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-wide text-emerald-800 dark:text-emerald-200">
                  Yeni ihbar
                </p>
                <p className="truncate text-sm font-bold text-slate-900 dark:text-white">{incomingBanner.title}</p>
                <p className="text-xs text-emerald-700/90 dark:text-emerald-300/90">
                  {incomingBanner.categoryName}
                  {incomingBanner.district ? ` · ${incomingBanner.district}` : ''}
                </p>
              </div>
            </div>
            <Link
              to={`/reports/${incomingBanner.id}`}
              className="shrink-0 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700"
            >
              Görüntüle
            </Link>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="kentiva-eyebrow">İş listesi</p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">Raporlar</h2>
            {sessionNewCount > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500 px-2.5 py-0.5 text-xs font-bold text-white animate-pulse">
                <Plus className="h-3.5 w-3.5" />
                {sessionNewCount} yeni
              </span>
            )}
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                wsConnected
                  ? 'bg-sky-100 text-sky-800 dark:bg-sky-950/50 dark:text-sky-200'
                  : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
              }`}
              title={wsConnected ? 'Canlı bildirim açık' : 'Canlı bildirim kapalı (WebSocket)'}
            >
              {wsConnected ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
              {wsConnected ? 'Canlı' : 'Çevrimdışı'}
            </span>
          </div>
          <p className="mt-1 text-sm font-medium text-slate-600 dark:text-slate-400">
            Yeni ihbar gelince kısa bir ses çalar; liste ve bildirimler anında güncellenir.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={searchText}
              onChange={(e) => {
                const v = e.target.value;
                setSearchText(v);
                setPage(0);
                const next = new URLSearchParams(searchParams);
                if (v.trim()) next.set('q', v.trim());
                else next.delete('q');
                setSearchParams(next, { replace: true });
              }}
              placeholder="Başlık, kategori, ilçe…"
              className="w-full min-w-[200px] rounded-xl border border-slate-200/90 bg-white py-2.5 pl-10 pr-3 text-sm font-medium text-slate-800 shadow-sm focus:ring-2 focus:ring-primary dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 sm:w-56"
            />
          </div>
          <div className="relative">
            <Filter className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(0);
                clearSelection();
                const next = new URLSearchParams(searchParams);
                if (e.target.value) next.set('status', e.target.value);
                else next.delete('status');
                setSearchParams(next, { replace: true });
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
          <input
            type="date"
            value={fromDate}
            onChange={(e) => {
              const value = e.target.value;
              setFromDate(value);
              const next = new URLSearchParams(searchParams);
              if (value) next.set('from', value);
              else next.delete('from');
              setSearchParams(next, { replace: true });
            }}
            className="rounded-xl border border-slate-200/90 bg-white px-3 py-2.5 text-sm font-medium text-slate-800 shadow-sm focus:ring-2 focus:ring-primary dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          />
          <input
            type="date"
            value={toDate}
            onChange={(e) => {
              const value = e.target.value;
              setToDate(value);
              const next = new URLSearchParams(searchParams);
              if (value) next.set('to', value);
              else next.delete('to');
              setSearchParams(next, { replace: true });
            }}
            className="rounded-xl border border-slate-200/90 bg-white px-3 py-2.5 text-sm font-medium text-slate-800 shadow-sm focus:ring-2 focus:ring-primary dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          />
          {canImport && (
            <>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".xlsx,.xls,.csv"
                className="hidden"
              />
              <button
                type="button"
                onClick={handleImportClick}
                disabled={bulkBusy}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200/90 bg-white px-4 py-2.5 text-sm font-semibold shadow-sm hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800"
              >
                <Upload className="h-4 w-4" />
                Toplu Rapor Yükle
              </button>
            </>
          )}
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

      <div className="grid gap-3 xl:grid-cols-[1fr_1fr_1fr_1.45fr]">
        <MetricCard label="Gorunen kayit" value={String(filteredRows.length)} helper="Bu sayfada filtreye uyanlar" />
        <MetricCard label="Bekleyen" value={String(visiblePending)} helper="Hizli mudahale gerektirenler" />
        <MetricCard label="Cozulen" value={String(visibleResolved)} helper="Bu sayfada kapananlar" />
        <div className="rounded-3xl border border-slate-200/90 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                Hizli export
              </p>
              <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">Gorunen raporlari aktar</p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Arama ve tarih filtresiyle ekranda kalan kayitlar tek tikla disa aktarilir.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={!canExport || visibleIds.length === 0 || bulkBusy}
                onClick={() => void runVisibleExport('excel')}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              >
                <Download className="h-3.5 w-3.5" />
                Excel
              </button>
              <button
                type="button"
                disabled={!canExport || visibleIds.length === 0 || bulkBusy}
                onClick={() => void runVisibleExport('pdf')}
                className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-xs font-bold text-white hover:bg-primary-hover disabled:opacity-50"
              >
                <Download className="h-3.5 w-3.5" />
                PDF
              </button>
            </div>
          </div>
        </div>
      </div>

      {selectedCount > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-primary/25 bg-primary/5 px-4 py-3 dark:border-primary/30 dark:bg-primary/10">
          <span className="text-sm font-bold text-primary">{selectedCount} seçili</span>
          {(canAssign || canChangeStatus) && (
            <button
              type="button"
              disabled={bulkBusy}
              onClick={() => setModal('process')}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-white hover:bg-primary-hover disabled:opacity-50"
            >
              <UserPlus className="h-3.5 w-3.5" />
              İşle
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
                <th className="px-4 py-4">SLA</th>
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
                filteredRows.map((r) => (
                  <tr
                    key={r.id}
                    className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 ${
                      selected.has(r.id) ? 'bg-primary/5 dark:bg-primary/10' : ''
                    } ${
                      highlightedIds.has(r.id)
                        ? 'bg-emerald-50/90 ring-1 ring-inset ring-emerald-300/80 dark:bg-emerald-950/30 dark:ring-emerald-700/50'
                        : ''
                    }`}
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
                    <td className="max-w-[260px] px-4 py-3 font-medium text-slate-900 dark:text-white">
                      <div className="flex flex-wrap items-center gap-2">
                        {highlightedIds.has(r.id) && (
                          <span className="shrink-0 rounded bg-emerald-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                            YENİ
                          </span>
                        )}
                        <span className="truncate">{r.title}</span>
                        {r.duplicateGroupSize != null && r.duplicateGroupSize > 1 && (
                          <span
                            className="shrink-0 rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-bold uppercase text-violet-800 dark:bg-violet-900/40 dark:text-violet-200"
                            title="Aynı konumdan gelen ihbarlar tek olay olarak gruplandı"
                          >
                            Tek olay · {r.duplicateGroupSize}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{r.categoryName}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{r.district ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`kentiva-status-badge ${reportStatusBadgeClass(r.status)}`}>
                        {reportStatusLabel(r.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {(() => {
                        const remaining = getSlaRemainingHours(r);
                        if (remaining === null) return <span className="text-slate-400 dark:text-slate-600">—</span>;
                        if (remaining <= 0) {
                          return (
                            <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-xs font-semibold text-rose-700 dark:bg-rose-950/40 dark:text-rose-300" title="SLA süresi aşıldı!">
                              <Clock className="h-3.5 w-3.5 text-rose-500 animate-pulse" />
                              Süresi Aşıldı
                            </span>
                          );
                        }
                        if (remaining < 6) {
                          return (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700 dark:bg-amber-950/40 dark:text-amber-300" title="SLA sınırına yaklaşıldı.">
                              <Clock className="h-3.5 w-3.5 text-amber-500 animate-pulse" />
                              Kritik ({Math.ceil(remaining)} sa)
                            </span>
                          );
                        }
                        return (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                            <Clock className="h-3.5 w-3.5 text-emerald-500" />
                            {Math.ceil(remaining)} sa
                          </span>
                        );
                      })()}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-500 dark:text-slate-400">
                      {r.createdAt ? new Date(r.createdAt).toLocaleString('tr-TR') : '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-3">
                        {r.status === 'PROCESSING' && canChangeStatus && (
                          <button
                            type="button"
                            onClick={() => void handleQuickResolve(r.id)}
                            disabled={resolvingIds.has(r.id)}
                            className="inline-flex items-center justify-center rounded-lg p-1 text-emerald-600 hover:bg-emerald-50 disabled:opacity-50 dark:hover:bg-emerald-950/50"
                            title="Hızlı Çözüldü Olarak İşaretle"
                          >
                            {resolvingIds.has(r.id) ? (
                              <RefreshCw className="h-4 w-4 animate-spin text-slate-400" />
                            ) : (
                              <CheckCircle2 className="h-4.5 w-4.5 text-emerald-500" />
                            )}
                          </button>
                        )}
                        <Link to={`/reports/${r.id}`} className="text-xs font-bold text-primary hover:underline">
                          Detay
                        </Link>
                      </div>
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
                {modal === 'process' && 'Toplu işlem'}
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

            {modal === 'process' && (
              <div className="mb-4 space-y-3">
                {canAssign && (
                  <label className="block text-sm">
                    <span className="mb-1.5 block font-semibold text-slate-700 dark:text-slate-300">
                      Saha görevlisi (isteğe bağlı)
                    </span>
                    <select
                      value={assigneeId}
                      onChange={(e) => setAssigneeId(e.target.value)}
                      disabled={bulkBusy}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    >
                      <option value="">Atama yapma</option>
                      {officers.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.firstName} {o.lastName}
                        </option>
                      ))}
                    </select>
                    <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                      Atama yapılırsa rapor otomatik olarak işleme alınır.
                    </p>
                  </label>
                )}
                {canChangeStatus && (
                  <>
                    <label className="block text-sm">
                      <span className="mb-1.5 block font-semibold text-slate-700 dark:text-slate-300">Durum</span>
                      <select
                        value={bulkStatus}
                        onChange={(e) => setBulkStatus(e.target.value)}
                        disabled={bulkBusy}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      >
                        {availableBulkStatusOptions.map((o) => (
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
                        placeholder="Vatandaşa iletilecek not veya işleme alma mesajı..."
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      />
                    </label>
                  </>
                )}
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
                disabled={bulkBusy || (modal === 'process' && !canAssign && !canChangeStatus)}
                onClick={() => {
                  if (modal === 'process') void runBulkProcess();
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

function MetricCard({ label, value, helper }: { label: string; value: string; helper: string }) {
  return (
    <div className="rounded-3xl border border-slate-200/90 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-2 text-3xl font-black tracking-tight text-slate-900 dark:text-white">{value}</p>
      <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">{helper}</p>
    </div>
  );
}
