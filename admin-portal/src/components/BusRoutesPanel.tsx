import React, { useCallback, useEffect, useState } from 'react';
import { Bus, FileSpreadsheet, FileText, Loader2, Star, UploadCloud } from 'lucide-react';
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

interface BusRoutesPanelProps {
  municipalityId: string;
}

export default function BusRoutesPanel({ municipalityId }: BusRoutesPanelProps) {
  const [routes, setRoutes] = useState<BusRoute[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

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
      void load();
    }
  }, [municipalityId, load]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setSelectedFiles(Array.from(e.target.files));
      setMsg(null);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedFiles.length === 0) return;

    setUploading(true);
    setMsg(null);

    const formData = new FormData();
    selectedFiles.forEach((file) => {
      formData.append('files', file);
    });

    try {
      await api.post('/municipalities/me/bus-routes/import', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      setMsg({
        type: 'ok',
        text: 'Hat dosyaları başarıyla yüklendi. Yapay zeka ile güzergahlar ve sefer saatleri çıkarıldı!',
      });
      setSelectedFiles([]);
      await load();
    } catch (err: unknown) {
      const errorMsg = err as { response?: { data?: { message?: string } } };
      setMsg({
        type: 'err',
        text: errorMsg.response?.data?.message || 'İçe aktarma işlemi başarısız oldu.',
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <section className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center gap-2 text-primary">
        <Bus className="h-5 w-5" />
        <h3 className="text-base font-bold text-slate-900 dark:text-white">Ulaşım ve Otobüs Seferleri</h3>
      </div>
      <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
        Belediye otobüs hatlarını, güzergahlarını ve sefer saatlerini PDF, Excel veya TXT formatlarında yükleyin.
        <strong> Yapay Zekamız (Gemini)</strong> bu dosyaları okuyarak hat verilerini çıkartır ve vatandaşların
        mobil uygulamada sefer saatlerini görebilmesini sağlar.
      </p>

      {/* Upload Form */}
      <form onSubmit={(e) => void handleUpload(e)} className="mt-5 space-y-4">
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
              <p className="text-xs font-bold text-slate-700 dark:text-slate-350">Seçilen Dosyalar:</p>
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
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white shadow-sm disabled:opacity-60"
          >
            {uploading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Yapay Zeka Okuyor ve Çözümlüyor…
              </>
            ) : (
              'Dosyaları Yükle ve İşle'
            )}
          </button>
        )}
      </form>

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

      {/* Routes List */}
      <div className="mt-6 border-t border-slate-100 pt-5 dark:border-slate-800">
        <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-3">Güncel Hatlar ({routes.length})</h4>

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
                      {route.stops ? route.stops.join(' ↔ ') : ''}
                    </p>
                  </div>
                </div>

                <div className="flex gap-2 text-xs shrink-0 self-end md:self-center">
                  <span className="px-2 py-1 rounded-md bg-slate-100 dark:bg-slate-800 font-medium text-slate-600 dark:text-slate-400">
                    Hafta İçi: {route.schedule?.weekday?.departuresFromStart?.length || 0} Sefer
                  </span>
                  {(route.schedule?.weekend || route.schedule?.saturday || route.schedule?.sunday) && (
                    <span className="px-2 py-1 rounded-md bg-violet-50 text-violet-700 dark:bg-violet-950/30 dark:text-violet-400 font-medium">
                      Hafta Sonu Aktif
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-500 py-4">Henüz hat yüklenmedi. Başlamak için yukarıdan dosya yükleyin.</p>
        )}
      </div>
    </section>
  );
}
