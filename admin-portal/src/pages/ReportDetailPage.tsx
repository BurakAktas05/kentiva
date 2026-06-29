import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  ExternalLink,
  Layers,
  MapPin,
  ShieldAlert,
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
  Search,
} from 'lucide-react';
import axios from 'axios';
import api, { type Report, type ReportListItem, type ReportTimelineEntry, type User } from '../api';
import { resolveMediaUrl } from '../lib/env';
import { reportStatusLabel } from '../lib/reportUtils';
import { reportStatusBadgeClass } from '../lib/ui';

/* ------------------------------------------------------------------ */
/*  TYPES & HELPERS                                                    */
/* ------------------------------------------------------------------ */
function isDefaultPendingNote(text: string) {
  if (!text) return true;
  const trimmed = text.trim();
  return trimmed === "Bildiriminiz için teşekkür ederiz. Ekiplerimiz konuyu değerlendirmektedir; süreç hakkında bilgilendirileceksiniz."
    || trimmed === "Thank you for your report. Our teams are working on it and we will update you as soon as possible."
    || trimmed === "شكراً لبلاğكم. فرقنا تعمل على المعalجة وسنبلغكم عند اكتمal الإجراء."
    || trimmed.includes("Bildiriminiz için teşekkür ederiz")
    || trimmed.includes("Thank you for your report")
    || trimmed.includes("%s")
    || trimmed.includes("شكراً لبlağكم");
}

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
  REJECTED: 'bg-rose-500',
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
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/85 backdrop-blur-md" onClick={onClose}>
      <button type="button" onClick={onClose} className="absolute top-6 right-6 rounded-full bg-white/10 p-3 text-white hover:bg-white/20 transition cursor-pointer z-10">
        <X className="h-6 w-6" />
      </button>
      {images.length > 1 && (
        <>
          <button type="button" onClick={(e) => { e.stopPropagation(); prev(); }} className="absolute left-6 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-4 text-white hover:bg-white/20 transition cursor-pointer z-10">
            <ChevronLeft className="h-8 w-8" />
          </button>
          <button type="button" onClick={(e) => { e.stopPropagation(); next(); }} className="absolute right-6 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-4 text-white hover:bg-white/20 transition cursor-pointer z-10">
            <ChevronRight className="h-8 w-8" />
          </button>
        </>
      )}
      <img src={resolveMediaUrl(images[idx])} alt={`Fotoğraf ${idx + 1}`} className="max-h-[85vh] max-w-[90vw] rounded-2xl object-contain shadow-2xl border border-white/10" onClick={(e) => e.stopPropagation()} />
      {images.length > 1 && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-2">
          {images.map((_, i) => (
            <button key={i} type="button" onClick={(e) => { e.stopPropagation(); setIdx(i); }} className={`h-2.5 rounded-full transition-all cursor-pointer ${i === idx ? 'w-8 bg-white' : 'w-2.5 bg-white/30 hover:bg-white/50'}`} />
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

  const [noteText, setNoteText] = useState('');
  const [currentUser, setCurrentUser] = useState<any | null>(null);
  const [resolvedFiles, setResolvedFiles] = useState<File[]>([]);
  const [activeMediaTab, setActiveMediaTab] = useState<'BEFORE' | 'AFTER'>('BEFORE');
  const [lightboxImages, setLightboxImages] = useState<string[] | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [showAssignPanel, setShowAssignPanel] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDeptFilter, setSelectedDeptFilter] = useState('');

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
          api.get('/users?size=200').catch(() => ({ data: { data: [] } })),
          api.get(`/reports/${id}/duplicate-group`),
          api.get('/auth/me'),
          api.get('/departments').catch(() => ({ data: { data: [] } })),
        ]);
        if (cancelled) return;
        const rep = r.data.data as Report;
        setReport(rep);
        setTimeline(tl.data.data as ReportTimelineEntry[]);
        const list = (u.data.data?.content ?? []) as User[];
        setOfficers(list.filter((usr: User) => !usr.roles.includes('ROLE_CITIZEN')));
        setDepartments((depsRes.data.data?.content ?? []) as { id: string; name: string }[]);
        setDuplicateGroup(dup.data.data as ReportListItem[]);
        setCurrentUser(me.data.data);
        if (rep.aiReplyDraft) setNoteText(rep.aiReplyDraft);
        setActiveMediaTab(rep.mediaUrls?.length ? 'BEFORE' : rep.resolvedMediaUrls?.length ? 'AFTER' : 'BEFORE');
      } catch {
        if (!cancelled) setError('Rapor bulunamadı veya erişim yok.');
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  useEffect(() => {
    if (actionStep === 'ACCEPT' || actionStep === 'REJECT') {
      setNoteText((prev) => {
        if (isDefaultPendingNote(prev)) {
          return '';
        }
        return prev;
      });
    }
  }, [actionStep]);

  useEffect(() => {
    if (report && (report.status === 'PROCESSING' || report.status === 'FORWARDED')) {
      setNoteText((prev) => {
        if (isDefaultPendingNote(prev)) {
          return '';
        }
        return prev;
      });
    }
  }, [report?.status]);

  /* ---------- derived ---------- */
  const filteredOfficers = useMemo(() => {
    return officers.filter((o: User) => {
      const name = `${o.firstName} ${o.lastName}`.toLowerCase();
      const email = o.email.toLowerCase();
      const query = searchQuery.toLowerCase();
      const matchesSearch = name.includes(query) || email.includes(query);
      const matchesDept = selectedDeptFilter ? o.departmentId === selectedDeptFilter : true;
      return matchesSearch && matchesDept;
    });
  }, [officers, searchQuery, selectedDeptFilter]);

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

  /* ---------- ACCEPT ---------- */
  const handleAccept = async () => {
    if (!id || actionBusy || !report) return;
    setActionBusy(true); setError(null); setSuccessMsg(null);
    try {
      if (selectedOfficerId) {
        await api.post(`/reports/${id}/assign`, { assigneeId: selectedOfficerId });
        setSelectedOfficerId('');
      } else if (selectedDeptId && isWhiteDesk) {
        await api.post(`/reports/${id}/forward`, { departmentId: selectedDeptId, note: noteText.trim() || null });
        setSelectedDeptId('');
      }

      if (!selectedDeptId || !isWhiteDesk) {
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

  /* ---------- Bulk close duplicate group ---------- */
  const bulkCloseDuplicateGroup = async () => {
    if (!id || !report) return;
    const ids = [...new Set([id, ...duplicateGroup.filter((d) => d.status !== 'RESOLVED' && d.status !== 'REJECTED').map((d) => d.id)])];
    if (ids.length < 2) return;
    if (!window.confirm(`${ids.length} ihbarı toplu "çözüldü" olarak işaretlemek istiyor musunuz?`)) return;
    setBulkBusy('RESOLVED'); setError(null);
    try {
      const res = await api.patch('/reports/batch/status', { reportIds: ids, status: 'RESOLVED', note: 'Mükerrer grup - toplu kapatma' });
      const result = res.data.data as { successCount: number; failureCount: number };
      if (result.failureCount > 0) setError(`${result.successCount} güncellendi, ${result.failureCount} başarısız.`);
      else window.location.reload();
    } catch { setError('Toplu güncelleme başarısız.'); }
    finally { setBulkBusy(null); }
  };

  const backNav = embedded ? (
    <button type="button" onClick={onClose} className="inline-flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-primary dark:text-slate-400 dark:hover:text-white transition duration-150">
      <ArrowLeft className="h-4 w-4" /> Haritaya dön
    </button>
  ) : (
    <Link to="/reports" className="inline-flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-primary dark:text-slate-400 dark:hover:text-white transition duration-150">
      <ArrowLeft className="h-4 w-4" /> Raporlara dön
    </Link>
  );

  const wrapEmbedded = (node: ReactNode) => node;

  if (error && !report) return wrapEmbedded(
    <div className="p-6">{backNav}<div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-6 text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">{error}</div></div>,
  );
  if (!report) return wrapEmbedded(
    <div className="flex items-center justify-center p-12"><div className="flex flex-col items-center gap-3"><div className="h-8 w-8 animate-spin rounded-full border-[3px] border-slate-200 border-t-primary" /><span className="text-sm font-medium text-slate-500">Yükleniyor...</span></div></div>,
  );

  return wrapEmbedded(
    <div className="space-y-6 p-6 max-w-[1400px] mx-auto">
      {lightboxImages && <Lightbox images={lightboxImages} initialIndex={lightboxIndex} onClose={() => setLightboxImages(null)} />}

      <div className="flex items-center justify-between">
        {backNav}
      </div>

      {/* ---- Alerts ---- */}
      {error && (
        <div className="flex items-start gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200 shadow-sm">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" /><span>{error}</span>
        </div>
      )}
      {successMsg && (
        <div className="flex items-start gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200 shadow-sm">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /><span>{successMsg}</span>
        </div>
      )}

      {/* ================================================================ */}
      {/*  HEADER & STATUS PANEL                                           */}
      {/* ================================================================ */}
      <section className="relative overflow-hidden rounded-[2rem] border border-white/60 bg-white/80 p-8 shadow-[0_20px_50px_-20px_rgba(15,23,42,0.08)] backdrop-blur-md dark:border-slate-800/80 dark:bg-slate-900/80">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
          <div className="space-y-3 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-slate-950 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-white dark:bg-slate-800 dark:text-slate-350">
                #{report.id.slice(0, 8)}
              </span>
              <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold uppercase shadow-sm ${reportStatusBadgeClass(report.status)}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[report.status] ?? 'bg-slate-400'} ${report.status === 'PENDING' || report.status === 'PROCESSING' ? 'animate-pulse' : ''}`} />
                {reportStatusLabel(report.status)}
              </span>
              {report.slaBreached && (
                <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 border border-rose-200 px-3 py-1 text-[10px] font-black text-rose-700 dark:bg-rose-950/40 dark:border-rose-900 dark:text-rose-300">
                  <AlertTriangle className="h-3 w-3" /> SLA AŞIMI
                </span>
              )}
            </div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white md:text-3xl">
              {report.title}
            </h1>
            {report.description && (
              <p className="max-w-4xl whitespace-pre-wrap text-sm leading-relaxed text-slate-600 dark:text-slate-300 font-medium">
                {report.description}
              </p>
            )}
          </div>

          {/* Quick Stats Panel on the right */}
          <div className="flex flex-col gap-2 shrink-0 w-full md:w-auto">
            {resolvedMapUrl && (
              <a
                href={resolvedMapUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-4 text-xs font-bold text-white shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition"
              >
                <MapPin className="h-4 w-4" />
                Haritada Göster
                <ExternalLink className="h-3.5 w-3.5 opacity-80" />
              </a>
            )}
          </div>
        </div>
      </section>

      {/* ================================================================ */}
      {/*  METADATA METRICS GRID                                           */}
      {/* ================================================================ */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
        <MetaCard icon={<Tag className="text-indigo-500" />} label="Kategori" value={report.categoryName} />
        <MetaCard icon={<UserIcon className="text-sky-500" />} label="Vatandaş" value={report.reporterFullName ?? 'Anonim'} />
        <MetaCard icon={<UserCheck className="text-emerald-500" />} label="Saha Görevlisi" value={report.assigneeFullName ?? 'Atanmamış'} />
        <MetaCard icon={<Calendar className="text-amber-500" />} label="Bildirim Tarihi" value={formatDate(report.createdAt)} />
        <MetaCard icon={<MapPin className="text-rose-500" />} label="Mahalle / Bölge" value={report.district || 'Konum bilgisi yok'} />
        <MetaCard icon={<Copy className="text-purple-500" />} label="Takip Numarası" value={report.trackingNumber || '—'} />
      </section>

      {/* ================================================================ */}
      {/*  CONTENT: Two-Column Layout                                       */}
      {/* ================================================================ */}
      <div className="grid gap-6 lg:grid-cols-12 items-start">
        
        {/* ============== LEFT COLUMN (8 cols) ============== */}
        <div className="lg:col-span-8 space-y-6">

          {/* ---- PHOTO GALLERY ---- */}
          {hasAnyMedia && (
            <section className="rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 px-6 py-4">
                <span className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Camera className="h-4.5 w-4.5 text-slate-400" />
                  Fotoğraflar ve Medya Kanıtları
                </span>
                
                {hasBeforeMedia && hasAfterMedia && (
                  <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setActiveMediaTab('BEFORE')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${activeMediaTab === 'BEFORE' ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}
                    >
                      Önce ({report.mediaUrls!.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveMediaTab('AFTER')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${activeMediaTab === 'AFTER' ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}
                    >
                      Sonra ({report.resolvedMediaUrls!.length})
                    </button>
                  </div>
                )}
              </div>

              <div className="p-6">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {currentMediaList.map((url, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => { setLightboxImages(currentMediaList); setLightboxIndex(i); }}
                      className="group relative aspect-square cursor-pointer overflow-hidden rounded-2xl bg-slate-50 border border-slate-150 hover:border-primary transition dark:bg-slate-950 dark:border-slate-800"
                    >
                      <img src={resolveMediaUrl(url)} alt={`Görsel ${i + 1}`} className="h-full w-full object-cover transition duration-300 group-hover:scale-105" />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* ---- OPERATIONS CENTER ---- */}
          <section className="rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
            <div className="flex items-center gap-2 px-6 py-4.5 border-b border-slate-100 dark:border-slate-800">
              <Briefcase className="h-4.5 w-4.5 text-primary" />
              <span className="text-sm font-black text-slate-900 dark:text-white">İhbar Yönetim ve İşlem Merkezi</span>
            </div>

            <div className="p-6">
              {/* Closed State */}
              {isClosed && (
                <div className="flex flex-col items-center text-center py-8 px-4">
                  {report.status === 'RESOLVED' ? (
                    <div className="h-16 w-16 rounded-3xl bg-emerald-50 border border-emerald-250 flex items-center justify-center dark:bg-emerald-950/30 dark:border-emerald-800">
                      <CheckCircle2 className="h-8 w-8 text-emerald-600" />
                    </div>
                  ) : (
                    <div className="h-16 w-16 rounded-3xl bg-rose-50 border border-rose-250 flex items-center justify-center dark:bg-rose-950/30 dark:border-rose-800">
                      <Ban className="h-8 w-8 text-rose-600" />
                    </div>
                  )}
                  <h3 className="mt-4 text-base font-black text-slate-900 dark:text-white">İhbar Başarıyla Sonuçlandırıldı</h3>
                  <p className="mt-2 text-sm text-slate-500">
                    Bu talep kapatılmıştır. Son durum: <span className="font-bold text-slate-700 dark:text-slate-350">{reportStatusLabel(report.status)}</span>
                  </p>
                </div>
              )}

              {/* Pending State — Options */}
              {report.status === 'PENDING' && actionStep === null && (
                <div className="space-y-4">
                  <div className="rounded-2xl border border-amber-200 bg-amber-50/55 p-4 dark:border-amber-900/20 dark:bg-amber-950/10 flex items-start gap-3">
                    <Clock className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-bold text-amber-900 dark:text-amber-250">Talep Değerlendirme Aşamasında</p>
                      <p className="text-xs text-amber-700/80 dark:text-amber-300/80 mt-0.5">Bu şikayet henüz incelenmedi. İhbarı onaylayıp işleme alabilir veya reddedebilirsiniz.</p>
                    </div>
                  </div>

                  {isSuperAdmin ? (
                    <div className="rounded-2xl bg-slate-50 border border-slate-100 p-4 text-center dark:bg-slate-800/40 dark:border-slate-800/65">
                      <p className="text-xs font-bold text-slate-500">Süper yöneticiler operasyonel işlemleri tetikleyemez.</p>
                    </div>
                  ) : (
                    <div className="grid gap-3 sm:grid-cols-2">
                      <button
                        type="button"
                        onClick={() => setActionStep('ACCEPT')}
                        className="flex items-center justify-center gap-2 rounded-2xl border border-emerald-250 bg-emerald-50/60 py-4 text-sm font-bold text-emerald-800 hover:bg-emerald-100 transition active:scale-[0.99] cursor-pointer dark:border-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-200"
                      >
                        <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                        Kabul Et / Yönlendir
                      </button>

                      <button
                        type="button"
                        onClick={() => setActionStep('REJECT')}
                        className="flex items-center justify-center gap-2 rounded-2xl border border-rose-250 bg-rose-50/60 py-4 text-sm font-bold text-rose-800 hover:bg-rose-100 transition active:scale-[0.99] cursor-pointer dark:border-rose-800 dark:bg-rose-950/20 dark:text-rose-200"
                      >
                        <Ban className="h-5 w-5 text-rose-600" />
                        Reddet / Kapat
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Pending -> Accept Flow */}
              {report.status === 'PENDING' && actionStep === 'ACCEPT' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <button type="button" onClick={() => setActionStep(null)} className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 transition cursor-pointer dark:hover:text-white">
                      <ArrowLeft className="h-4 w-4" /> Seçeneklere Dön
                    </button>
                    <span className="text-xs font-bold text-emerald-600">Kabul Adımı</span>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Saha Görevlisi Ata</label>
                      <select value={selectedOfficerId} onChange={(e) => setSelectedOfficerId(e.target.value)} disabled={actionBusy} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-xs font-semibold outline-none focus:ring-2 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white">
                        <option value="">(Opsiyonel) Görevli Seçin...</option>
                        {officers.map((o) => <option key={o.id} value={o.id}>{o.firstName} {o.lastName}</option>)}
                      </select>
                    </div>

                    {isWhiteDesk && (
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Departmana Yönlendir</label>
                        <select value={selectedDeptId} onChange={(e) => setSelectedDeptId(e.target.value)} disabled={actionBusy} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-xs font-semibold outline-none focus:ring-2 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white">
                          <option value="">(Opsiyonel) Departman Seçin...</option>
                          {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                        </select>
                      </div>
                    )}
                  </div>

                  <NoteWithAI
                    noteText={noteText}
                    setNoteText={setNoteText}
                    disabled={actionBusy}
                    placeholder="Vatandaşa iletilecek durum bilgilendirme notu..."
                  />

                  <button type="button" onClick={() => void handleAccept()} disabled={actionBusy} className="w-full rounded-2xl bg-emerald-600 hover:bg-emerald-700 py-4 text-sm font-bold text-white transition shadow-lg shadow-emerald-650/20 active:scale-[0.99] disabled:opacity-60 cursor-pointer flex items-center justify-center gap-2">
                    <CheckCircle2 className="h-5 w-5" />
                    {actionBusy ? 'İşleme Alınıyor...' : 'İhbarı Kabul Et ve Başlat'}
                  </button>
                </div>
              )}

              {/* Pending -> Reject Flow */}
              {report.status === 'PENDING' && actionStep === 'REJECT' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <button type="button" onClick={() => setActionStep(null)} className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 transition cursor-pointer dark:hover:text-white">
                      <ArrowLeft className="h-4 w-4" /> Seçeneklere Dön
                    </button>
                    <span className="text-xs font-bold text-rose-600">Kapatma Adımı</span>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Kapatma Nedeni / Statüsü</label>
                    <div className="flex gap-2 p-1 bg-slate-50 dark:bg-slate-800 rounded-xl">
                      <button
                        type="button"
                        onClick={() => setRejectReason('OUT_OF_JURISDICTION')}
                        className={`flex-1 py-3 px-4 rounded-lg text-xs font-bold transition cursor-pointer ${rejectReason === 'OUT_OF_JURISDICTION' ? 'bg-white text-slate-800 shadow-sm dark:bg-slate-700 dark:text-white' : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'}`}
                      >
                        Yetki Alanı Dışı
                      </button>
                      {(isSuperAdmin || currentUser?.municipality?.allowMunicipalityRejection) && (
                        <button
                          type="button"
                          onClick={() => setRejectReason('REJECTED')}
                          className={`flex-1 py-3 px-4 rounded-lg text-xs font-bold transition cursor-pointer ${rejectReason === 'REJECTED' ? 'bg-white text-slate-800 shadow-sm dark:bg-slate-700 dark:text-white' : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'}`}
                        >
                          Talebi Reddet
                        </button>
                      )}
                    </div>
                  </div>

                  <NoteWithAI
                    noteText={noteText}
                    setNoteText={setNoteText}
                    disabled={actionBusy}
                    label="Red/İptal Açıklaması"
                    placeholder="Vatandaşa iletilecek gerekçeli iptal açıklaması..."
                  />

                  <button type="button" onClick={() => void handleReject()} disabled={actionBusy} className="w-full rounded-2xl bg-rose-600 hover:bg-rose-700 py-4 text-sm font-bold text-white transition shadow-lg shadow-rose-650/20 active:scale-[0.99] disabled:opacity-60 cursor-pointer flex items-center justify-center gap-2">
                    <Ban className="h-5 w-5" />
                    {actionBusy ? 'Kapatılıyor...' : 'İptal İşlemini Onayla'}
                  </button>
                </div>
              )}

              {/* Processing / Forwarded States */}
              {(report.status === 'PROCESSING' || report.status === 'FORWARDED') && (
                <div className="space-y-6">
                  {isSuperAdmin ? (
                    <div className="rounded-2xl bg-slate-50 border border-slate-100 p-4 text-center dark:bg-slate-800/40 dark:border-slate-800/65">
                      <p className="text-xs font-bold text-slate-500">Süper yöneticiler operasyonel işlemleri tetikleyemez.</p>
                    </div>
                  ) : (
                    <>
                      {/* Saha Görevlisi Değiştirme */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Atanmış Saha Görevlisi</label>
                          {report.assigneeFullName && (
                            <button
                              type="button"
                              onClick={() => setShowAssignPanel(!showAssignPanel)}
                              className="text-xs font-bold text-primary hover:text-primary-hover flex items-center gap-1 transition cursor-pointer"
                            >
                              {showAssignPanel ? 'Kapat' : 'Görevi Değiştir'}
                            </button>
                          )}
                        </div>

                        {report.assigneeFullName && !showAssignPanel && (
                          <div className="rounded-2xl border border-sky-100 bg-sky-50/40 px-4 py-3 flex items-center justify-between gap-3 dark:border-sky-950/30 dark:bg-sky-950/10">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-100 dark:bg-sky-900/50 shrink-0">
                                <UserCheck className="h-5 w-5 text-sky-600 dark:text-sky-400" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-sky-900 dark:text-sky-200 truncate">{report.assigneeFullName}</p>
                                <p className="text-[10px] text-sky-700/80 dark:text-sky-400/85">Saha Operatörü</p>
                              </div>
                            </div>
                          </div>
                        )}

                        {!report.assigneeFullName && !showAssignPanel && (
                          <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-center dark:border-slate-800">
                            <p className="text-xs text-slate-500 mb-3">Bu talebe atanmış bir saha operatörü bulunmamaktadır.</p>
                            <button
                              type="button"
                              onClick={() => setShowAssignPanel(true)}
                              className="inline-flex items-center gap-2 rounded-xl bg-primary/10 px-4 py-2 text-xs font-bold text-primary hover:bg-primary/20 transition cursor-pointer"
                            >
                              <UserCheck className="h-4 w-4" /> Görevlendir
                            </button>
                          </div>
                        )}

                        {showAssignPanel && (
                          <div className="space-y-3 rounded-2xl border border-slate-250 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-900/50">
                            <div className="flex flex-col sm:flex-row gap-2">
                              <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                <input
                                  type="text"
                                  placeholder="İsim veya e-posta ile ara..."
                                  value={searchQuery}
                                  onChange={(e) => setSearchQuery(e.target.value)}
                                  className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 py-2 text-xs outline-none focus:ring-1 focus:ring-primary dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                                />
                              </div>
                              <select
                                value={selectedDeptFilter}
                                onChange={(e) => setSelectedDeptFilter(e.target.value)}
                                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:ring-1 focus:ring-primary dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                              >
                                <option value="">Tüm Departmanlar</option>
                                {departments.map((d) => (
                                  <option key={d.id} value={d.id}>{d.name}</option>
                                ))}
                              </select>
                            </div>

                            <div className="max-h-56 overflow-y-auto space-y-2 pr-1">
                              {filteredOfficers.length === 0 ? (
                                <p className="text-center py-4 text-xs text-slate-500">Görevli personel bulunamadı.</p>
                              ) : (
                                filteredOfficers.map((o: User) => {
                                  const isAssigned = report.assigneeFullName === `${o.firstName} ${o.lastName}`;
                                  return (
                                    <button
                                      key={o.id}
                                      type="button"
                                      disabled={actionBusy}
                                      onClick={async () => {
                                        if (actionBusy) return;
                                        setActionBusy(true); setError(null); setSuccessMsg(null);
                                        try {
                                          await api.post(`/reports/${id}/assign`, { assigneeId: o.id });
                                          await refreshReport();
                                          setShowAssignPanel(false);
                                          setSuccessMsg('Görevli atandı.');
                                          window.setTimeout(() => setSuccessMsg(null), 3000);
                                        } catch (err: unknown) {
                                          setError(errorMessage(err, 'Görevli atama başarısız.'));
                                        } finally {
                                          setActionBusy(false);
                                        }
                                      }}
                                      className={`w-full flex items-center justify-between p-3 rounded-xl border text-left transition ${isAssigned ? 'border-primary bg-primary/5 dark:border-sky-500/40 dark:bg-sky-950/10' : 'border-slate-200 bg-white hover:border-slate-350 dark:border-slate-800 dark:bg-slate-900'}`}
                                    >
                                      <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                          <span className="text-xs font-bold text-slate-900 dark:text-white">{o.firstName} {o.lastName}</span>
                                          {o.departmentName && (
                                            <span className="rounded bg-sky-100 dark:bg-sky-950 px-2 py-0.5 text-[9px] font-bold text-sky-800 dark:text-sky-300">
                                              {o.departmentName}
                                            </span>
                                          )}
                                        </div>
                                        <p className="text-[10px] text-slate-400 mt-0.5 truncate">{o.email}</p>
                                      </div>
                                      {isAssigned && (
                                        <span className="text-xs font-bold text-primary dark:text-sky-400 shrink-0">Atandı</span>
                                      )}
                                    </button>
                                  );
                                })
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Çözüm ve Kapatma Formu */}
                      <div className="pt-5 border-t border-slate-100 dark:border-slate-800 space-y-4">
                        <NoteWithAI
                          noteText={noteText}
                          setNoteText={setNoteText}
                          disabled={actionBusy}
                          label="Çözüm / Tamamlanma Raporu"
                          placeholder="Çözüm tamamlandığında vatandaşa iletilecek nihai sonuç notu..."
                        />

                        {/* File Upload for Proof */}
                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Çözüm Kanıtı Fotoğrafları</label>
                          <input
                            type="file"
                            multiple
                            accept="image/*"
                            onChange={(e) => {
                              if (e.target.files) {
                                setResolvedFiles(Array.from(e.target.files));
                              }
                            }}
                            className="w-full text-xs text-slate-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 file:cursor-pointer"
                          />
                          {resolvedFiles.length > 0 && (
                            <p className="text-[10px] text-slate-500 mt-1.5 font-bold">Seçilen dosya sayısı: {resolvedFiles.length}</p>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => void handleResolve()}
                          disabled={actionBusy}
                          className="w-full rounded-2xl bg-emerald-600 hover:bg-emerald-700 py-4 text-sm font-bold text-white transition shadow-lg shadow-emerald-650/20 active:scale-[0.99] disabled:opacity-60 cursor-pointer flex items-center justify-center gap-2"
                        >
                          <CheckCircle2 className="h-5 w-5" />
                          {actionBusy ? 'Kaydediliyor...' : 'İhbarı "Çözüldü" Olarak Kapat'}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </section>
        </div>

        {/* ============== RIGHT COLUMN (4 cols) ============== */}
        <div className="lg:col-span-4 space-y-6">

          {/* ---- TIMELINE / LIFE CYCLE ---- */}
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-4 mb-5 dark:border-slate-800">
              <div>
                <p className="text-sm font-black text-slate-900 dark:text-white">Yaşam Döngüsü & İşlem Günlüğü</p>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Rapor üzerinde yapılan tüm aşamalar</p>
              </div>
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-350">
                <Clock className="h-3.5 w-3.5" />
                {timeline.length}
              </span>
            </div>

            {timeline.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-350 p-6 text-center text-xs text-slate-500 dark:border-slate-800">
                Henüz işlem geçmişi bulunmuyor.
              </div>
            ) : (
              <div className="relative border-l-2 border-slate-200 pl-6 dark:border-slate-800 ml-3 space-y-0">
                {timeline.map((entry, index) => {
                  const dot = STATUS_DOT[entry.newStatus ?? ''] ?? 'bg-slate-400';
                  return (
                    <div key={`${entry.at}-${index}`} className="relative pb-6 last:pb-0">
                      <span className={`absolute -left-[31px] top-1 flex h-4 w-4 items-center justify-center rounded-full ring-4 ring-white dark:ring-slate-900 ${dot}`} />
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{formatDate(entry.at)}</p>
                      <p className="mt-1 text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                        <span className="opacity-60 font-medium">{reportStatusLabel(entry.oldStatus)}</span>
                        <ChevronRight size={12} className="text-slate-400" />
                        <span className="text-primary dark:text-sky-400">{reportStatusLabel(entry.newStatus)}</span>
                      </p>
                      {entry.actorName && (
                        <p className="text-[10px] text-slate-500 mt-0.5 font-bold">İşlem Sahibi: {entry.actorName}</p>
                      )}
                      {entry.note && (
                        <div className="mt-2 rounded-xl bg-slate-50 p-3 text-xs text-slate-700 border border-slate-100 dark:bg-slate-800/40 dark:border-slate-800/60 dark:text-slate-300 leading-relaxed font-medium">
                          {entry.note}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* ---- DUPLICATE GROUP PANEL ---- */}
          {((report.duplicateGroupSize != null && report.duplicateGroupSize > 1) || duplicateGroup.length > 0) && (
            <section className="rounded-3xl border border-amber-250 bg-amber-50/30 p-6 shadow-sm dark:border-amber-900/30 dark:bg-amber-950/10">
              <div className="flex items-center gap-2 mb-4">
                <Layers className="h-4.5 w-4.5 text-amber-600" />
                <p className="text-sm font-black text-amber-900 dark:text-amber-200">Mükerrer Bildirim Grubu ({report.duplicateGroupSize ?? duplicateGroup.length + 1})</p>
              </div>
              <ul className="space-y-2">
                {duplicateGroup.map((d) => (
                  <li key={d.id}>
                    <Link to={`/reports/${d.id}`} className="flex items-center justify-between gap-3 rounded-xl border border-amber-200/50 bg-white px-4 py-3 text-xs hover:border-amber-400 transition dark:border-slate-800 dark:bg-slate-900">
                      <span className="font-bold text-slate-850 dark:text-slate-200 truncate">{d.title}</span>
                      <span className={`kentiva-status-badge shrink-0 text-[10px] font-black uppercase ${reportStatusBadgeClass(d.status)}`}>{reportStatusLabel(d.status)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
              {canResolve && (
                <button
                  type="button"
                  disabled={bulkBusy !== null}
                  onClick={() => void bulkCloseDuplicateGroup()}
                  className="mt-4 w-full rounded-xl bg-amber-600 hover:bg-amber-700 px-4 py-3.5 text-xs font-bold text-white transition shadow-sm disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  {bulkBusy === 'RESOLVED' ? 'Kapatılıyor...' : 'Gruptaki Tüm İhbarları Kapat'}
                </button>
              )}
            </section>
          )}

        </div>
      </div>
    </div>,
  );
}

/* ------------------------------------------------------------------ */
/*  METADATA CARD SUB-COMPONENT                                       */
/* ------------------------------------------------------------------ */
function MetaCard({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3.5 rounded-2xl border border-slate-150 bg-white p-4.5 shadow-[0_4px_12px_rgba(15,23,42,0.02)] transition hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-50 dark:bg-slate-800/80">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
        <p className="mt-0.5 text-xs font-extrabold text-slate-900 dark:text-white truncate leading-tight">
          {value}
        </p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Note + AI button sub-component                                     */
/* ------------------------------------------------------------------ */
function NoteWithAI({
  noteText,
  setNoteText,
  disabled,
  label = 'Vatandaşa Bilgi Notu',
  placeholder = 'Vatandaşa iletilecek not...',
}: {
  noteText: string;
  setNoteText: (v: string) => void;
  disabled: boolean;
  label?: string;
  placeholder?: string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label htmlFor="statusNote" className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</label>
      </div>
      <textarea
        id="statusNote"
        rows={3}
        value={noteText}
        onChange={(e) => setNoteText(e.target.value)}
        disabled={disabled}
        placeholder={placeholder}
        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs outline-none focus:ring-2 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white leading-relaxed font-semibold"
      />
    </div>
  );
}
