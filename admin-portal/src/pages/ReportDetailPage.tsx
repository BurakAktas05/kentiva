import { useEffect, useState, type ReactNode } from 'react';
import { resolveMediaUrl } from '../lib/env';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Layers, MapPin, Sparkles, UserPlus, CheckCircle2, X } from 'lucide-react';
import axios from 'axios';
import api, { type Report, type ReportListItem, type ReportTimelineEntry, type User } from '../api';

type ReportDetailPageProps = {
  reportId?: string;
  embedded?: boolean;
  onClose?: () => void;
};

export default function ReportDetailPage({ reportId: reportIdProp, embedded, onClose }: ReportDetailPageProps = {}) {
  const { id: routeId } = useParams<{ id: string }>();
  const id = reportIdProp ?? routeId;
  const [report, setReport] = useState<Report | null>(null);
  const [timeline, setTimeline] = useState<ReportTimelineEntry[]>([]);
  const [officers, setOfficers] = useState<User[]>([]);
  const [selectedOfficerId, setSelectedOfficerId] = useState<string>('');
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
        const [r, tl, u, dup, me] = await Promise.all([
          api.get(`/reports/${id}`), 
          api.get(`/reports/${id}/timeline`),
          api.get('/users?role=ROLE_FIELD_OFFICER'),
          api.get(`/reports/${id}/duplicate-group`),
          api.get('/auth/me'),
        ]);
        if (!cancelled) {
          const rep = r.data.data as Report;
          setReport(rep);
          setTimeline(tl.data.data as ReportTimelineEntry[]);
          setOfficers(u.data.data as User[]);
          setDuplicateGroup(dup.data.data as ReportListItem[]);
          setCurrentUser(me.data.data);
          if (rep.aiReplyDraft) {
            setNoteText(rep.aiReplyDraft);
          }
        }
      } catch {
        if (!cancelled) setError('Rapor bulunamadı veya erişim yok.');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const bulkCloseDuplicateGroup = async () => {
    if (!id || !report) return;
    const ids = [
      id,
      ...duplicateGroup.filter((d) => d.status !== 'RESOLVED' && d.status !== 'REJECTED').map((d) => d.id),
    ];
    const unique = [...new Set(ids)];
    if (unique.length < 2) return;
    if (!window.confirm(`${unique.length} ihbarı toplu "çözüldü" olarak işaretlemek istiyor musunuz?`)) return;
    setBulkBusy('RESOLVED');
    setError(null);
    try {
      const res = await api.patch('/reports/batch/status', {
        reportIds: unique,
        status: 'RESOLVED',
        note: 'Mükerrer grup — toplu kapatma',
      });
      const result = res.data.data as { successCount: number; failureCount: number };
      if (result.failureCount > 0) {
        setError(`${result.successCount} güncellendi, ${result.failureCount} başarısız.`);
      } else {
        window.location.reload();
      }
    } catch {
      setError('Toplu güncelleme başarısız.');
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
      // Tek tuşla taslağı üret ve doğrudan "Vatandaşa Not" alanına yerleştir —
      // ayrı bir "AI Yanıtı Kullan" butonuna gerek kalmaz.
      if (next.aiReplyDraft) {
        setNoteText(next.aiReplyDraft);
      }
      setSuccessMsg('AI yanıt taslağı oluşturuldu ve nota eklendi.');
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: unknown) {
      const msg = axios.isAxiosError(err)
        ? String((err.response?.data as { message?: string } | undefined)?.message ?? 'AI analizi başarısız.')
        : 'AI analizi başarısız.';
      window.alert(msg);
    } finally {
      setAiBusy(false);
    }
  };

  const saveStatus = async () => {
    if (!id || statusBusy) return;
    setStatusBusy(true);
    try {
      await api.patch(`/reports/${id}/status`, { status: statusValue, note: noteText });
      window.location.reload();
    } catch {
      window.alert('Durum güncellenemedi');
      setStatusBusy(false);
    }
  };

  const handleAssign = async () => {
    if (!selectedOfficerId || !id) return;
    setIsAssigning(true);
    setSuccessMsg(null);
    try {
      await api.post(`/reports/${id}/assign`, { assigneeId: selectedOfficerId });
      const [r, tl] = await Promise.all([api.get(`/reports/${id}`), api.get(`/reports/${id}/timeline`)]);
      setReport(r.data.data as Report);
      setTimeline(tl.data.data as ReportTimelineEntry[]);
      setSuccessMsg('Görevli atandı.');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: unknown) {
      setError(
        axios.isAxiosError(err)
          ? String((err.response?.data as { message?: string } | undefined)?.message ?? 'Atama başarısız.')
          : 'Atama başarısız.'
      );
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
      Haritaya dön
    </button>
  ) : (
    <Link to="/reports" className="inline-flex items-center gap-2 text-sm font-bold text-primary hover:underline">
      <ArrowLeft className="h-4 w-4" />
      Raporlara dön
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
        <div className="relative flex h-full w-full max-w-2xl flex-col overflow-hidden bg-slate-50 shadow-2xl dark:bg-slate-950">
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

  if (error) {
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
    return wrapEmbedded(<div className="p-6 text-slate-500">Yükleniyor…</div>);
  }

  return wrapEmbedded(
    <div className="space-y-6 p-6">
      {backNav}

      <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-8">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">{report.title}</h1>
            <p className="mt-1 text-sm text-slate-500">
              {report.categoryName} · {report.district}
            </p>
          </div>
          <span className="rounded-full bg-primary/10 px-4 py-1.5 text-xs font-bold uppercase text-primary">{report.status}</span>
        </div>

        {report.description && <p className="mb-6 whitespace-pre-wrap text-slate-700 dark:text-slate-300">{report.description}</p>}

        <div className="mb-6 flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-4 dark:border-primary/30 dark:bg-primary/10">
          <div className="flex min-w-0 flex-1 gap-3">
            <Sparkles className="h-5 w-5 shrink-0 text-secondary" />
            <div className="min-w-0 text-sm">
              {report.aiPriority && (
                <p className="font-bold text-primary">
                  AI öncelik: <span className="font-mono">{report.aiPriority}</span>
                </p>
              )}
              {report.aiSummary && <p className="mt-1 text-slate-700 dark:text-slate-200">{report.aiSummary}</p>}
              {report.aiSuggestedCategory && (
                <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">Önerilen kategori: {report.aiSuggestedCategory}</p>
              )}
              {report.aiDuplicateHint && (
                <p className="mt-2 text-xs font-medium text-violet-800 dark:text-violet-200">
                  Mükerrer notu: {report.aiDuplicateHint}
                </p>
              )}
              {!report.aiSummary && !report.aiSuggestedCategory && !report.aiPriority && !report.aiDuplicateHint && (
                <p className="text-slate-600 dark:text-slate-400">
                  Henüz AI analizi yok. Sağdaki düğme özet üretir ve aşağıdaki "Vatandaşa Not" alanını otomatik doldurur.
                </p>
              )}
              {report.aiReplyDraft && (
                <p className="mt-3 rounded-lg bg-white/80 p-2 text-xs text-slate-700 dark:bg-slate-900/60 dark:text-slate-200">
                  <span className="font-bold">Yanıt taslağı:</span> {report.aiReplyDraft}
                </p>
              )}
            </div>
          </div>
          <button
            type="button"
            disabled={aiBusy}
            onClick={() => void runAiAnalysis()}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-violet-600 px-3 py-2 text-xs font-bold text-white hover:bg-violet-700 disabled:opacity-50"
          >
            <Sparkles className="h-3.5 w-3.5" />
            {aiBusy ? 'Oluşturuluyor…' : 'AI yanıtı oluştur'}
          </button>
        </div>

        {(report.duplicateGroupSize != null && report.duplicateGroupSize > 1) || duplicateGroup.length > 0 ? (
          <div className="mb-6 rounded-2xl border border-violet-200/90 bg-violet-50/80 p-4 dark:border-violet-900/50 dark:bg-violet-950/30">
            <div className="mb-3 flex items-center gap-2">
              <Layers className="h-5 w-5 text-violet-700 dark:text-violet-300" />
              <p className="text-sm font-bold text-violet-900 dark:text-violet-100">
                Tek olay — aynı konumdan {report.duplicateGroupSize ?? duplicateGroup.length + 1} ihbar
              </p>
            </div>
            <p className="mb-3 text-xs text-violet-800/90 dark:text-violet-200/90">
              Yakındaki bekleyen veya işlenen ihbarlar otomatik gruplandı. Çözümü bir kez uygulayıp diğerlerini reddedebilirsiniz.
            </p>
            <ul className="space-y-2">
              {duplicateGroup.map((d) => (
                <li key={d.id}>
                  <Link
                    to={`/reports/${d.id}`}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-violet-200/60 bg-white px-3 py-2 text-sm hover:border-violet-300 dark:border-violet-800 dark:bg-slate-900"
                  >
                    <span className="font-medium text-slate-900 dark:text-white">{d.title}</span>
                    <span className="text-[10px] font-bold uppercase text-slate-500">{d.status}</span>
                  </Link>
                </li>
              ))}
            </ul>
            {currentUser?.departmentId != null && (
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={bulkBusy !== null}
                  onClick={() => bulkCloseDuplicateGroup()}
                  className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  {bulkBusy === 'RESOLVED' ? '…' : 'Grubu çözüldü işaretle'}
                </button>
              </div>
            )}
          </div>
        ) : null}

          {report.mediaUrls && report.mediaUrls.length > 0 && (
            <div className="mb-6">
              <p className="mb-2 text-sm font-semibold text-slate-500">Fotoğraflar</p>
              <div className="flex flex-wrap gap-3">
                {report.mediaUrls.map((url, i) => (
                  <a key={i} href={resolveMediaUrl(url)} target="_blank" rel="noreferrer" className="group">
                    <img
                      src={resolveMediaUrl(url)}
                      alt={`Rapor fotoğrafı ${i + 1}`}
                      className="h-28 w-28 rounded-xl border border-slate-200 object-cover shadow-sm transition-transform group-hover:scale-105 dark:border-slate-700"
                    />
                  </a>
                ))}
              </div>
            </div>
          )}

          <dl className="grid gap-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="font-semibold text-slate-500">Vatandaş</dt>
            <dd className="text-slate-900 dark:text-white">{report.reporterFullName ?? '—'}</dd>
          </div>
          <div>
            <dt className="font-semibold text-slate-500">Atanan</dt>
            <dd className="flex flex-col gap-2">
              <span className="text-slate-900 dark:text-white font-medium">{report.assigneeFullName ?? 'Henüz atanmamış'}</span>
              
              <div className="mt-2 flex items-center gap-2">
                <select 
                  value={selectedOfficerId}
                  onChange={(e) => setSelectedOfficerId(e.target.value)}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                >
                  <option value="">Saha Görevlisi Seç...</option>
                  {officers.map(o => (
                    <option key={o.id} value={o.id}>{o.firstName} {o.lastName}</option>
                  ))}
                </select>
                <button 
                  onClick={handleAssign}
                  disabled={!selectedOfficerId || isAssigning}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-white transition-all hover:bg-primary-hover disabled:opacity-50"
                >
                  {isAssigning ? '...' : <><UserPlus className="h-3 w-3" /> Ata</>}
                </button>
              </div>
              {successMsg && (
                <p className="flex items-center gap-1 text-[11px] font-bold text-green-600 dark:text-green-400">
                  <CheckCircle2 className="h-3 w-3" /> {successMsg}
                </p>
              )}
            </dd>
          </div>
          <div>
            <dt className="font-semibold text-slate-500">Oluşturulma</dt>
            <dd className="text-slate-900 dark:text-white">{report.createdAt ? new Date(report.createdAt).toLocaleString('tr-TR') : '—'}</dd>
          </div>
          <div className="flex items-start gap-2">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-secondary" />
            <div>
              <dt className="font-semibold text-slate-500">Konum</dt>
              <dd className="font-mono text-slate-900 dark:text-white">
                {report.latitude}, {report.longitude}
              </dd>
            </div>
          </div>
        </dl>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-8">
          <h2 className="mb-6 text-lg font-bold text-slate-900 dark:text-white">Durum Güncelle</h2>
          <div className="space-y-4">
            <div>
              <label htmlFor="statusSelect" className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-300">Yeni Durum</label>
              <select
                id="statusSelect"
                value={statusValue}
                onChange={(e) => setStatusValue(e.target.value as 'PROCESSING' | 'RESOLVED')}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              >
                <option value="PROCESSING">İşlemde</option>
                {currentUser?.departmentId != null && (
                  <option value="RESOLVED">Çözüldü</option>
                )}
              </select>
            </div>
            <div>
              <label htmlFor="statusNote" className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                Vatandaşa Not
              </label>
              <textarea
                id="statusNote"
                rows={3}
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Vatandaşa iletilecek not (opsiyonel). Üst kısımdaki 'AI yanıtı oluştur' tuşu bu alanı otomatik doldurur."
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>
            <button
              onClick={() => void saveStatus()}
              disabled={statusBusy}
              className="w-full rounded-xl bg-primary py-3 text-sm font-bold text-white transition-colors hover:bg-primary-hover disabled:opacity-60"
            >
              {statusBusy ? 'Kaydediliyor…' : 'Durumu Kaydet'}
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-8">
          <h2 className="mb-6 text-lg font-bold text-slate-900 dark:text-white">Yaşam döngüsü</h2>
          <div className="relative space-y-0 border-l-2 border-primary/30 pl-5">
            {timeline.map((e, i) => (
              <div key={i} className="relative pb-8 last:pb-0">
                <span className="absolute -left-[26px] top-1 h-2.5 w-2.5 rounded-full bg-primary ring-4 ring-white dark:ring-slate-900" />
                <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
                  {e.at ? new Date(e.at).toLocaleString('tr-TR') : ''}
                </p>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">
                  {e.oldStatus ?? '—'} → {e.newStatus ?? '—'}
                </p>
                <p className="text-xs text-slate-500">{e.actorName}</p>
                {e.note && <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{e.note}</p>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>,
  );
}
