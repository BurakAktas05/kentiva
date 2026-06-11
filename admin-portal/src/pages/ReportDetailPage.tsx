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
  UserPlus,
  Tag,
  User as UserIcon,
  UserCheck,
  Calendar,
  Copy,
  MessageSquare,
  CornerDownRight,
  Flame,
  Activity,
  Briefcase,
  Clock,
  ChevronRight,
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
  PROCESSING: 'İşlemde',
  RESOLVED: 'Çözüldü',
  REJECTED: 'Reddedildi',
  FORWARDED: 'Yönlendirildi',
  OUT_OF_JURISDICTION: 'Yetki Alanı Dışı',
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
  const [statusValue, setStatusValue] = useState<'PROCESSING' | 'RESOLVED' | 'OUT_OF_JURISDICTION' | 'REJECTED'>('PROCESSING');
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
        setStatusValue(
          rep.status === 'RESOLVED'
            ? 'RESOLVED'
            : rep.status === 'OUT_OF_JURISDICTION'
            ? 'OUT_OF_JURISDICTION'
            : rep.status === 'REJECTED'
            ? 'REJECTED'
            : 'PROCESSING'
        );
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
  const isSuperAdmin = currentUser?.roles?.includes('ROLE_SUPER_ADMIN');
  const resolvedMapUrl = useMemo(() => mapUrl(report?.latitude, report?.longitude), [report?.latitude, report?.longitude]);

  const refreshReport = async () => {
    if (!id) return;
    const [r, tl] = await Promise.all([api.get(`/reports/${id}`), api.get(`/reports/${id}/timeline`)]);
    const next = r.data.data as Report;
    setReport(next);
    setTimeline(tl.data.data as ReportTimelineEntry[]);
    setStatusValue(
      next.status === 'RESOLVED'
        ? 'RESOLVED'
        : next.status === 'OUT_OF_JURISDICTION'
        ? 'OUT_OF_JURISDICTION'
        : next.status === 'REJECTED'
        ? 'REJECTED'
        : 'PROCESSING'
    );
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
      const res = await api.post(`/reports/${id}/ai-analysis?status=${statusValue}`);
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

  const wrapEmbedded = (node: ReactNode) => node;

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
                <span className="rounded-full bg-slate-900/90 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-white dark:bg-slate-100 dark:text-slate-900 shadow-sm">
                  #{report.id.slice(0, 8)}
                </span>
                {(() => {
                  let dotColor = 'bg-slate-400';
                  if (report.status === 'PENDING') dotColor = 'bg-amber-500';
                  if (report.status === 'PROCESSING') dotColor = 'bg-sky-500';
                  if (report.status === 'RESOLVED') dotColor = 'bg-emerald-500';
                  if (report.status === 'REJECTED') dotColor = 'bg-red-500';
                  if (report.status === 'OUT_OF_JURISDICTION') dotColor = 'bg-purple-500';
                  return (
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold uppercase shadow-xs ${reportStatusBadgeClass(report.status)}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${dotColor} ${report.status === 'PENDING' || report.status === 'PROCESSING' ? 'animate-pulse' : ''}`} />
                      {toStatusLabel(report.status)}
                    </span>
                  );
                })()}
              </div>
              <h1 className="mt-4 text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight">
                {report.title}
              </h1>
              <p className="mt-3 max-w-4xl whitespace-pre-wrap text-sm leading-7 text-slate-600 dark:text-slate-300">
                {report.description || 'Bu rapor için açıklama girilmemiş.'}
              </p>
            </div>
            {resolvedMapUrl && (
              <a
                href={resolvedMapUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200/90 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 hover:border-slate-300 hover:shadow active:scale-[0.98] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <MapPin className="h-4 w-4 text-primary animate-bounce" />
                Haritada Aç
                <ExternalLink className="h-3.5 w-3.5 opacity-60" />
              </a>
            )}
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <DetailStat label="Kategori" value={report.categoryName} helper="Otomatik veya seçili kategori" icon={Tag} />
            <DetailStat label="Vatandaş" value={report.reporterFullName ?? 'Anonim / Kayıtsız'} helper="İhbarı oluşturan kişi" icon={UserIcon} />
            <DetailStat
              label="Atanan Yetkili"
              value={report.assigneeFullName ?? 'Atanmamış'}
              helper={report.forwardedDepartmentName ? `Departman: ${report.forwardedDepartmentName}` : 'Saha ataması bekleniyor'}
              icon={UserCheck}
            />
            <DetailStat label="Oluşturulma" value={formatDate(report.createdAt)} helper={report.district || 'İlçe bilgisi yok'} icon={Calendar} />
          </div>
        </div>

        {report.mediaUrls && report.mediaUrls.length > 0 && (
          <div className="px-6 py-6 border-t border-slate-100 bg-slate-50/20 dark:border-slate-800 dark:bg-slate-900/10 sm:px-8">
            <div className="mb-4 flex items-center justify-between gap-2">
              <div>
                <p className="text-sm font-bold text-slate-900 dark:text-white">Ek kanıtlar ve fotoğraflar</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Sahadan veya vatandaştan gelen medya ekleri
                </p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                {report.mediaUrls.length} dosya
              </span>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {report.mediaUrls.map((url, i) => (
                <a
                  key={i}
                  href={resolveMediaUrl(url)}
                  target="_blank"
                  rel="noreferrer"
                  className="group relative overflow-hidden rounded-2xl border border-slate-200/90 bg-slate-100 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-950 block"
                >
                  <img
                    src={resolveMediaUrl(url)}
                    alt={`Rapor görseli ${i + 1}`}
                    className="h-44 w-full object-cover transition duration-300 group-hover:scale-[1.04]"
                  />
                  <div className="absolute inset-0 bg-slate-900/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="rounded-xl bg-white/90 p-2 text-slate-900 text-xs font-bold flex items-center gap-1.5 backdrop-blur-xs shadow-sm">
                      <ExternalLink size={14} />
                      Görüntüle
                    </span>
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_380px]">
        <div className="space-y-6">
          <section className="rounded-3xl border border-violet-200/80 bg-gradient-to-br from-violet-50/70 via-white to-slate-50/70 p-6 shadow-sm dark:border-violet-900/40 dark:from-violet-950/20 dark:via-slate-900/50 dark:to-slate-950/50">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-violet-600 dark:text-violet-400 animate-pulse" />
                  <p className="text-sm font-bold text-slate-900 dark:text-white">Yapay Zeka Analiz Raporu</p>
                </div>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Kentiva AI tarafından otomatik oluşturulmuş operasyonel analiz özeti.
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <MiniInfo
                label="Öncelik Seviyesi"
                value={report.aiPriority ?? 'Analiz Edilmedi'}
                helper={report.aiSuggestedCategory ? `Öneri: ${report.aiSuggestedCategory}` : 'Kategori tahmini yapılmadı'}
                icon={Flame}
              />
              <MiniInfo
                label="Mükerrer Sinyali"
                value={report.aiDuplicateHint ?? 'Temiz'}
                helper="Benzer bildirim kontrolü"
                icon={Copy}
              />
              <MiniInfo
                label="Vatandaş Yanıtı"
                value={report.aiReplyDraft ? 'Taslak Hazır' : 'Taslak Yok'}
                helper="Vatandaşa dönülecek taslak not"
                icon={MessageSquare}
              />
            </div>

            <div className="mt-5 rounded-2xl border border-violet-100 bg-white p-4 shadow-xs dark:border-violet-900/30 dark:bg-slate-900/80">
              <div className="text-xs font-bold uppercase tracking-wider text-violet-600 dark:text-violet-400 mb-2">Operasyon Özeti</div>
              {report.aiSummary ? (
                <p className="text-sm leading-7 text-slate-700 dark:text-slate-300">{report.aiSummary}</p>
              ) : (
                <p className="text-sm text-slate-500 dark:text-slate-400 italic">
                  Henüz yapay zeka özeti bulunmuyor. Sağ taraftaki "AI Yanıtı Oluştur" butonu ile analiz üretebilirsiniz.
                </p>
              )}
              {report.aiReplyDraft && (
                <div className="mt-4 rounded-xl border border-violet-100/80 bg-violet-50/40 p-4 text-xs text-violet-950 dark:border-violet-900/30 dark:bg-violet-950/20 dark:text-violet-200">
                  <div className="font-bold flex items-center gap-1 text-violet-700 dark:text-violet-300 mb-1.5">
                    <MessageSquare size={13} />
                    Önerilen Vatandaş Yanıtı Taslağı:
                  </div>
                  <p className="leading-relaxed whitespace-pre-wrap">{report.aiReplyDraft}</p>
                </div>
              )}
            </div>
          </section>

          {(report.duplicateGroupSize != null && report.duplicateGroupSize > 1) || duplicateGroup.length > 0 ? (
            <section className="rounded-3xl border border-amber-200/90 bg-amber-50/40 p-6 shadow-sm dark:border-amber-900/30 dark:bg-amber-950/10">
              <div className="mb-3 flex items-center gap-2">
                <Layers className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                <p className="text-sm font-bold text-amber-900 dark:text-amber-200">
                  Tek Olay Grubu ({report.duplicateGroupSize ?? duplicateGroup.length + 1} Rapor)
                </p>
              </div>
              <p className="mb-4 text-xs text-amber-800/90 dark:text-amber-400">
                Aynı veya yakın lokasyondan gelen bu bildirimler mükerrer ihbar olabilir. Tek seferde toplu olarak kapatabilirsiniz.
              </p>
              <ul className="space-y-2.5">
                {duplicateGroup.map((d) => (
                  <li key={d.id}>
                    <Link
                      to={`/reports/${d.id}`}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200/40 bg-white px-4 py-3 text-sm hover:border-amber-300 transition-colors shadow-2xs dark:border-slate-800 dark:bg-slate-900"
                    >
                      <span className="font-semibold text-slate-800 dark:text-slate-200">{d.title}</span>
                      <span className={`kentiva-status-badge ${reportStatusBadgeClass(d.status)}`}>
                        {toStatusLabel(d.status)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
              {canResolve && (
                <div className="mt-4">
                  <button
                    type="button"
                    disabled={bulkBusy !== null}
                    onClick={() => bulkCloseDuplicateGroup()}
                    className="rounded-xl bg-amber-600 hover:bg-amber-700 px-4 py-2.5 text-xs font-bold text-white transition-colors shadow-sm active:scale-[0.98] disabled:opacity-50"
                  >
                    {bulkBusy === 'RESOLVED' ? 'Kapatılıyor...' : 'Tüm Grubu Çözüldü Olarak İşaretle'}
                  </button>
                </div>
              )}
            </section>
          ) : null}

          <section className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-6 flex items-start justify-between gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
              <div>
                <p className="text-base font-bold text-slate-900 dark:text-white">Yaşam Döngüsü & Akış Gecmişi</p>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  Rapor üzerinde yapılan tüm işlemler zaman tünelinde kronolojik olarak takip edilir.
                </p>
              </div>
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                <Clock className="h-3.5 w-3.5" />
                {timeline.length} işlem
              </span>
            </div>

            {timeline.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300/80 p-6 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                Bu rapor için henüz işlem geçmişi bulunmuyor.
              </div>
            ) : (
              <div className="relative space-y-0 border-l-2 border-slate-200/80 pl-6 dark:border-slate-800 ml-3">
                {timeline.map((entry, index) => {
                  let badgeDot = 'bg-slate-400';
                  if (entry.newStatus === 'RESOLVED') badgeDot = 'bg-emerald-500';
                  if (entry.newStatus === 'PENDING') badgeDot = 'bg-amber-500';
                  if (entry.newStatus === 'PROCESSING') badgeDot = 'bg-sky-500';
                  if (entry.newStatus === 'REJECTED') badgeDot = 'bg-red-500';
                  if (entry.newStatus === 'OUT_OF_JURISDICTION') badgeDot = 'bg-purple-500';

                  return (
                    <div key={`${entry.at}-${index}`} className="relative pb-8 last:pb-0">
                      <span className={`absolute -left-[31px] top-1 flex h-4 w-4 items-center justify-center rounded-full ring-4 ring-white dark:ring-slate-900 ${badgeDot}`} />
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        {formatDate(entry.at)}
                      </p>
                      <p className="mt-1.5 text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                        <span className="opacity-60 font-medium">{toStatusLabel(entry.oldStatus)}</span>
                        <ChevronRight size={14} className="text-slate-400" />
                        <span className="text-primary dark:text-sky-400">{toStatusLabel(entry.newStatus)}</span>
                      </p>
                      {entry.actorName && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
                          İşlemi Yapan: {entry.actorName}
                        </p>
                      )}
                      {entry.note && (
                        <div className="mt-3 rounded-xl bg-slate-50 p-4 text-sm text-slate-700 border border-slate-100 dark:bg-slate-800/40 dark:border-slate-800/60 dark:text-slate-300 leading-relaxed">
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

        <div className="space-y-6 xl:sticky xl:top-6 xl:self-start">
          {/* Atama ve Yönlendirme */}
          <section className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-2 mb-2">
              <Briefcase className="h-5 w-5 text-primary dark:text-sky-400" />
              <p className="text-base font-bold text-slate-900 dark:text-white">Atama ve Yönlendirme</p>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Saha görevlisi seçebilir ya da Beyaz Masa üzerinden yetkili departmana yönlendirebilirsiniz.
            </p>

            <div className="mt-5 space-y-4">
              <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-900/40">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Mevcut Saha Görevlisi</p>
                <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">
                  {report.assigneeFullName ?? 'Henüz saha ataması yapılmamış'}
                </p>
                <div className="mt-3.5 flex flex-col gap-2">
                  <select
                    value={selectedOfficerId}
                    onChange={(e) => setSelectedOfficerId(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs outline-none focus:ring-2 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  >
                    <option value="">Saha görevlisi seç...</option>
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
                    className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-primary px-3 py-2.5 text-xs font-bold text-white hover:bg-primary-hover transition-colors shadow-xs active:scale-[0.99] disabled:opacity-50"
                  >
                    <UserPlus className="h-3.5 w-3.5" />
                    {isAssigning ? 'Atanıyor...' : 'Görevlendir'}
                  </button>
                </div>
              </div>

              {isWhiteDesk && (
                <div className="rounded-2xl border border-violet-100 bg-violet-50/20 p-4 dark:border-violet-900/20 dark:bg-violet-950/10">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-violet-600 dark:text-violet-400">Departman Transferi</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">
                    {report.forwardedDepartmentName ?? 'Mevcut departmanda'}
                  </p>
                  <div className="mt-3.5 flex flex-col gap-2">
                    <select
                      value={selectedDeptId}
                      onChange={(e) => setSelectedDeptId(e.target.value)}
                      className="w-full rounded-xl border border-violet-200/60 bg-white px-3 py-2.5 text-xs outline-none focus:ring-2 focus:ring-violet-300 dark:border-violet-800 dark:bg-slate-900 dark:text-white"
                    >
                      <option value="">Departman seç...</option>
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
                      className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-violet-600 hover:bg-violet-700 px-3 py-2.5 text-xs font-bold text-white transition-colors shadow-xs active:scale-[0.99] disabled:opacity-50"
                    >
                      <CornerDownRight className="h-3.5 w-3.5" />
                      {isAssigning ? 'Yönlendiriliyor...' : 'Departmana Yönlendir'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Durum Güncelle */}
          <section className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="h-5 w-5 text-primary dark:text-sky-400" />
              <p className="text-base font-bold text-slate-900 dark:text-white">Aksiyon Al & Durum Güncelle</p>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Vatandaşa iletilecek çözüm bildirim notu ile birlikte kaydı güncelleyin.
            </p>

            <div className="mt-5 space-y-4">
              <div>
                <label htmlFor="statusSelect" className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">
                  Yeni Durum
                </label>
                <select
                  id="statusSelect"
                  value={statusValue}
                  onChange={(e) => setStatusValue(e.target.value as any)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs outline-none focus:ring-2 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                >
                  <option value="PROCESSING">İşlemde</option>
                  {canResolve && <option value="RESOLVED">Çözüldü</option>}
                  <option value="OUT_OF_JURISDICTION">Yetki Alanı Dışı</option>
                  {(isSuperAdmin || currentUser?.municipality?.allowMunicipalityRejection) && (
                    <option value="REJECTED">Reddedildi</option>
                  )}
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="statusNote" className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Vatandaşa Not
                  </label>
                  <button
                    type="button"
                    disabled={aiBusy}
                    onClick={() => void runAiAnalysis()}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 hover:bg-violet-700 text-white px-2.5 py-1 text-[11px] font-bold transition shadow-xs hover:shadow active:scale-[0.98] disabled:opacity-50"
                  >
                    <Sparkles className="h-3 w-3" />
                    {aiBusy ? 'Üretiliyor...' : 'AI Yanıtı Oluştur'}
                  </button>
                </div>
                <textarea
                  id="statusNote"
                  rows={6}
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder="Vatandaşa iletilecek açık, nezih ve aksiyon odaklı not..."
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs outline-none focus:ring-2 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white leading-relaxed"
                />
                <p className="mt-1.5 text-[10px] text-slate-500 dark:text-slate-400">
                  AI taslağı üretildiğinde bu alan otomatik dolacaktır.
                </p>
              </div>

              <button
                type="button"
                onClick={() => void saveStatus()}
                disabled={statusBusy}
                className="w-full rounded-xl bg-primary py-3 text-xs font-bold text-white transition-colors hover:bg-primary-hover shadow-xs active:scale-[0.99] disabled:opacity-60"
              >
                {statusBusy ? 'Kaydediliyor...' : 'Durumu ve Notu Kaydet'}
              </button>
            </div>
          </section>

          {/* Konum ve Kayıt Bilgisi */}
          <section className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-2 mb-4">
              <MapPin className="h-5 w-5 text-primary dark:text-sky-400" />
              <p className="text-base font-bold text-slate-900 dark:text-white">Lokasyon & Detay Bilgisi</p>
            </div>
            <div className="grid gap-3.5">
              <MiniInfo label="Koordinat" value={`${report.latitude}, ${report.longitude}`} helper="Saha doğrulaması için GPS" icon={MapPin} />
              <MiniInfo label="Bölge / İlçe" value={report.district || 'Belirtilmedi'} helper="Vatandaşın konumu" icon={Layers} />
              <MiniInfo
                label="Sorumlu Departman"
                value={report.forwardedDepartmentName ?? 'Beyaz Masa'}
                helper={report.forwardedByName ? `Aktaran: ${report.forwardedByName}` : 'Direkt akışta'}
                icon={Briefcase}
              />
            </div>
          </section>
        </div>
      </div>
    </div>,
  );
}

function DetailStat({ label, value, helper, icon: Icon }: { label: string; value: string; helper: string; icon?: any }) {
  return (
    <div className="rounded-2xl border border-slate-200/90 bg-white/95 p-4.5 shadow-xs transition-all hover:shadow dark:border-slate-800 dark:bg-slate-900/90 flex flex-col justify-between">
      <div>
        <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
          {Icon && <Icon className="h-3.5 w-3.5 shrink-0" />}
          <p className="text-[10px] font-bold uppercase tracking-wider">
            {label}
          </p>
        </div>
        <p className="mt-2 text-sm font-bold text-slate-900 dark:text-white leading-tight">{value}</p>
      </div>
      <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800/80 pt-2">{helper}</p>
    </div>
  );
}

function MiniInfo({ label, value, helper, icon: Icon }: { label: string; value: string; helper: string; icon?: any }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-800/40">
      <div className="flex items-center gap-1.5 text-slate-400 dark:text-slate-500">
        {Icon && <Icon className="h-3.5 w-3.5 shrink-0" />}
        <p className="text-[10px] font-bold uppercase tracking-wider">
          {label}
        </p>
      </div>
      <p className="mt-2 text-sm font-bold text-slate-900 dark:text-white leading-tight">{value}</p>
      <p className="mt-1.5 text-[11px] text-slate-500 dark:text-slate-400">{helper}</p>
    </div>
  );
}
