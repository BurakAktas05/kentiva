import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  ExternalLink,
  Layers,
  MapPin,
  ShieldAlert,
  Sparkles,
  Tag,
  User as UserIcon,
  UserCheck,
  Calendar,
  Copy,
  Briefcase,
  Clock,
  ChevronRight,
  Ban,
  X,
  ChevronLeft,
  Camera,
  AlertTriangle,
  Send,
  ArrowRightLeft,
} from 'lucide-react';
import axios from 'axios';
import api, { type Report, type ReportListItem, type ReportTimelineEntry, type User } from '../api';
import { resolveMediaUrl } from '../lib/env';
import { reportStatusLabel } from '../lib/reportUtils';
import { reportStatusBadgeClass } from '../lib/ui';

/* ------------------------------------------------------------------ */
/*  TYPES & HELPERS                                                    */
/* ------------------------------------------------------------------ */
type ReportDetailPageProps = {
  reportId?: string;
  embedded?: boolean;
  onClose?: () => void;
};

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

const STATUS_DOT: Record<string, string> = {
  PENDING: 'bg-amber-500',
  PROCESSING: 'bg-sky-500',
  RESOLVED: 'bg-emerald-500',
  REJECTED: 'bg-red-500',
  OUT_OF_JURISDICTION: 'bg-purple-500',
};

/* ------------------------------------------------------------------ */
/*  LIGHTBOX                                                           */
/* ------------------------------------------------------------------ */
function Lightbox({ images, initialIndex, onClose }: { images: string[]; initialIndex: number; onClose: () => void }) {
  const [idx, setIdx] = useState(initialIndex);
  const prev = () => setIdx((i) => (i > 0 ? i - 1 : images.length - 1));
  const next = () => setIdx((i) => (i < images.length - 1 ? i + 1 : 0));

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') prev();
      if (e.key === 'ArrowRight') next();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  });

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={onClose}>
      <button type="button" onClick={onClose} className="absolute top-4 right-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20 transition cursor-pointer z-10">
        <X className="h-5 w-5" />
      </button>
      {images.length > 1 && (
        <>
          <button type="button" onClick={(e) => { e.stopPropagation(); prev(); }} className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white hover:bg-white/20 transition cursor-pointer z-10">
            <ChevronLeft className="h-6 w-6" />
          </button>
          <button type="button" onClick={(e) => { e.stopPropagation(); next(); }} className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white hover:bg-white/20 transition cursor-pointer z-10">
            <ChevronRight className="h-6 w-6" />
          </button>
        </>
      )}
      <img src={resolveMediaUrl(images[idx])} alt={`Fotoğraf ${idx + 1}`} className="max-h-[85vh] max-w-[90vw] rounded-xl object-contain shadow-2xl" onClick={(e) => e.stopPropagation()} />
      {images.length > 1 && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-1.5">
          {images.map((_, i) => (
            <button key={i} type="button" onClick={(e) => { e.stopPropagation(); setIdx(i); }} className={`h-2 rounded-full transition-all cursor-pointer ${i === idx ? 'w-6 bg-white' : 'w-2 bg-white/40 hover:bg-white/60'}`} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ================================================================== */
/*  MAIN COMPONENT                                                     */
/* ================================================================== */
export default function ReportDetailPage({ reportId: reportIdProp, embedded, onClose }: ReportDetailPageProps = {}) {
  const { id: routeId } = useParams<{ id: string }>();
  const id = reportIdProp ?? routeId;

  /* ---------- state ---------- */
  const [report, setReport] = useState<Report | null>(null);
  const [timeline, setTimeline] = useState<ReportTimelineEntry[]>([]);
  const [officers, setOfficers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([]);
  const [selectedOfficerId, setSelectedOfficerId] = useState('');
  const [selectedDeptId, setSelectedDeptId] = useState('');
  const [actionBusy, setActionBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [duplicateGroup, setDuplicateGroup] = useState<ReportListItem[]>([]);
  const [bulkBusy, setBulkBusy] = useState<'RESOLVED' | null>(null);
  const [aiBusy, setAiBusy] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [currentUser, setCurrentUser] = useState<any | null>(null);
  const [resolvedFiles, setResolvedFiles] = useState<File[]>([]);
  const [activeMediaTab, setActiveMediaTab] = useState<'BEFORE' | 'AFTER'>('BEFORE');
  const [lightboxImages, setLightboxImages] = useState<string[] | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  // Action flow state
  // PENDING: null → 'ACCEPT' / 'REJECT'
  // PROCESSING: null (default shows "Çözüldü" if applicable)
  type ActionStep = 'ACCEPT' | 'REJECT' | 'RESOLVE' | null;
  const [actionStep, setActionStep] = useState<ActionStep>(null);

  /* ---------- fetch ---------- */
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
        if (rep.aiReplyDraft) setNoteText(rep.aiReplyDraft);
        setActiveMediaTab(rep.mediaUrls?.length ? 'BEFORE' : rep.resolvedMediaUrls?.length ? 'AFTER' : 'BEFORE');
      } catch {
        if (!cancelled) setError('Rapor bulunamadi veya erisim yok.');
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  /* ---------- derived ---------- */
  const canResolve = currentUser?.departmentId != null || currentUser?.roles?.includes('ROLE_SUPER_ADMIN');
  const isWhiteDesk = currentUser?.roles?.includes('ROLE_WHITE_DESK');
  const isSuperAdmin = currentUser?.roles?.includes('ROLE_SUPER_ADMIN');
  const resolvedMapUrl = useMemo(() => mapUrl(report?.latitude, report?.longitude), [report?.latitude, report?.longitude]);
  const hasBeforeMedia = (report?.mediaUrls?.length ?? 0) > 0;
  const hasAfterMedia = (report?.resolvedMediaUrls?.length ?? 0) > 0;
  const hasAnyMedia = hasBeforeMedia || hasAfterMedia;
  const currentMediaList = activeMediaTab === 'BEFORE' ? (report?.mediaUrls ?? []) : (report?.resolvedMediaUrls ?? []);
  const isClosed = report ? ['RESOLVED', 'REJECTED', 'OUT_OF_JURISDICTION'].includes(report.status) : false;

  /* ---------- refresh ---------- */
  const refreshReport = async () => {
    if (!id) return;
    const [r, tl] = await Promise.all([api.get(`/reports/${id}`), api.get(`/reports/${id}/timeline`)]);
    const next = r.data.data as Report;
    setReport(next);
    setTimeline(tl.data.data as ReportTimelineEntry[]);
    setActiveMediaTab(next.mediaUrls?.length ? 'BEFORE' : next.resolvedMediaUrls?.length ? 'AFTER' : 'BEFORE');
  };

  /* ---------- AI Reply Generation ---------- */
  const generateAiReply = async (targetStatus: string) => {
    if (!id) return;
    setAiBusy(true);
    setError(null);
    try {
      const res = await api.post(`/reports/${id}/ai-analysis?status=${targetStatus}`);
      const data = res.data?.data as Report | undefined;
      if (data) {
        setReport(data);
        if (data.aiReplyDraft) {
          setNoteText(data.aiReplyDraft);
          setSuccessMsg('AI yanıt taslağı oluşturuldu.');
        } else {
          setSuccessMsg('AI analizi tamamlandı ancak yanıt taslağı oluşturulamadı.');
        }
      }
      window.setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: unknown) {
      setError(errorMessage(err, 'AI yanıt oluşturulamadı. Lütfen tekrar deneyin.'));
    } finally {
      setAiBusy(false);
    }
  };

  /* ---------- Patch status ---------- */
  const patchStatus = async (status: string) => {
    if (!id) return;
    let resolvedUrls: string[] = [];
    if (status === 'RESOLVED' && resolvedFiles.length > 0) {
      const formData = new FormData();
      resolvedFiles.forEach((f) => formData.append('files', f));
      const uploadRes = await api.post('/reports/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      resolvedUrls = uploadRes.data.data;
    }
    await api.patch(`/reports/${id}/status`, {
      status,
      note: noteText.trim() || null,
      resolvedMediaUrls: resolvedUrls.length > 0 ? resolvedUrls : null,
    });
    setResolvedFiles([]);
  };

  /* ---------- ACCEPT: take into processing ---------- */
  const handleAccept = async () => {
    if (!id || actionBusy || !report) return;
    setActionBusy(true); setError(null); setSuccessMsg(null);
    try {
      // Assign officer if selected
      if (selectedOfficerId) {
        await api.post(`/reports/${id}/assign`, { assigneeId: selectedOfficerId });
        setSelectedOfficerId('');
      }
      // Forward to dept if selected
      else if (selectedDeptId && isWhiteDesk) {
        await api.post(`/reports/${id}/forward`, { departmentId: selectedDeptId, note: noteText.trim() || null });
        setSelectedDeptId('');
      }

      // If not forwarded, patch status to PROCESSING
      if (!selectedDeptId || !isWhiteDesk) {
        // Only patch if officer assignment didn't already trigger PROCESSING
        if (!selectedOfficerId || noteText.trim()) {
          await patchStatus('PROCESSING');
        }
      }

      setActionStep(null);
      await refreshReport();
      setNoteText('');
      setSuccessMsg('İhbar işleme alındı.');
      window.setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: unknown) {
      setError(errorMessage(err, 'İşleme alma başarısız.'));
    } finally {
      setActionBusy(false);
    }
  };

  /* ---------- REJECT / OUT_OF_JURISDICTION ---------- */
  const [rejectReason, setRejectReason] = useState<'REJECTED' | 'OUT_OF_JURISDICTION'>('OUT_OF_JURISDICTION');

  const handleReject = async () => {
    if (!id || actionBusy || !report) return;
    setActionBusy(true); setError(null); setSuccessMsg(null);
    try {
      await patchStatus(rejectReason);
      setActionStep(null);
      await refreshReport();
      setNoteText('');
      setSuccessMsg('İhbar kapatıldı.');
      window.setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: unknown) {
      setError(errorMessage(err, 'Kapatma başarısız.'));
    } finally {
      setActionBusy(false);
    }
  };

  /* ---------- RESOLVE ---------- */
  const handleResolve = async () => {
    if (!id || actionBusy || !report) return;
    setActionBusy(true); setError(null); setSuccessMsg(null);
    try {
      await patchStatus('RESOLVED');
      setActionStep(null);
      await refreshReport();
      setNoteText('');
      setSuccessMsg('İhbar çözüldü olarak kaydedildi.');
      window.setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: unknown) {
      setError(errorMessage(err, 'Çözüm kaydı başarısız.'));
    } finally {
      setActionBusy(false);
    }
  };

  /* ---------- Assign officer (PROCESSING state) ---------- */
  const handleAssignOfficer = async () => {
    if (!id || actionBusy || !selectedOfficerId) return;
    setActionBusy(true); setError(null); setSuccessMsg(null);
    try {
      await api.post(`/reports/${id}/assign`, { assigneeId: selectedOfficerId });
      setSelectedOfficerId('');
      await refreshReport();
      setSuccessMsg('Görevli atandı.');
      window.setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: unknown) {
      setError(errorMessage(err, 'Görevli atama başarısız.'));
    } finally {
      setActionBusy(false);
    }
  };

  /* ---------- Bulk close duplicate group ---------- */
  const bulkCloseDuplicateGroup = async () => {
    if (!id || !report) return;
    const ids = [...new Set([id, ...duplicateGroup.filter((d) => d.status !== 'RESOLVED' && d.status !== 'REJECTED').map((d) => d.id)])];
    if (ids.length < 2) return;
    if (!window.confirm(`${ids.length} ihbari toplu "cozuldu" olarak isaretlemek istiyor musunuz?`)) return;
    setBulkBusy('RESOLVED'); setError(null);
    try {
      const res = await api.patch('/reports/batch/status', { reportIds: ids, status: 'RESOLVED', note: 'Mukerrer grup - toplu kapatma' });
      const result = res.data.data as { successCount: number; failureCount: number };
      if (result.failureCount > 0) setError(`${result.successCount} guncellendi, ${result.failureCount} basarisiz.`);
      else window.location.reload();
    } catch { setError('Toplu guncelleme basarisiz.'); }
    finally { setBulkBusy(null); }
  };

  /* ---------- nav ---------- */
  const backNav = embedded ? (
    <button type="button" onClick={onClose} className="inline-flex items-center gap-2 text-sm font-bold text-primary hover:underline">
      <ArrowLeft className="h-4 w-4" /> Haritaya dön
    </button>
  ) : (
    <Link to="/reports" className="inline-flex items-center gap-2 text-sm font-bold text-primary hover:underline">
      <ArrowLeft className="h-4 w-4" /> Raporlara dön
    </Link>
  );
  const wrapEmbedded = (node: ReactNode) => node;

  /* ---------- loading / error ---------- */
  if (error && !report) return wrapEmbedded(
    <div className="p-6">{backNav}<div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-6 text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">{error}</div></div>,
  );
  if (!report) return wrapEmbedded(
    <div className="flex items-center justify-center p-12"><div className="flex flex-col items-center gap-3"><div className="h-8 w-8 animate-spin rounded-full border-[3px] border-slate-200 border-t-primary" /><span className="text-sm font-medium text-slate-500">Yükleniyor...</span></div></div>,
  );

  /* ================================================================ */
  /*  RENDER                                                           */
  /* ================================================================ */
  return wrapEmbedded(
    <div className="space-y-6 p-6">
      {lightboxImages && <Lightbox images={lightboxImages} initialIndex={lightboxIndex} onClose={() => setLightboxImages(null)} />}

      {backNav}

      {/* ---- Alerts ---- */}
      {error && (
        <div className="flex items-start gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" /><span>{error}</span>
        </div>
      )}
      {successMsg && (
        <div className="flex items-start gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /><span>{successMsg}</span>
        </div>
      )}

      {/* ================================================================ */}
      {/*  HEADER CARD                                                     */}
      {/* ================================================================ */}
      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="p-6">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-slate-900 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-white dark:bg-slate-200 dark:text-slate-900">#{report.id.slice(0, 8)}</span>
            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase ${reportStatusBadgeClass(report.status)}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[report.status] ?? 'bg-slate-400'} ${report.status === 'PENDING' || report.status === 'PROCESSING' ? 'animate-pulse' : ''}`} />
              {reportStatusLabel(report.status)}
            </span>
            {report.slaBreached && (
              <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700 dark:bg-red-900/40 dark:text-red-300">
                <AlertTriangle className="h-3 w-3" />SLA Aşımı
              </span>
            )}
          </div>
          <h1 className="mt-3 text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">{report.title}</h1>
          {report.description && (
            <p className="mt-2 max-w-4xl whitespace-pre-wrap text-sm leading-relaxed text-slate-600 dark:text-slate-300">{report.description}</p>
          )}
          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate-500 dark:text-slate-400">
            <span className="inline-flex items-center gap-1.5"><Tag className="h-3.5 w-3.5" />{report.categoryName}</span>
            <span className="inline-flex items-center gap-1.5"><UserIcon className="h-3.5 w-3.5" />{report.reporterFullName ?? 'Anonim'}</span>
            <span className="inline-flex items-center gap-1.5"><UserCheck className="h-3.5 w-3.5" />{report.assigneeFullName ?? 'Atanmamış'}</span>
            <span className="inline-flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" />{formatDate(report.createdAt)}</span>
            <span className="inline-flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" />{report.district || 'Konum yok'}</span>
            {report.forwardedDepartmentName && (
              <span className="inline-flex items-center gap-1.5"><Briefcase className="h-3.5 w-3.5" />{report.forwardedDepartmentName}</span>
            )}
            {report.trackingNumber && (
              <span className="inline-flex items-center gap-1.5"><Copy className="h-3.5 w-3.5" />{report.trackingNumber}</span>
            )}
            {resolvedMapUrl && (
              <a href={resolvedMapUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-semibold text-primary hover:underline">
                <ExternalLink className="h-3 w-3" />Haritada Aç
              </a>
            )}
          </div>
        </div>
      </section>

      {/* ================================================================ */}
      {/*  CONTENT: Two-Column                                              */}
      {/* ================================================================ */}
      <div className="grid gap-6 lg:grid-cols-2">

        {/* ============== LEFT COLUMN ============== */}
        <div className="space-y-6">

          {/* ---- PHOTO GALLERY ---- */}
          {hasAnyMedia && (
            <section className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
              {hasBeforeMedia && hasAfterMedia ? (
                <div className="flex border-b border-slate-100 dark:border-slate-800">
                  <button type="button" onClick={() => setActiveMediaTab('BEFORE')} className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[11px] font-bold border-b-2 transition cursor-pointer ${activeMediaTab === 'BEFORE' ? 'border-primary text-primary' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>
                    <Camera className="h-3 w-3" />İhbar ({report.mediaUrls!.length})
                  </button>
                  <button type="button" onClick={() => setActiveMediaTab('AFTER')} className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[11px] font-bold border-b-2 transition cursor-pointer ${activeMediaTab === 'AFTER' ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>
                    <CheckCircle2 className="h-3 w-3" />Çözüm ({report.resolvedMediaUrls!.length})
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-slate-100 dark:border-slate-800">
                  {hasBeforeMedia ? <Camera className="h-3 w-3 text-slate-400" /> : <CheckCircle2 className="h-3 w-3 text-slate-400" />}
                  <span className="text-[11px] font-bold text-slate-500">{hasBeforeMedia ? `İhbar Fotoğrafları (${report.mediaUrls!.length})` : `Çözüm Fotoğrafları (${report.resolvedMediaUrls!.length})`}</span>
                </div>
              )}
              <div className="p-3 grid grid-cols-3 gap-2">
                {currentMediaList.map((url, i) => (
                  <button key={i} type="button" onClick={() => { setLightboxImages(currentMediaList); setLightboxIndex(i); }} className="group relative aspect-square cursor-pointer overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-800">
                    <img src={resolveMediaUrl(url)} alt={`Görsel ${i + 1}`} className="h-full w-full object-cover transition duration-200 group-hover:scale-105" />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* ---- DUPLICATE GROUP ---- */}
          {((report.duplicateGroupSize != null && report.duplicateGroupSize > 1) || duplicateGroup.length > 0) && (
            <section className="rounded-2xl border border-amber-200 bg-amber-50/40 p-5 shadow-sm dark:border-amber-900/30 dark:bg-amber-950/10">
              <div className="flex items-center gap-2 mb-3">
                <Layers className="h-4 w-4 text-amber-600" />
                <p className="text-sm font-bold text-amber-900 dark:text-amber-200">Mükerrer Grup ({report.duplicateGroupSize ?? duplicateGroup.length + 1})</p>
              </div>
              <ul className="space-y-1.5">
                {duplicateGroup.map((d) => (
                  <li key={d.id}>
                    <Link to={`/reports/${d.id}`} className="flex items-center justify-between gap-2 rounded-lg border border-amber-200/40 bg-white px-3 py-2 text-xs hover:border-amber-300 transition dark:border-slate-800 dark:bg-slate-900">
                      <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">{d.title}</span>
                      <span className={`kentiva-status-badge shrink-0 ${reportStatusBadgeClass(d.status)}`}>{reportStatusLabel(d.status)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
              {canResolve && (
                <button type="button" disabled={bulkBusy !== null} onClick={() => bulkCloseDuplicateGroup()} className="mt-3 w-full rounded-lg bg-amber-600 hover:bg-amber-700 px-3 py-2 text-[11px] font-bold text-white transition shadow-sm disabled:opacity-50 cursor-pointer">
                  {bulkBusy === 'RESOLVED' ? 'Kapatılıyor...' : 'Tümünü Kapat'}
                </button>
              )}
            </section>
          )}

          {/* ---- İŞLEM MERKEZİ ---- */}
          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-3.5 border-b border-slate-100 dark:border-slate-800">
              <Briefcase className="h-4 w-4 text-primary" />
              <span className="text-sm font-bold text-slate-900 dark:text-white">İşlem Merkezi</span>
            </div>

            <div className="p-5">

              {/* ===== CLOSED ===== */}
              {isClosed && (
                <div className="flex flex-col items-center text-center py-4">
                  {report.status === 'RESOLVED' ? (
                    <div className="h-14 w-14 rounded-full bg-emerald-100 flex items-center justify-center dark:bg-emerald-900/30"><CheckCircle2 className="h-7 w-7 text-emerald-600" /></div>
                  ) : (
                    <div className="h-14 w-14 rounded-full bg-rose-100 flex items-center justify-center dark:bg-rose-900/30"><Ban className="h-7 w-7 text-rose-600" /></div>
                  )}
                  <h3 className="mt-3 text-sm font-bold text-slate-900 dark:text-white">İhbar Kapatılmıştır</h3>
                  <p className="mt-1 text-xs text-slate-500">Durum: <span className="font-semibold">{reportStatusLabel(report.status)}</span></p>
                </div>
              )}

              {/* ===== PENDING — Initial Choice ===== */}
              {report.status === 'PENDING' && actionStep === null && (
                <div className="space-y-3">
                  <div className="rounded-xl border border-amber-200 bg-amber-50/70 px-4 py-3 dark:border-amber-900/40 dark:bg-amber-950/20">
                    <p className="text-xs font-semibold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5" />Bu ihbar henüz işleme alınmadı.
                    </p>
                  </div>

                  <button type="button" onClick={() => setActionStep('ACCEPT')} className="w-full flex items-center justify-between rounded-xl border-2 border-emerald-200 bg-emerald-50/50 px-4 py-3.5 text-sm font-bold text-emerald-800 hover:bg-emerald-100 hover:border-emerald-300 transition active:scale-[0.99] cursor-pointer dark:border-emerald-900/50 dark:bg-emerald-950/20 dark:text-emerald-200">
                    <span className="flex items-center gap-2"><CheckCircle2 className="h-5 w-5" />Kabul Et</span>
                    <ChevronRight className="h-4 w-4 opacity-40" />
                  </button>

                  <button type="button" onClick={() => setActionStep('REJECT')} className="w-full flex items-center justify-between rounded-xl border-2 border-rose-200 bg-rose-50/50 px-4 py-3.5 text-sm font-bold text-rose-800 hover:bg-rose-100 hover:border-rose-300 transition active:scale-[0.99] cursor-pointer dark:border-rose-900/50 dark:bg-rose-950/20 dark:text-rose-200">
                    <span className="flex items-center gap-2"><Ban className="h-5 w-5" />Reddet</span>
                    <ChevronRight className="h-4 w-4 opacity-40" />
                  </button>
                </div>
              )}

              {/* ===== PENDING → ACCEPT ===== */}
              {report.status === 'PENDING' && actionStep === 'ACCEPT' && (
                <div className="space-y-4">
                  <button type="button" onClick={() => setActionStep(null)} className="flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-700 transition cursor-pointer">
                    <ArrowLeft className="h-3 w-3" />Geri
                  </button>

                  {/* Officer assignment */}
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Görevli Ata (opsiyonel)</label>
                    <select value={selectedOfficerId} onChange={(e) => setSelectedOfficerId(e.target.value)} disabled={actionBusy} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white">
                      <option value="">Görevli seç...</option>
                      {officers.map((o) => <option key={o.id} value={o.id}>{o.firstName} {o.lastName}</option>)}
                    </select>
                  </div>

                  {/* Forward to department */}
                  {isWhiteDesk && (
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Departmana Yönlendir (opsiyonel)</label>
                      <select value={selectedDeptId} onChange={(e) => setSelectedDeptId(e.target.value)} disabled={actionBusy} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white">
                        <option value="">Departman seç...</option>
                        {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                      </select>
                    </div>
                  )}

                  {/* Note + AI */}
                  <NoteWithAI
                    noteText={noteText}
                    setNoteText={setNoteText}
                    disabled={actionBusy}
                    aiBusy={aiBusy}
                    onGenerateAI={() => void generateAiReply('PROCESSING')}
                    aiLabel="İşlemde"
                    placeholder="Vatandaşa iletilecek not (opsiyonel)..."
                  />

                  <button type="button" onClick={() => void handleAccept()} disabled={actionBusy} className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 py-3 text-sm font-bold text-white transition shadow-sm active:scale-[0.99] disabled:opacity-60 cursor-pointer flex items-center justify-center gap-2">
                    <CheckCircle2 className="h-4 w-4" />
                    {actionBusy ? 'İşleniyor...' : 'Kabul Et — İşleme Al'}
                  </button>
                </div>
              )}

              {/* ===== PENDING → REJECT ===== */}
              {report.status === 'PENDING' && actionStep === 'REJECT' && (
                <div className="space-y-4">
                  <button type="button" onClick={() => setActionStep(null)} className="flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-700 transition cursor-pointer">
                    <ArrowLeft className="h-3 w-3" />Geri
                  </button>

                  {/* Reject reason */}
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Kapatma Gerekçesi</label>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => setRejectReason('OUT_OF_JURISDICTION')} className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold border-2 transition cursor-pointer ${rejectReason === 'OUT_OF_JURISDICTION' ? 'border-purple-400 bg-purple-50 text-purple-700 dark:border-purple-800 dark:bg-purple-950/40 dark:text-purple-300' : 'border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'}`}>
                        Yetki Alanı Dışı
                      </button>
                      {(isSuperAdmin || currentUser?.municipality?.allowMunicipalityRejection) && (
                        <button type="button" onClick={() => setRejectReason('REJECTED')} className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold border-2 transition cursor-pointer ${rejectReason === 'REJECTED' ? 'border-red-400 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300' : 'border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'}`}>
                          Reddet
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Note + AI */}
                  <NoteWithAI
                    noteText={noteText}
                    setNoteText={setNoteText}
                    disabled={actionBusy}
                    aiBusy={aiBusy}
                    onGenerateAI={() => void generateAiReply(rejectReason)}
                    aiLabel={rejectReason === 'REJECTED' ? 'Red' : 'Yetki Dışı'}
                    label="Red Gerekçesi"
                    placeholder="Vatandaşa iletilecek red gerekçesi..."
                  />

                  <button type="button" onClick={() => void handleReject()} disabled={actionBusy} className="w-full rounded-xl bg-rose-600 hover:bg-rose-700 py-3 text-sm font-bold text-white transition shadow-sm active:scale-[0.99] disabled:opacity-60 cursor-pointer flex items-center justify-center gap-2">
                    <Ban className="h-4 w-4" />
                    {actionBusy ? 'Kaydediliyor...' : 'Kapatmayı Onayla'}
                  </button>
                </div>
              )}

              {/* ===== PROCESSING & FORWARDED ===== */}
              {(report.status === 'PROCESSING' || report.status === 'FORWARDED') && (
                <div className="space-y-4">
                  {/* Current officer */}
                  {report.assigneeFullName && (
                    <div className="rounded-xl border border-sky-200 bg-sky-50/60 px-4 py-3 dark:border-sky-900/40 dark:bg-sky-950/20 flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-sky-100 dark:bg-sky-900/50 shrink-0">
                        <UserCheck className="h-4 w-4 text-sky-600 dark:text-sky-400" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-sky-900 dark:text-sky-200 truncate">{report.assigneeFullName}</p>
                        <p className="text-[11px] text-sky-700 dark:text-sky-400">Atanan saha görevlisi</p>
                      </div>
                    </div>
                  )}

                  {/* If no officer assigned → show assign */}
                  {!report.assigneeFullName && (
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Görevli Ata</label>
                      <div className="flex gap-2">
                        <select value={selectedOfficerId} onChange={(e) => setSelectedOfficerId(e.target.value)} disabled={actionBusy} className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white">
                          <option value="">Görevli seç...</option>
                          {officers.map((o) => <option key={o.id} value={o.id}>{o.firstName} {o.lastName}</option>)}
                        </select>
                        {selectedOfficerId && (
                          <button type="button" onClick={() => void handleAssignOfficer()} disabled={actionBusy} className="rounded-lg bg-primary hover:bg-primary-hover px-4 text-sm font-bold text-white transition disabled:opacity-60 cursor-pointer" aria-label="Değişiklikleri Kaydet">
                            <Send className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Resolve Form directly shown */}
                  <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-4">
                    {/* Note + AI */}
                    <NoteWithAI
                      noteText={noteText}
                      setNoteText={setNoteText}
                      disabled={actionBusy}
                      aiBusy={aiBusy}
                      onGenerateAI={() => void generateAiReply('RESOLVED')}
                      aiLabel="Çözüm"
                      label="Çözüm Notu"
                      placeholder="Vatandaşa iletilecek çözüm açıklaması..."
                    />

                    <button type="button" onClick={() => void handleResolve()} disabled={actionBusy} className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 py-3 text-sm font-bold text-white transition shadow-sm active:scale-[0.99] disabled:opacity-60 cursor-pointer flex items-center justify-center gap-2" aria-label="Çözüldü Yap">
                      <CheckCircle2 className="h-4 w-4" />
                      {actionBusy ? 'Kaydediliyor...' : 'Çözüldü Yap'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>

        {/* ============== RIGHT COLUMN — TIMELINE ============== */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 self-start">
          <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-4 mb-5 dark:border-slate-800">
            <div>
              <p className="text-sm font-bold text-slate-900 dark:text-white">Yaşam Döngüsü</p>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Rapor üzerinde yapılan tüm işlemler</p>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              <Clock className="h-3.5 w-3.5" />{timeline.length}
            </span>
          </div>

          {timeline.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
              Henüz işlem geçmişi bulunmuyor.
            </div>
          ) : (
            <div className="relative border-l-2 border-slate-200 pl-6 dark:border-slate-800 ml-3 space-y-0">
              {timeline.map((entry, index) => {
                const dot = STATUS_DOT[entry.newStatus ?? ''] ?? 'bg-slate-400';
                return (
                  <div key={`${entry.at}-${index}`} className="relative pb-7 last:pb-0">
                    <span className={`absolute -left-[31px] top-1 flex h-4 w-4 items-center justify-center rounded-full ring-4 ring-white dark:ring-slate-900 ${dot}`} />
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{formatDate(entry.at)}</p>
                    <p className="mt-1 text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <span className="opacity-60 font-medium">{reportStatusLabel(entry.oldStatus)}</span>
                      <ChevronRight size={14} className="text-slate-400" />
                      <span className="text-primary dark:text-sky-400">{reportStatusLabel(entry.newStatus)}</span>
                    </p>
                    {entry.actorName && <p className="text-xs text-slate-500 mt-0.5 font-medium">İşlemi Yapan: {entry.actorName}</p>}
                    {entry.note && (
                      <div className="mt-2 rounded-xl bg-slate-50 p-3 text-sm text-slate-700 border border-slate-100 dark:bg-slate-800/40 dark:border-slate-800/60 dark:text-slate-300 leading-relaxed">
                        {entry.note}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>,
  );
}

/* ------------------------------------------------------------------ */
/*  Note + AI button sub-component                                     */
/* ------------------------------------------------------------------ */
function NoteWithAI({
  noteText,
  setNoteText,
  disabled,
  aiBusy,
  onGenerateAI,
  aiLabel,
  label = 'Vatandaşa Not',
  placeholder = 'Vatandaşa iletilecek not...',
}: {
  noteText: string;
  setNoteText: (v: string) => void;
  disabled: boolean;
  aiBusy: boolean;
  onGenerateAI: () => void;
  aiLabel: string;
  label?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label htmlFor="statusNote" className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{label}</label>
        <button type="button" disabled={aiBusy || disabled} onClick={onGenerateAI} className="inline-flex items-center gap-1 rounded-lg bg-violet-600 hover:bg-violet-700 text-white px-2.5 py-1 text-[11px] font-bold transition shadow-xs disabled:opacity-50 cursor-pointer">
          <Sparkles className="h-3 w-3" />
          {aiBusy ? 'Üretiliyor...' : `AI Yanıtı (${aiLabel})`}
        </button>
      </div>
      <textarea id="statusNote" rows={3} value={noteText} onChange={(e) => setNoteText(e.target.value)} disabled={disabled} placeholder={placeholder} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white leading-relaxed" />
    </div>
  );
}
