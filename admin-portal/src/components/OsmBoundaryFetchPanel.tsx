import { useState } from 'react';
import { Globe2, Loader2, RefreshCw } from 'lucide-react';
import api from '../api';

/**
 * Belediye sınırı OpenStreetMap'ten otomatik çekilir.
 *
 * Bu panelde manuel giriş yoktur — admin sadece "Sınırı yenile" düğmesine basar,
 * backend belediye adı + (varsa) parent büyükşehir adıyla Nominatim'i sorgular ve
 * polygonu PostGIS'e kaydeder.
 */
export default function OsmBoundaryFetchPanel() {
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const refreshFromOsm = async () => {
    setLoading(true);
    setMsg(null);
    try {
      const res = await api.post('/municipalities/me/boundaries/refresh');
      setMsg({
        type: 'ok',
        text: (res.data.message as string) || 'Sınır OpenStreetMap üzerinden güncellendi.',
      });
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      setMsg({
        type: 'err',
        text:
          err.response?.data?.message ??
          'OSM sınırı alınamadı. Belediye adının OpenStreetMap üzerindeki yazımıyla eşleştiğinden emin olun.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center gap-2 text-primary">
        <Globe2 className="h-5 w-5" />
        <h3 className="text-base font-bold text-slate-900 dark:text-white">Coğrafi sınır</h3>
      </div>
      <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
        Belediye sınırı, kayıt sırasında OpenStreetMap (Nominatim) üzerinden{' '}
        <strong>otomatik</strong> çekilir. Vatandaşların ihbar gönderebileceği alan bu poligon ile
        belirlenir. GeoJSON yüklemenize veya ilçe / il adlarını manuel girmenize gerek yoktur.
      </p>
      <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
        Sınır yanlış geldi ya da boş kaldıysa, aşağıdaki düğmeyle OSM'den yeniden çekebilirsiniz.
        Belediyenin <strong>OSM yazımıyla aynı ada</strong> sahip olduğundan emin olun
        (örn. "Şişli" — kısaltma değil).
      </p>

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

      <button
        type="button"
        disabled={loading}
        onClick={() => void refreshFromOsm()}
        className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white shadow-sm disabled:opacity-60"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
        Sınırı OpenStreetMap'ten yenile
      </button>
    </section>
  );
}
