import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  ExternalLink,
  Layers,
  MapPin,
  ShieldAlert,
  Sparkles,
  UserPlus,
  X,
} from 'lucide-react';
import axios from 'axios';
import api, { type Report, type ReportListItem, type ReportTimelineEntry, type User } from '../api';
import { resolveMediaUrl } from '../lib/env';
import { reportStatusBadgeClass } from '../lib/ui';

type ReportDetailPageProps = {
  reportId?: string;
  embedded?: boolean;
  onClose?: () => void;
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Beklemede',
  PROCESSING: 'Islemde',
  RESOLVED: 'Cozuldu',
  REJECTED: 'Reddedildi',
  FORWARDED: 'Yonlendirildi',
};

function toStatusLabel(status: string | null | undefined) {
  if (!status) return 'Bilinmiyor';
  return STATUS_LABELS[status] ?? status;
}

function formatDate(value: string | null | undefined) {
  if (!value) return '—';
  return new Date(value).toLocaleString('tr-TR');
}

function errorMessage(err: unknown, fallback: string) {
  if (!axios.isAxiosError(err)) return fallback;
  return String((err.response?.data as { message?: string } | undefined)?.message ?? fallback);
}

function mapUrl(lat: number | null | undefined, lng: number | null | undefined) {
  if (lat == null || lng == null) return null;
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
}

export default function ReportDetailPage({ reportId: reportIdProp, embedded, onClose }: ReportDetailPageProps = {}) {
  const { id: routeId } = useParams<{ id: string }>();
  const id = reportIdProp ?? routeId;
  const [report, setReport] = useState<Report | null>(null);
  const [timeline, setTimeline] = useState<ReportTimelineEntry[]>([]);
  const [officers, setOfficers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([]);
  const [selectedOfficerId, setSelectedOfficerId] = useState('');
  const [selectedDeptId, setSelectedDeptId] = useState('');
  const [isAssigning, setIsAssigning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [duplicateGroup, setDuplicateGroup] = useState<ReportListItem[]>([]);
  const [bulkBusy, setBulkBusy] = useState<'RESOLVED' | null>(null);
  const [aiBusy, setAiBusy] = useState(false);
  const [statusValue, setStatusValue] = useState<'PROCESSING' | 'RESOLVED'>('PROCESSING');
  const [noteText, setNoteText] = useState('');
  const [statusBusy, setStatusBusy] = useState(false);
  const [currentUser, setCurrentUser] = useState<any | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    (async () => {
      try {
        const [r, tl, u, dup, me, depsRes] = await Promise.all([
          api.get(`/reports/${id}`),
          api.get(`/reports/${id}/timeline`),
          api.get('/users?role=ROLE_FIELD_OFFICER').catch(() => ({ data: { data: [] } })),
          api.get(`/reports/${id}/duplicate-group`),
          api.get('/auth/me'),
          api.get('/departments').catch(() => ({ data: { data: [] } })),
        ]);

        if (cancelled) return;

        const rep = r.data.data as Report;
        setReport(rep);
        setTimeline(tl.data.data as ReportTimelineEntry[]);
        setOfficers((u.data.data?.content ?? []) as User[]);
        setDepartments((depsRes.data.data?.content ?? []) as { id: string; name: string }[]);
        setDuplicateGroup(dup.data.data as ReportListItem[]);
        setCurrentUser(me.data.data);
        setStatusValue(rep.status === 'RESOLVED' ? 'RESOLVED' : 'PROCESSING');
        if (rep.aiReplyDraft) {
          setNoteText(rep.aiReplyDraft);
        }
      } catch {
        if (!cancelled) setError('Rapor bulunamadi veya erisim yok.');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [id]);

  const canResolve = currentUser?.departmentId != null;
  const isWhiteDesk = currentUser?.roles?.includes('ROLE_WHITE_DESK');
  const resolvedMapUrl = useMemo(() => mapUrl(report?.latitude, report?.longitude), [report?.latitude, report?.longitude]);

  const refreshReport = async () => {
    if (!id) return;
    const [r, tl] = await Promise.all([api.get(`/reports/${id}`), api.get(`/reports/${id}/timeline`)]);
    const next = r.data.data as Report;
    setReport(next);
    setTimeline(tl.data.data as ReportTimelineEntry[]);
    setStatusValue(next.status === 'RESOLVED' ? 'RESOLVED' : 'PROCESSING');
  };

  const bulkCloseDuplicateGroup = async () => {
    if (!id || !report) return;
    const ids = [
      id,
      ...duplicateGroup.filter((d) => d.status !== 'RESOLVED' && d.status !== 'REJECTED').map((d) => d.id),
    ];
    const unique = [...new Set(ids)];
    if (unique.length < 2) return;
    if (!window.confirm(`${unique.length} ihbari toplu "cozuldu" olarak isaretlemek istiyor musunuz?`)) return;

    setBulkBusy('RESOLVED');
    setError(null);
    try {
      const res = await api.patch('/reports/batch/status', {
        reportIds: unique,
        status: 'RESOLVED',
        note: 'Mukerrer grup - toplu kapatma',
      });
      const result = res.data.data as { successCount: number; failureCount: number };
      if (result.failureCount > 0) {
        setError(`${result.successCount} guncellendi, ${result.failureCount} basarisiz.`);
      } else {
        window.location.reload();
      }
    } catch {
      setError('Toplu guncelleme basarisiz.');
    } finally {
      setBulkBusy(null);
    }
  };

  const runAiAnalysis = async () => {
    if (!id) return;
    setAiBusy(true);
    setError(null);
    try {
      const res = await api.post(`/reports/${id}/ai-analysis`);
      const next = res.data.data as Report;
      setReport(next);
      if (next.aiReplyDraft) {
        setNoteText(next.aiReplyDraft);
      }
      setSuccessMsg('AI yanit taslagi olusturuldu ve vatandas notuna eklendi.');
      window.setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: unknown) {
      window.alert(errorMessage(err, 'AI analizi basarisiz.'));
    } finally {
      setAiBusy(false);
    }
  };

  const saveStatus = async () => {
    if (!id || statusBusy) return;
    setStatusBusy(true);
    try {
      await api.patch(`/reports/${id}/status`, { status: statusValue, note: noteText.trim() || null });
      await refreshReport();
      setSuccessMsg('Durum guncellendi.');
      window.setTimeout(() => setSuccessMsg(null), 3000);
    } catch {
      window.alert('Durum guncellenemedi');
    } finally {
      setStatusBusy(false);
    }
  };

  const handleAssign = async () => {
    if (!selectedOfficerId || !id) return;
    setIsAssigning(true);
    setSuccessMsg(null);
    try {
      await api.post(`/reports/${id}/assign`, { assigneeId: selectedOfficerId });
      await refreshReport();
      setSelectedOfficerId('');
      setSuccessMsg('Saha gorevlisi atandi.');
      window.setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: unknown) {
      setError(errorMessage(err, 'Atama basarisiz.'));
    } finally {
      setIsAssigning(false);
    }
  };

  const handleForward = async () => {
    if (!selectedDeptId || !id) return;
    setIsAssigning(true);
    setSuccessMsg(null);
    try {
      await api.post(`/reports/${id}/forward`, { departmentId: selectedDeptId, note: noteText.trim() || null });
      await refreshReport();
      setSelectedDeptId('');
      setSuccessMsg('Departmana yonlendirildi.');
      window.setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: unknown) {
      setError(errorMessage(err, 'Yonlendirme basarisiz.'));
    } finally {
      setIsAssigning(false);
    }
  };

  const backNav = embedded ? (
    <button
      type="button"
      onClick={onClose}
      className="inline-flex items-center gap-2 text-sm font-bold text-primary hover:underline"
    >
      <ArrowLeft className="h-4 w-4" />
      Haritaya don
    </button>
  ) : (
    <Link to="/reports" className="inline-flex items-center gap-2 text-sm font-bold text-primary hover:underline">
      <ArrowLeft className="h-4 w-4" />
      Raporlara don
    </Link>
  );

  const wrapEmbedded = (node: ReactNode) =>
    embedded ? (
      <div className="fixed inset-0 z-[2000] flex">
        <button
          type="button"
          className="flex-1 bg-slate-900/50 backdrop-blur-sm"
          aria-label="Kapat"
          onClick={onClose}
        />
        <div className="relative flex h-full w-full max-w-3xl flex-col overflow-hidden bg-slate-50 shadow-2xl dark:bg-slate-950">
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 z-10 rounded-lg border border-slate-200 bg-white p-2 text-slate-600 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
            aria-label="Kapat"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="flex-1 overflow-y-auto">{node}</div>
        </div>
      </div>
    ) : (
      node
    );

  if (error && !report) {
    return wrapEmbedded(
      <div className="p-6">
        {backNav}
        <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-6 text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
          {error}
        </div>
      </div>,
    );
  }

  if (!report) {
    return wrapEmbedded(<div className="p-6 text-slate-500">Yukleniyor...</div>);
  }

  return wrapEmbedded(
    <div className="space-y-6 p-6">
      {backNav}

      {error && (
        <div className="flex items-start gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="flex items-start gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      <section className="overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="border-b border-slate-200/80 bg-gradient-to-r from-slate-50 via-white to-sky-50 px-6 py-6 dark:border-slate-800 dark:from-slate-900 dark:via-slate-900 dark:to-slate-950 sm:px-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-slate-900 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-white dark:bg-slate-100 dark:text-slate-900">
                  #{report.id.slice(0, 8)}
                </span>
                <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase ${reportStatusBadgeClass(report.status)}`}>
                  {toStatusLabel(report.status)}
                </span>
              </div>
              <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                {report.title}
              </h1>
              <p className="mt-2 max-w-4xl whitespace-pre-wrap text-sm leading-7 text-slate-600 dark:text-slate-300">
                {report.description || 'Bu rapor icin aciklama girilmemis.'}
              </p>
            </div>
            {resolvedMapUrl && (
              <a
                href={resolvedMapUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <MapPin className="h-4 w-4 text-primary" />
                Haritada ac
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <DetailStat label="Kategori" value={report.categoryName} helper="Otomatik ya da secili kategori" />
            <DetailStat label="Vatandas" value={report.reporterFullName ?? 'Anonim / kayitsiz'} helper="Bildiren kisi" />
            <DetailStat
              label="Atanan"
              value={report.assigneeFullName ?? 'Henuz atanmis degil'}
              helper={report.forwardedDepartmentName ? `Departman: ${report.forwardedDepartmentName}` : 'Saha atamasi bekleniyor'}
            />
            <DetailStat label="Olusturulma" value={formatDate(report.createdAt)} helper={report.district || 'Ilce bilgisi yok'} />
          </div>
        </div>

        {report.mediaUrls && report.mediaUrls.length > 0 && (
          <div className="px-6 py-6 sm:px-8">
            <div className="mb-3 flex items-center justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">Medya kanitlari</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Sahadaki ekibin ve vatandasin paylastigi gorseller
                </p>
              </div>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                {report.mediaUrls.length} dosya
              </span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {report.mediaUrls.map((url, i) => (
                <a
                  key={i}
                  href={resolveMediaUrl(url)}
                  target="_blank"
                  rel="noreferrer"
                  className="group overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-700 dark:bg-slate-950"
                >
                  <img
                    src={resolveMediaUrl(url)}
                    alt={`Rapor gorseli ${i + 1}`}
                    className="h-44 w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                  />
                </a>
              ))}
            </div>
          </div>
        )}
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_380px]">
        <div className="space-y-6">
          <section className="rounded-3xl border border-violet-200/80 bg-gradient-to-r from-violet-50 via-white to-slate-50 p-5 shadow-sm dark:border-violet-900/40 dark:from-violet-950/30 dark:via-slate-900 dark:to-slate-950">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-violet-600 dark:text-violet-300" />
                  <p className="text-sm font-bold text-slate-900 dark:text-white">AI operasyon ozeti</p>
                </div>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Ozet, oncelik, kategori onerisi ve vatandasa donus notu tek yerde toplandi.
                </p>
              </div>
              <button
                type="button"
                disabled={aiBusy}
                onClick={() => void runAiAnalysis()}
                className="inline-flex items-center gap-1.5 rounded-xl bg-violet-600 px-3 py-2 text-xs font-bold text-white hover:bg-violet-700 disabled:opacity-50"
              >
                <Sparkles className="h-3.5 w-3.5" />
                {aiBusy ? 'Uretiliyor...' : 'AI yaniti olustur'}
              </button>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <MiniInfo
                label="Oncelik"
                value={report.aiPriority ?? 'Henuz yok'}
                helper={report.aiSuggestedCategory ? `Kategori onerisi: ${report.aiSuggestedCategory}` : 'Oncelik analizi bekleniyor'}
              />
              <MiniInfo
                label="Mukerrer sinyali"
                value={report.aiDuplicateHint ?? 'Temiz'}
                helper="Benzer kayitlar kontrol edilir"
              />
              <MiniInfo
                label="Vatandas notu"
                value={report.aiReplyDraft ? 'Hazir taslak var' : 'Taslak yok'}
                helper="Durum guncellerken kullanilabilir"
              />
            </div>

            <div className="mt-4 rounded-2xl border border-violet-200/70 bg-white/90 p-4 dark:border-violet-900/40 dark:bg-slate-900/70">
              {report.aiSummary ? (
                <p className="text-sm leading-7 text-slate-700 dark:text-slate-200">{report.aiSummary}</p>
              ) : (
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Henuz AI ozeti yok. Buton ile operasyona uygun bir ilk taslak uretebilirsin.
                </p>
              )}
              {report.aiReplyDraft && (
                <div className="mt-3 rounded-xl bg-violet-50 p-3 text-xs text-violet-900 dark:bg-violet-950/30 dark:text-violet-100">
                  <span className="font-bold">Taslak yanit:</span> {report.aiReplyDraft}
                </div>
              )}
            </div>
          </section>

          {(report.duplicateGroupSize != null && report.duplicateGroupSize > 1) || duplicateGroup.length > 0 ? (
            <section className="rounded-3xl border border-violet-200/90 bg-violet-50/80 p-5 shadow-sm dark:border-violet-900/50 dark:bg-violet-950/30">
              <div className="mb-3 flex items-center gap-2">
                <Layers className="h-5 w-5 text-violet-700 dark:text-violet-300" />
                <p className="text-sm font-bold text-violet-900 dark:text-violet-100">
                  Tek olay - ayni lokasyonda {report.duplicateGroupSize ?? duplicateGroup.length + 1} kayit
                </p>
              </div>
              <p className="mb-4 text-xs text-violet-800/90 dark:text-violet-200/90">
                Yakindaki bekleyen veya islenen kayitlar ayni olay olabilir. Gerekirse grup halinde kapatabilirsiniz.
              </p>
              <ul className="space-y-2">
                {duplicateGroup.map((d) => (
                  <li key={d.id}>
                    <Link
                      to={`/reports/${d.id}`}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-violet-200/60 bg-white px-3 py-2 text-sm hover:border-violet-300 dark:border-violet-800 dark:bg-slate-900"
                    >
                      <span className="font-medium text-slate-900 dark:text-white">{d.title}</span>
                      <span className="text-[10px] font-bold uppercase text-slate-500">{toStatusLabel(d.status)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
              {canResolve && (
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={bulkBusy !== null}
                    onClick={() => bulkCloseDuplicateGroup()}
                    className="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {bulkBusy === 'RESOLVED' ? 'Isleniyor...' : 'Grubu cozuldu isaretle'}
                  </button>
                </div>
              )}
            </section>
          ) : null}

          <section className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-5 flex items-start justify-between gap-3">
              <div>
                <p className="text-lg font-bold text-slate-900 dark:text-white">Yasam dongusu</p>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Tum hareketler ve vatandasa giden notlar zaman cizelgesinde gorunur.
                </p>
              </div>
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                <Clock3 className="h-3.5 w-3.5" />
                {timeline.length} adim
              </span>
            </div>

            {timeline.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 p-5 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                Henuz durum gecmisi bulunmuyor.
              </div>
            ) : (
              <div className="relative space-y-0 border-l-2 border-primary/20 pl-5">
                {timeline.map((entry, index) => (
                  <div key={`${entry.at}-${index}`} className="relative pb-7 last:pb-0">
                    <span className="absolute -left-[26px] top-1.5 h-3 w-3 rounded-full bg-primary ring-4 ring-white dark:ring-slate-900" />
                    <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
                      {formatDate(entry.at)}
                    </p>
                    <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">
                      {toStatusLabel(entry.oldStatus)} → {toStatusLabel(entry.newStatus)}
                    </p>
                    {entry.actorName && <p className="text-xs text-slate-500">{entry.actorName}</p>}
                    {entry.note && (
                      <div className="mt-2 rounded-xl bg-slate-50 p-3 text-sm text-slate-600 dark:bg-slate-800/70 dark:text-slate-300">
                        {entry.note}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        <div className="space-y-6 xl:sticky xl:top-6 xl:self-start">
          <section className="rounded-3xl border border-slate-200/90 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <p className="text-lg font-bold text-slate-900 dark:text-white">Atama ve yonlendirme</p>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Saha gorevlisi secin, gerekirse beyaz masa uzerinden departmana aktarim yapin.
            </p>

            <div className="mt-5 space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-700 dark:bg-slate-800/40">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Saha atamasi</p>
                <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">
                  {report.assigneeFullName ?? 'Atanmamis'}
                </p>
                <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                  <select
                    value={selectedOfficerId}
                    onChange={(e) => setSelectedOfficerId(e.target.value)}
                    className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  >
                    <option value="">Saha gorevlisi sec...</option>
                    {officers.map((officer) => (
                      <option key={officer.id} value={officer.id}>
                        {officer.firstName} {officer.lastName}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={handleAssign}
                    disabled={!selectedOfficerId || isAssigning}
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-sm font-bold text-white hover:bg-primary-hover disabled:opacity-50"
                  >
                    <UserPlus className="h-4 w-4" />
                    {isAssigning ? 'Isleniyor...' : 'Ata'}
                  </button>
                </div>
              </div>

              {isWhiteDesk && (
                <div className="rounded-2xl border border-violet-200 bg-violet-50/70 p-4 dark:border-violet-900/40 dark:bg-violet-950/20">
                  <p className="text-xs font-semibold uppercase tracking-wide text-violet-700 dark:text-violet-300">Departman aktarimi</p>
                  <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">
                    {report.forwardedDepartmentName ?? 'Henuz departmana aktarilmadi'}
                  </p>
                  <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                    <select
                      value={selectedDeptId}
                      onChange={(e) => setSelectedDeptId(e.target.value)}
                      className="min-w-0 flex-1 rounded-xl border border-violet-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-300 dark:border-violet-800 dark:bg-slate-900 dark:text-white"
                    >
                      <option value="">Departman sec...</option>
                      {departments.map((department) => (
                        <option key={department.id} value={department.id}>
                          {department.name}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={handleForward}
                      disabled={!selectedDeptId || isAssigning}
                      className="rounded-xl bg-violet-600 px-3 py-2 text-sm font-bold text-white hover:bg-violet-700 disabled:opacity-50"
                    >
                      {isAssigning ? 'Isleniyor...' : 'Yonlendir'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200/90 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <p className="text-lg font-bold text-slate-900 dark:text-white">Durum guncelle</p>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Vatandasa gidecek not ile birlikte kaydi guncelle.
            </p>

            <div className="mt-5 space-y-4">
              <div>
                <label htmlFor="statusSelect" className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Yeni durum
                </label>
                <select
                  id="statusSelect"
                  value={statusValue}
                  onChange={(e) => setStatusValue(e.target.value as 'PROCESSING' | 'RESOLVED')}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                >
                  <option value="PROCESSING">Islemde</option>
                  {canResolve && <option value="RESOLVED">Cozuldu</option>}
                </select>
              </div>

              <div>
                <label htmlFor="statusNote" className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Vatandasa not
                </label>
                <textarea
                  id="statusNote"
                  rows={6}
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder="Vatandasa iletilecek acik, nezih ve aksiyon odakli not..."
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                  AI taslagi uretildiginde bu alan otomatik dolacaktir.
                </p>
              </div>

              <button
                type="button"
                onClick={() => void saveStatus()}
                disabled={statusBusy}
                className="w-full rounded-xl bg-primary py-3 text-sm font-bold text-white transition-colors hover:bg-primary-hover disabled:opacity-60"
              >
                {statusBusy ? 'Kaydediliyor...' : 'Durumu kaydet'}
              </button>
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200/90 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <p className="text-lg font-bold text-slate-900 dark:text-white">Konum ve kayit bilgisi</p>
            <div className="mt-4 grid gap-3">
              <MiniInfo label="Koordinat" value={`${report.latitude}, ${report.longitude}`} helper="Saha dogrulamasi icin" />
              <MiniInfo label="Ilce" value={report.district || 'Belirtilmedi'} helper="Vatandas lokasyonu" />
              <MiniInfo
                label="Departman"
                value={report.forwardedDepartmentName ?? 'Yok'}
                helper={report.forwardedByName ? `Aktaran: ${report.forwardedByName}` : 'Direkt akista'}
              />
            </div>
          </section>
        </div>
      </div>
    </div>,
  );
}

function DetailStat({ label, value, helper }: { label: string; value: string; helper: string }) {
  return (
    <div className="rounded-2xl border border-slate-200/90 bg-white/90 p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900/80">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
        {label}
      </p>
      <p className="mt-1 text-sm font-bold text-slate-900 dark:text-white">{value}</p>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{helper}</p>
    </div>
  );
}

function MiniInfo({ label, value, helper }: { label: string; value: string; helper: string }) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-3 dark:border-slate-700 dark:bg-slate-800/50">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
        {label}
      </p>
      <p className="mt-1 text-sm font-bold text-slate-900 dark:text-white">{value}</p>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{helper}</p>
    </div>
  );
}
