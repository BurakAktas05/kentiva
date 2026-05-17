import { useEffect, useState } from 'react';
import { Building2, MapPin, Loader2 } from 'lucide-react';
import { fetchPublicMunicipalities, resolveMunicipalityByGps, type PublicTenant } from '../../api';
import { Lang, t } from '../../i18n';

type Props = {
  lang: Lang;
  isDark: boolean;
  onSelect: (t: PublicTenant) => void;
};

export default function MunicipalityPicker({ lang, isDark, onSelect }: Props) {
  const [list, setList] = useState<PublicTenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [gpsBusy, setGpsBusy] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const rows = await fetchPublicMunicipalities();
        if (!cancelled) setList(rows);
      } catch {
        if (!cancelled) setErr(lang === 'tr' ? 'Belediye listesi yüklenemedi.' : 'Could not load municipalities.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [lang]);

  const useGps = () => {
    if (!navigator.geolocation) {
      setErr(lang === 'tr' ? 'Cihaz konum desteklemiyor.' : 'Geolocation not supported.');
      return;
    }
    setErr('');
    setGpsBusy(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const resolved = await resolveMunicipalityByGps(pos.coords.latitude, pos.coords.longitude);
          if (resolved) onSelect(resolved);
          else setErr(lang === 'tr' ? 'Konum kayıtlı bir ilçe sınırıyla eşleşmedi.' : 'Location did not match a registered district.');
        } catch {
          setErr(lang === 'tr' ? 'Konuma göre belediye bulunamadı.' : 'Could not resolve municipality.');
        } finally {
          setGpsBusy(false);
        }
      },
      () => {
        setGpsBusy(false);
        setErr(lang === 'tr' ? 'Konum izni gerekli veya GPS kullanılamadı.' : 'Location permission required or GPS failed.');
      },
      { enableHighAccuracy: true, timeout: 12000 }
    );
  };

  return (
    <div className={`flex flex-col h-full ${isDark ? 'bg-slate-900' : 'bg-white'}`}>
      <div className={`p-6 border-b ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
        <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
          {t('tenant.title', lang)}
        </h2>
        <p className={`mt-2 text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{t('tenant.subtitle', lang)}</p>
        <button
          type="button"
          onClick={useGps}
          disabled={gpsBusy}
          className="mt-4 w-full flex items-center justify-center gap-2 rounded-xl bg-primary text-white py-3 font-semibold disabled:opacity-60"
        >
          {gpsBusy ? <Loader2 className="w-5 h-5 animate-spin" /> : <MapPin className="w-5 h-5" />}
          {t('tenant.gps', lang)}
        </button>
        {err ? <p className="mt-3 text-sm text-red-500">{err}</p> : null}
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className={`w-8 h-8 animate-spin ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
          </div>
        ) : (
          list.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => {
                if (!m.onboarded) {
                  setErr(t('tenant.notOnboarded', lang));
                  return;
                }
                onSelect(m);
              }}
              className={`w-full flex items-center gap-3 rounded-2xl border p-4 text-left transition-colors ${
                m.onboarded
                  ? isDark
                    ? 'border-slate-700 bg-slate-800/50 hover:bg-slate-800'
                    : 'border-slate-200 bg-white hover:bg-slate-50'
                  : isDark
                    ? 'border-slate-800 bg-slate-900/80 opacity-60'
                    : 'border-slate-100 bg-slate-50 opacity-70'
              }`}
            >
              {m.logoUrl ? (
                <img src={m.logoUrl} alt="" className="w-12 h-12 rounded-xl object-contain bg-white" />
              ) : (
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                  <Building2 className="w-6 h-6" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className={`font-semibold truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>{m.displayName}</p>
                {!m.onboarded ? (
                  <p className="text-xs text-amber-600 mt-0.5">{t('tenant.notOnboarded', lang)}</p>
                ) : null}
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
