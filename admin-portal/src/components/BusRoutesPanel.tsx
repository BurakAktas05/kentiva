import React, { useCallback, useEffect, useState } from 'react';
import {
  Bus,
  FileSpreadsheet,
  FileText,
  Loader2,
  UploadCloud,
  Trash2,
  ArrowUp,
  ArrowDown,
  Plus,
  X,
  ChevronDown,
  ChevronUp,
  Save,
  Undo2,
  Link as LinkIcon,
  Globe,
} from 'lucide-react';
import api from '../api';

type RouteScheduleInfo = {
  departuresFromStart?: string[];
  departuresFromEnd?: string[];
};

type BusRoute = {
  id: string;
  name: string;
  code: string;
  stops: string[];
  color: string;
  icon: string;
  schedule: {
    weekday?: RouteScheduleInfo | null;
    weekend?: RouteScheduleInfo | null;
    saturday?: RouteScheduleInfo | null;
    sunday?: RouteScheduleInfo | null;
  };
};

type DayType = 'weekday' | 'weekend' | 'saturday' | 'sunday';

interface BusRoutesPanelProps {
  municipalityId: string;
}

const PRESET_COLORS = [
  '#3B82F6', // Blue
  '#10B981', // Emerald/Green
  '#F59E0B', // Amber
  '#EF4444', // Red
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#06B6D4', // Cyan
  '#F97316', // Orange
];

const DAY_LABELS: Record<DayType, string> = {
  weekday: 'Hafta İçi',
  weekend: 'Hafta Sonu (Genel)',
  saturday: 'Cumartesi',
  sunday: 'Pazar',
};

const DAY_COLORS: Record<DayType, { start: string; end: string }> = {
  weekday: {
    start: 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300',
    end: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300',
  },
  weekend: {
    start: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
    end: 'bg-orange-50 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300',
  },
  saturday: {
    start: 'bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300',
    end: 'bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300',
  },
  sunday: {
    start: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
    end: 'bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300',
  },
};

export default function BusRoutesPanel({ municipalityId }: BusRoutesPanelProps) {
  const [routes, setRoutes] = useState<BusRoute[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  // Import mode: 'file' | 'url'
  const [importMode, setImportMode] = useState<'file' | 'url'>('file');
  const [urlInput, setUrlInput] = useState('');
  const [urlLoading, setUrlLoading] = useState(false);

  // Preview Mode State
  const [previewRoutes, setPreviewRoutes] = useState<BusRoute[]>([]);
  const [expandedRouteId, setExpandedRouteId] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  // Form Inputs for edits
  const [newStopText, setNewStopText] = useState<{ [routeId: string]: string }>({});
  const [newTimes, setNewTimes] = useState<{
    [key: string]: string; // key = `${routeId}-${dayType}-start` or `${routeId}-${dayType}-end`
  }>({});

  // Deleting a live route
  const [deletingRouteId, setDeletingRouteId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/public/municipalities/${municipalityId}/bus-routes`);
      setRoutes((res.data.data as BusRoute[]) || []);
    } catch {
      setMsg({ type: 'err', text: 'Hat listesi yüklenemedi.' });
    } finally {
      setLoading(false);
    }
  }, [municipalityId]);

  useEffect(() => {
    if (municipalityId) {
      Promise.resolve().then(() => {
        void load();
      });
    }
  }, [municipalityId, load]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setSelectedFiles(Array.from(e.target.files));
      setMsg(null);
    }
  };

  // ── FILE UPLOAD PREVIEW ──────────────────────────────────────────
  const handleUploadPreview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedFiles.length === 0) return;

    setUploading(true);
    setMsg(null);

    const formData = new FormData();
    selectedFiles.forEach((file) => {
      formData.append('files', file);
    });

    try {
      const res = await api.post('/municipalities/me/bus-routes/import-preview', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 180000, // 3 dakika — multi-pass analizi
      });
      const data = res.data.data as BusRoute[];
      setPreviewRoutes(data || []);
      if (data && data.length > 0) {
        setExpandedRouteId(data[0].id);
      }
      setMsg({
        type: 'ok',
        text: `Dosyalar analiz edildi! ${data?.length ?? 0} hat bulundu. Aşağıdan düzenleyip onaylayabilirsiniz.`,
      });
    } catch (err: unknown) {
      const errorMsg = err as { response?: { data?: { message?: string } } };
      setMsg({
        type: 'err',
        text: errorMsg.response?.data?.message || 'Yükleme ve önizleme işlemi başarısız oldu.',
      });
    } finally {
      setUploading(false);
    }
  };

  // ── URL IMPORT PREVIEW ───────────────────────────────────────────
  const handleUrlPreview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput.trim()) return;

    setUrlLoading(true);
    setMsg(null);

    try {
      const res = await api.post(
        '/municipalities/me/bus-routes/import-from-url-preview',
        { url: urlInput.trim() },
        { timeout: 60000 },
      );
      const data = res.data.data as BusRoute[];
      setPreviewRoutes(data || []);
      if (data && data.length > 0) {
        setExpandedRouteId(data[0].id);
      }
      setMsg({
        type: 'ok',
        text: `URL analiz edildi! ${data?.length ?? 0} hat bulundu. Aşağıdan düzenleyip onaylayabilirsiniz.`,
      });
    } catch (err: unknown) {
      const errorMsg = err as { response?: { data?: { message?: string } } };
      setMsg({
        type: 'err',
        text: errorMsg.response?.data?.message || 'URL analiz işlemi başarısız oldu.',
      });
    } finally {
      setUrlLoading(false);
    }
  };

  // ── CONFIRM SAVE ────────────────────────────────────────────────
  const handleConfirmSave = async () => {
    if (previewRoutes.length === 0) return;
    setConfirming(true);
    setMsg(null);

    try {
      await api.post('/municipalities/me/bus-routes/import-confirm', previewRoutes);
      setMsg({
        type: 'ok',
        text: 'Otobüs hatları başarıyla onaylandı ve sisteme kaydedildi.',
      });
      setPreviewRoutes([]);
      setSelectedFiles([]);
      setUrlInput('');
      await load();
    } catch (err: unknown) {
      const errorMsg = err as { response?: { data?: { message?: string } } };
      setMsg({
        type: 'err',
        text: errorMsg.response?.data?.message || 'Kaydetme işlemi başarısız oldu.',
      });
    } finally {
      setConfirming(false);
    }
  };

  const handleCancelPreview = () => {
    setPreviewRoutes([]);
    setSelectedFiles([]);
    setUrlInput('');
    setMsg(null);
  };

  // ── DELETE LIVE ROUTE ───────────────────────────────────────────
  const handleDeleteRoute = async (routeId: string) => {
    if (!window.confirm('Bu hattı silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.')) return;

    setDeletingRouteId(routeId);
    try {
      await api.delete(`/municipalities/me/bus-routes/${routeId}`);
      setMsg({ type: 'ok', text: 'Hat başarıyla silindi.' });
      await load();
    } catch (err: unknown) {
      const errorMsg = err as { response?: { data?: { message?: string } } };
      setMsg({
        type: 'err',
        text: errorMsg.response?.data?.message || 'Hat silinemedi.',
      });
    } finally {
      setDeletingRouteId(null);
    }
  };

  // ── EDITOR HELPERS ──────────────────────────────────────────────
  const updateRouteField = (id: string, field: keyof BusRoute, value: unknown) => {
    setPreviewRoutes((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)),
    );
  };

  const addStop = (routeId: string) => {
    const text = newStopText[routeId] || '';
    if (!text.trim()) return;
    setPreviewRoutes((prev) =>
      prev.map((r) => {
        if (r.id === routeId) return { ...r, stops: [...r.stops, text.trim()] };
        return r;
      }),
    );
    setNewStopText((prev) => ({ ...prev, [routeId]: '' }));
  };

  const removeStop = (routeId: string, index: number) => {
    setPreviewRoutes((prev) =>
      prev.map((r) => {
        if (r.id === routeId) {
          const updated = [...r.stops];
          updated.splice(index, 1);
          return { ...r, stops: updated };
        }
        return r;
      }),
    );
  };

  const moveStop = (routeId: string, index: number, direction: 'up' | 'down') => {
    setPreviewRoutes((prev) =>
      prev.map((r) => {
        if (r.id === routeId) {
          const updated = [...r.stops];
          const target = direction === 'up' ? index - 1 : index + 1;
          if (target >= 0 && target < updated.length) {
            const temp = updated[index];
            updated[index] = updated[target];
            updated[target] = temp;
          }
          return { ...r, stops: updated };
        }
        return r;
      }),
    );
  };

  const getTimeKey = (routeId: string, day: DayType, dir: 'start' | 'end') =>
    `${routeId}-${day}-${dir}`;

  const validateAndAddTime = (routeId: string, dayType: DayType, direction: 'start' | 'end') => {
    const key = getTimeKey(routeId, dayType, direction);
    const inputVal = newTimes[key] || '';
    if (!inputVal) return;

    let normalized = inputVal.trim().replace('.', ':');
    if (!/^\d{1,2}:\d{2}$/.test(normalized)) {
      alert('Lütfen HH:mm formatında geçerli bir saat girin (Örn: 08:30)');
      return;
    }
    if (normalized.length === 4) normalized = '0' + normalized;

    setPreviewRoutes((prev) =>
      prev.map((r) => {
        if (r.id !== routeId) return r;
        const schedule = { ...r.schedule };
        const daySched = { ...(schedule[dayType] || { departuresFromStart: [], departuresFromEnd: [] }) };

        if (direction === 'start') {
          const times = [...(daySched.departuresFromStart || [])];
          if (!times.includes(normalized)) { times.push(normalized); times.sort(); }
          daySched.departuresFromStart = times;
        } else {
          const times = [...(daySched.departuresFromEnd || [])];
          if (!times.includes(normalized)) { times.push(normalized); times.sort(); }
          daySched.departuresFromEnd = times;
        }

        schedule[dayType] = daySched;
        return { ...r, schedule };
      }),
    );

    setNewTimes((p) => ({ ...p, [key]: '' }));
  };

  const removeTime = (routeId: string, dayType: DayType, direction: 'start' | 'end', timeVal: string) => {
    setPreviewRoutes((prev) =>
      prev.map((r) => {
        if (r.id !== routeId) return r;
        const schedule = { ...r.schedule };
        const daySched = { ...(schedule[dayType] || { departuresFromStart: [], departuresFromEnd: [] }) };

        if (direction === 'start') {
          daySched.departuresFromStart = (daySched.departuresFromStart || []).filter((t) => t !== timeVal);
        } else {
          daySched.departuresFromEnd = (daySched.departuresFromEnd || []).filter((t) => t !== timeVal);
        }

        schedule[dayType] = daySched;
        return { ...r, schedule };
      }),
    );
  };

  const removePreviewRoute = (id: string) => {
    setPreviewRoutes((prev) => prev.filter((r) => r.id !== id));
  };

  const toggleExpand = (id: string) => {
    setExpandedRouteId((prev) => (prev === id ? null : id));
  };

  const isInPreviewMode = previewRoutes.length > 0;

  // ── SCHEDULE EDITOR (reusable for all day types) ─────────────────
  const renderScheduleEditor = (route: BusRoute, dayType: DayType) => {
    const daySched = route.schedule[dayType];
    const colors = DAY_COLORS[dayType];
    const startKey = getTimeKey(route.id, dayType, 'start');
    const endKey = getTimeKey(route.id, dayType, 'end');

    return (
      <div className="border border-slate-100 rounded-xl bg-white p-4 dark:border-slate-850 dark:bg-slate-900/60 space-y-4">
        <h6 className="font-bold text-slate-700 dark:text-slate-300 border-b border-slate-100 pb-1.5 dark:border-slate-800">
          {DAY_LABELS[dayType]} Sefer Saatleri
        </h6>

        {/* Departures From Start */}
        <div className="space-y-1.5">
          <label className="block text-[10px] font-bold text-slate-500">BAŞLANGIÇTAN KALKIŞ</label>
          <div className="flex flex-wrap gap-1 mb-2">
            {(daySched?.departuresFromStart || []).map((t) => (
              <span key={t} className={`inline-flex items-center gap-1 ${colors.start} px-2 py-0.5 rounded font-mono font-bold text-xs`}>
                {t}
                <button type="button" onClick={() => removeTime(route.id, dayType, 'start', t)} className="hover:text-red-500 shrink-0">
                  <X className="h-2.5 w-2.5" />
                </button>
              </span>
            ))}
            {(daySched?.departuresFromStart || []).length === 0 && (
              <span className="text-[10px] text-slate-400 italic">Saat eklenmedi</span>
            )}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="08:30"
              value={newTimes[startKey] || ''}
              onChange={(e) => setNewTimes((p) => ({ ...p, [startKey]: e.target.value }))}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); validateAndAddTime(route.id, dayType, 'start'); } }}
              className="w-24 rounded-lg border border-slate-200 px-2 py-1 font-mono text-center dark:border-slate-800 dark:bg-slate-900 text-xs"
            />
            <button type="button" onClick={() => validateAndAddTime(route.id, dayType, 'start')} className="rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 px-2 font-semibold text-xs">
              Ekle
            </button>
          </div>
        </div>

        {/* Departures From End */}
        <div className="space-y-1.5">
          <label className="block text-[10px] font-bold text-slate-500">BİTİŞTEN KALKIŞ</label>
          <div className="flex flex-wrap gap-1 mb-2">
            {(daySched?.departuresFromEnd || []).map((t) => (
              <span key={t} className={`inline-flex items-center gap-1 ${colors.end} px-2 py-0.5 rounded font-mono font-bold text-xs`}>
                {t}
                <button type="button" onClick={() => removeTime(route.id, dayType, 'end', t)} className="hover:text-red-500 shrink-0">
                  <X className="h-2.5 w-2.5" />
                </button>
              </span>
            ))}
            {(daySched?.departuresFromEnd || []).length === 0 && (
              <span className="text-[10px] text-slate-400 italic">Saat eklenmedi</span>
            )}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="08:45"
              value={newTimes[endKey] || ''}
              onChange={(e) => setNewTimes((p) => ({ ...p, [endKey]: e.target.value }))}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); validateAndAddTime(route.id, dayType, 'end'); } }}
              className="w-24 rounded-lg border border-slate-200 px-2 py-1 font-mono text-center dark:border-slate-800 dark:bg-slate-900 text-xs"
            />
            <button type="button" onClick={() => validateAndAddTime(route.id, dayType, 'end')} className="rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 px-2 font-semibold text-xs">
              Ekle
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ── RENDER ───────────────────────────────────────────────────────
  return (
    <section className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center gap-2 text-primary">
        <Bus className="h-5 w-5" />
        <h3 className="text-base font-bold text-slate-900 dark:text-white">
          {isInPreviewMode ? 'Yapay Zeka Analiz Önizleme' : 'Ulaşım ve Otobüs Seferleri'}
        </h3>
      </div>
      <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
        {isInPreviewMode
          ? 'Yapay Zeka tarafından çıkarılan hatlar aşağıdadır. Verileri kontrol edin, düzeltin ve kaydedin.'
          : 'Otobüs hatlarını PDF, Excel, TXT veya API URL ile içe aktarın. Gemini AI dosyaları analiz eder.'}
      </p>

      {/* Messages */}
      {msg && (
        <p
          className={`mt-4 rounded-xl px-3 py-2 text-sm font-medium ${
            msg.type === 'ok'
              ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200'
              : 'bg-red-50 text-red-800 dark:bg-red-950/40 dark:text-red-200'
          }`}
        >
          {msg.text}
        </p>
      )}

      {/* ── 1. IMPORT FORM ─────────────────────────────────────────── */}
      {!isInPreviewMode && (
        <div className="mt-5 space-y-4">
          {/* Import Mode Tabs */}
          <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl w-fit">
            <button
              type="button"
              onClick={() => { setImportMode('file'); setMsg(null); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                importMode === 'file'
                  ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white'
                  : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
              }`}
            >
              <UploadCloud className="h-3.5 w-3.5" />
              Dosya Yükle
            </button>
            <button
              type="button"
              onClick={() => { setImportMode('url'); setMsg(null); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                importMode === 'url'
                  ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white'
                  : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
              }`}
            >
              <Globe className="h-3.5 w-3.5" />
              API / URL
            </button>
          </div>

          {/* File Upload Form */}
          {importMode === 'file' && (
            <form onSubmit={(e) => void handleUploadPreview(e)} className="space-y-4">
              <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 p-6 text-center dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20">
                <UploadCloud className="h-10 w-10 text-slate-400 dark:text-slate-600 mb-2" />
                <label className="cursor-pointer text-xs font-semibold text-primary hover:underline">
                  Dosyaları Seçin (PDF, Excel, TXT)
                  <input
                    type="file"
                    multiple
                    accept=".pdf,.xlsx,.xls,.txt,.csv"
                    onChange={handleFileChange}
                    className="hidden"
                    disabled={uploading}
                  />
                </label>
                <p className="mt-1 text-[11px] text-slate-500">Birden fazla dosya seçebilirsiniz.</p>

                {selectedFiles.length > 0 && (
                  <div className="mt-4 w-full max-w-xs space-y-1.5 text-left">
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-300">Seçilen Dosyalar:</p>
                    {selectedFiles.map((file, i) => (
                      <div key={i} className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
                        {file.name.endsWith('.pdf') ? (
                          <FileText className="h-3.5 w-3.5 text-red-500" />
                        ) : file.name.endsWith('.xlsx') || file.name.endsWith('.xls') ? (
                          <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-500" />
                        ) : (
                          <FileText className="h-3.5 w-3.5 text-slate-500" />
                        )}
                        <span className="truncate flex-1">{file.name}</span>
                        <span className="text-[10px] text-slate-400">({(file.size / 1024).toFixed(0)} KB)</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {selectedFiles.length > 0 && (
                <button
                  type="submit"
                  disabled={uploading}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white shadow-sm disabled:opacity-60 hover:opacity-90 transition-opacity"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Yapay Zeka Analiz Ediyor... (Multi-Pass PNG + OCR)
                    </>
                  ) : (
                    'Dosyaları Yükle ve Önizle'
                  )}
                </button>
              )}
            </form>
          )}

          {/* URL Import Form */}
          {importMode === 'url' && (
            <form onSubmit={(e) => void handleUrlPreview(e)} className="space-y-3">
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 p-4 space-y-3">
                <div className="flex items-start gap-2">
                  <LinkIcon className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">REST API veya Ham Veri URL'si</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Belediyenizin otobüs tarifeleri sunan bir API veya metin dosyası URL'si girin. JSON, düz metin veya HTML desteklenir.
                    </p>
                  </div>
                </div>
                <input
                  type="url"
                  placeholder="https://belediye.gov.tr/api/otobus-tarifeleri"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  disabled={urlLoading}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-900 dark:text-white placeholder-slate-400"
                />
              </div>

              <button
                type="submit"
                disabled={urlLoading || !urlInput.trim()}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white shadow-sm disabled:opacity-60 hover:opacity-90 transition-opacity"
              >
                {urlLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    URL Analiz Ediliyor...
                  </>
                ) : (
                  <>
                    <Globe className="h-4 w-4" />
                    URL'den Analiz Et ve Önizle
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      )}

      {/* ── 2. PREVIEW + EDITOR ─────────────────────────────────────── */}
      {isInPreviewMode && (
        <div className="mt-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
              Çıkarılan Hatlar ({previewRoutes.length})
            </h4>
            <span className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-400 font-semibold px-2 py-0.5 rounded-full">
              Henüz kaydedilmedi
            </span>
          </div>

          <div className="space-y-4">
            {previewRoutes.map((route) => {
              const isExpanded = expandedRouteId === route.id;
              return (
                <div
                  key={route.id}
                  className="rounded-xl border border-slate-200 bg-white/50 dark:border-slate-850 dark:bg-slate-950/40 shadow-sm overflow-hidden"
                >
                  {/* Collapsed Header */}
                  <div
                    onClick={() => toggleExpand(route.id)}
                    className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm shrink-0"
                        style={{ backgroundColor: route.color || '#3B82F6' }}
                      >
                        {route.code || '?'}
                      </div>
                      <div className="min-w-0">
                        <h5 className="font-bold text-slate-800 dark:text-slate-100 text-sm">{route.name || 'İsimsiz Hat'}</h5>
                        <p className="text-xs text-slate-500 mt-1 truncate">
                          {route.stops.length > 0
                            ? `${route.stops.length} Durak: ${route.stops.slice(0, 3).join(' → ')}${route.stops.length > 3 ? '...' : ''}`
                            : 'Durak bilgisi yok'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="hidden sm:flex gap-1 text-[10px] text-slate-500">
                        <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-medium">
                          Hİ: {route.schedule?.weekday?.departuresFromStart?.length || 0}
                        </span>
                        {(route.schedule?.weekend || route.schedule?.saturday || route.schedule?.sunday) && (
                          <span className="px-2 py-0.5 rounded bg-violet-50 dark:bg-violet-950/30 text-violet-700 dark:text-violet-400 font-medium">
                            HS: ✓
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); removePreviewRoute(route.id); }}
                        className="p-1 text-slate-400 hover:text-red-500 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                        title="Hattı Kaldır"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                      {isExpanded ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
                    </div>
                  </div>

                  {/* Expanded Editor */}
                  {isExpanded && (
                    <div className="border-t border-slate-100 dark:border-slate-850 p-5 bg-slate-50/30 dark:bg-slate-950/10 space-y-5 text-xs">
                      {/* Basic Fields */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-500 mb-1">HAT KODU</label>
                          <input
                            type="text"
                            value={route.code}
                            onChange={(e) => updateRouteField(route.id, 'code', e.target.value)}
                            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-semibold dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-500 mb-1">HAT ADI</label>
                          <input
                            type="text"
                            value={route.name}
                            onChange={(e) => updateRouteField(route.id, 'name', e.target.value)}
                            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-semibold dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-500 mb-1">RENK</label>
                          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                            {PRESET_COLORS.map((c) => (
                              <button
                                key={c}
                                type="button"
                                onClick={() => updateRouteField(route.id, 'color', c)}
                                className={`w-5 h-5 rounded-full border transition-all ${
                                  route.color === c
                                    ? 'ring-2 ring-primary ring-offset-1 scale-110'
                                    : 'border-transparent'
                                }`}
                                style={{ backgroundColor: c }}
                              />
                            ))}
                            <input
                              type="color"
                              value={route.color?.startsWith('#') ? route.color : '#3B82F6'}
                              onChange={(e) => updateRouteField(route.id, 'color', e.target.value)}
                              className="w-6 h-6 p-0 border border-slate-200 rounded cursor-pointer dark:border-slate-800 bg-transparent"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Stops Editor */}
                      <div className="border border-slate-100 rounded-xl bg-white p-4 dark:border-slate-850 dark:bg-slate-900/60">
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Güzergah Durakları ({route.stops.length})
                        </label>
                        <p className="text-[10px] text-slate-500 mb-3">Ok düğmeleriyle sıralamayı değiştirebilirsiniz.</p>

                        <div className="space-y-1 max-h-48 overflow-y-auto mb-3 pr-1">
                          {route.stops.map((stop, sIdx) => (
                            <div
                              key={sIdx}
                              className="flex items-center justify-between gap-2 p-2 rounded-lg bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-850"
                            >
                              <span className="font-medium text-slate-700 dark:text-slate-300 text-xs">
                                {sIdx + 1}. {stop}
                              </span>
                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  type="button"
                                  disabled={sIdx === 0}
                                  onClick={() => moveStop(route.id, sIdx, 'up')}
                                  className="p-1 rounded text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800 disabled:opacity-30"
                                >
                                  <ArrowUp className="h-3 w-3" />
                                </button>
                                <button
                                  type="button"
                                  disabled={sIdx === route.stops.length - 1}
                                  onClick={() => moveStop(route.id, sIdx, 'down')}
                                  className="p-1 rounded text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800 disabled:opacity-30"
                                >
                                  <ArrowDown className="h-3 w-3" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => removeStop(route.id, sIdx)}
                                  className="p-1 rounded text-slate-400 hover:text-red-500 hover:bg-slate-200 dark:hover:bg-slate-800"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </div>
                            </div>
                          ))}
                          {route.stops.length === 0 && (
                            <p className="text-slate-400 text-center py-2 italic text-[11px]">Henüz durak eklenmedi.</p>
                          )}
                        </div>

                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="Durak adı ekle..."
                            value={newStopText[route.id] || ''}
                            onChange={(e) => setNewStopText((p) => ({ ...p, [route.id]: e.target.value }))}
                            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addStop(route.id); } }}
                            className="flex-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs dark:border-slate-800 dark:bg-slate-900"
                          />
                          <button
                            type="button"
                            onClick={() => addStop(route.id)}
                            className="inline-flex items-center justify-center gap-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 px-3 font-semibold text-xs"
                          >
                            <Plus className="h-3.5 w-3.5" /> Ekle
                          </button>
                        </div>
                      </div>

                      {/* Schedule Editors — all 4 day types */}
                      <div>
                        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-3">
                          Sefer Saatleri
                        </p>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                          {renderScheduleEditor(route, 'weekday')}
                          {renderScheduleEditor(route, 'weekend')}
                          {renderScheduleEditor(route, 'saturday')}
                          {renderScheduleEditor(route, 'sunday')}
                        </div>
                        <p className="text-[10px] text-slate-400 mt-2">
                          * Cumartesi ve Pazar boş bırakılırsa mobil uygulama "Hafta Sonu (Genel)" tarifesine geri döner.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Preview Controls */}
          <div className="flex gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => void handleConfirmSave()}
              disabled={confirming || previewRoutes.length === 0}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 text-sm font-bold shadow-sm disabled:opacity-60 transition-all"
            >
              {confirming ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Kaydediliyor...</>
              ) : (
                <><Save className="h-4 w-4" /> Tümünü Onayla ve Kaydet</>
              )}
            </button>
            <button
              type="button"
              onClick={handleCancelPreview}
              disabled={confirming}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 px-4 py-2.5 text-sm font-bold transition-all"
            >
              <Undo2 className="h-4 w-4" /> İptal
            </button>
          </div>
        </div>
      )}

      {/* ── 3. CURRENT LIVE ROUTES ───────────────────────────────────── */}
      {!isInPreviewMode && (
        <div className="mt-6 border-t border-slate-100 pt-5 dark:border-slate-800">
          <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-3">
            Güncel Aktif Hatlar ({routes.length})
          </h4>

          {loading ? (
            <div className="flex items-center gap-2 text-sm text-slate-500 py-4">
              <Loader2 className="h-4 w-4 animate-spin" />
              Yükleniyor...
            </div>
          ) : routes.length > 0 ? (
            <div className="space-y-3">
              {routes.map((route) => (
                <div
                  key={route.id}
                  className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-xl border border-slate-100 bg-slate-50/30 dark:border-slate-800 dark:bg-slate-900/40"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm shrink-0"
                      style={{ backgroundColor: route.color || '#10B981' }}
                    >
                      {route.code}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-800 dark:text-slate-100 text-sm">{route.name}</p>
                      <p className="text-xs text-slate-500 mt-1 truncate">
                        {route.stops ? route.stops.slice(0, 4).join(' → ') + (route.stops.length > 4 ? '...' : '') : ''}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                    <div className="flex gap-1 text-[10px]">
                      <span className="px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 font-medium text-slate-600 dark:text-slate-400">
                        Hİ: {route.schedule?.weekday?.departuresFromStart?.length || 0} Sefer
                      </span>
                      {(route.schedule?.weekend || route.schedule?.saturday || route.schedule?.sunday) && (
                        <span className="px-2 py-1 rounded bg-violet-50 text-violet-700 dark:bg-violet-950/30 dark:text-violet-400 font-medium">
                          HS Aktif
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => void handleDeleteRoute(route.id)}
                      disabled={deletingRouteId === route.id}
                      title="Hattı Sil"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors disabled:opacity-50"
                    >
                      {deletingRouteId === route.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-500 py-4">
              Henüz hat yüklenmedi. Başlamak için yukarıdan dosya yükleyin veya URL girin.
            </p>
          )}
        </div>
      )}
    </section>
  );
}
