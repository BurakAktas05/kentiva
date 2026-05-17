import { useEffect, useState } from 'react';
import { resolveMediaUrl } from '../lib/env';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Layers, MapPin, Sparkles, UserPlus, CheckCircle2 } from 'lucide-react';
import axios from 'axios';
import api, { type Report, type ReportListItem, type ReportTimelineEntry, type User } from '../api';

export default function ReportDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [report, setReport] = useState<Report | null>(null);
  const [timeline, setTimeline] = useState<ReportTimelineEntry[]>([]);
  const [officers, setOfficers] = useState<User[]>([]);
  const [selectedOfficerId, setSelectedOfficerId] = useState<string>('');
  const [isAssigning, setIsAssigning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [duplicateGroup, setDuplicateGroup] = useState<ReportListItem[]>([]);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      try {
        const [r, tl, u, dup] = await Promise.all([
          api.get(`/reports/${id}`), 
          api.get(`/reports/${id}/timeline`),
          api.get('/users?role=ROLE_FIELD_OFFICER'),
          api.get(`/reports/${id}/duplicate-group`),
        ]);
        if (!cancelled) {
          setReport(r.data.data as Report);
          setTimeline(tl.data.data as ReportTimelineEntry[]);
          setOfficers(u.data.data as User[]);
          setDuplicateGroup(dup.data.data as ReportListItem[]);
        }
      } catch {
        if (!cancelled) setError('Rapor bulunamadı veya erişim yok.');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

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

  if (error) {
    return (
      <div className="p-6">
        <Link to="/reports" className="mb-4 inline-flex items-center gap-2 text-sm font-bold text-primary">
          <ArrowLeft className="h-4 w-4" />
          Raporlara dön
        </Link>
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">{error}</div>
      </div>
    );
  }

  if (!report) {
    return <div className="p-6 text-slate-500">Yükleniyor…</div>;
  }

  return (
    <div className="space-y-6 p-6">
      <Link to="/reports" className="inline-flex items-center gap-2 text-sm font-bold text-primary hover:underline">
        <ArrowLeft className="h-4 w-4" />
        Raporlara dön
      </Link>

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

        {(report.aiSummary || report.aiSuggestedCategory || report.aiPriority || report.aiDuplicateHint) && (
          <div className="mb-6 flex gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-4 dark:border-primary/30 dark:bg-primary/10">
            <Sparkles className="h-5 w-5 shrink-0 text-secondary" />
            <div className="text-sm">
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
            </div>
          </div>
        )}

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
              <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-300">Yeni Durum</label>
              <select
                id="statusSelect"
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              >
                <option value="PROCESSING">İşlemde</option>
                <option value="RESOLVED">Çözüldü</option>
                <option value="REJECTED">Reddedildi</option>
              </select>
            </div>
            <div>
              <div className="mb-1 flex items-center justify-between">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Vatandaşa Not</label>
                {report.aiReplyDraft && (
                  <button
                    onClick={() => {
                      const noteEl = document.getElementById('statusNote') as HTMLTextAreaElement;
                      if (noteEl) noteEl.value = report.aiReplyDraft!;
                    }}
                    className="flex items-center gap-1.5 rounded-lg bg-secondary/10 px-2 py-1 text-xs font-bold text-secondary transition-colors hover:bg-secondary/20"
                  >
                    <Sparkles className="h-3 w-3" /> AI Yanıtı Kullan
                  </button>
                )}
              </div>
              <textarea
                id="statusNote"
                rows={3}
                placeholder="Vatandaşa iletilecek not (opsiyonel)..."
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              ></textarea>
            </div>
            <button
              onClick={async () => {
                const newStatus = (document.getElementById('statusSelect') as HTMLSelectElement).value;
                const note = (document.getElementById('statusNote') as HTMLTextAreaElement).value;
                try {
                  await api.patch(`/reports/${id}/status`, { newStatus, note });
                  window.location.reload();
                } catch (e) {
                  alert('Durum güncellenemedi');
                }
              }}
              className="w-full rounded-xl bg-primary py-3 text-sm font-bold text-white transition-colors hover:bg-primary-hover"
            >
              Durumu Kaydet
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
    </div>
  );
}
