import { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { Building2, ChevronLeft, MapPin, Loader2, Search, Sparkles } from 'lucide-react';
import { fetchPublicMunicipalities, resolveMunicipalityByGps, type PublicTenant } from '../../api';
import { getDevicePosition, isDeviceLocationFailure } from '../../lib/deviceLocation';
import { Lang, t } from '../../i18n';

export type MunicipalityPickerMode = 'onboarding' | 'change';

type Props = {
  lang: Lang;
  isDark: boolean;
  mode?: MunicipalityPickerMode;
  onSelect: (t: PublicTenant) => void;
  onCancel?: () => void;
};

export default function MunicipalityPicker({
  lang,
  isDark,
  mode = 'change',
  onSelect,
  onCancel,
}: Props) {
  const [list, setList] = useState<PublicTenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [gpsBusy, setGpsBusy] = useState(false);
  const [err, setErr] = useState('');
  const [query, setQuery] = useState('');

  const isOnboarding = mode === 'onboarding';

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const rows = await fetchPublicMunicipalities();
        if (!cancelled) setList(rows.filter((m) => m.onboarded));
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

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (m) =>
        m.displayName.toLowerCase().includes(q) ||
        m.slug.toLowerCase().includes(q),
    );
  }, [list, query]);

  const useGps = async () => {
    setErr('');
    setGpsBusy(true);
    const result = await getDevicePosition({ highAccuracy: true, timeoutMs: 15000 });
    if (result.ok) {
      try {
        const resolved = await resolveMunicipalityByGps(result.coords.lat, result.coords.lng);
        if (resolved?.onboarded) {
          onSelect(resolved);
        } else {
          setErr(lang === 'tr' ? 'Konum kayıtlı bir ilçe sınırıyla eşleşmedi.' : 'Location did not match a registered district.');
        }
      } catch {
        setErr(lang === 'tr' ? 'Konuma göre belediye bulunamadı.' : 'Could not resolve municipality.');
      } finally {
        setGpsBusy(false);
      }
    } else if (isDeviceLocationFailure(result)) {
      setGpsBusy(false);
      if (result.reason === 'denied') {
        setErr(t('report.location.denied', lang));
      } else if (result.reason === 'unsupported') {
        setErr(t('report.location.needGps', lang));
      } else {
        setErr(lang === 'tr' ? 'Konum alınamadı. Listeden seçebilirsiniz.' : 'Could not get location. Pick from the list.');
      }
    } else {
      setGpsBusy(false);
    }
  };

  return (
    <div
      className={`flex min-h-app flex-col ${isDark ? 'bg-slate-950 text-white' : 'bg-slate-50 text-slate-900'}`}
    >
      <div
        className={`border-b px-4 pb-5 pt-safe ${isDark ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-white'}`}
      >
        {!isOnboarding && onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            className={`mb-3 flex items-center gap-1 text-sm font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}
          >
            <ChevronLeft className="h-5 w-5" />
            {t('settings.back', lang)}
          </button>
        ) : null}

        {isOnboarding ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 flex items-center gap-3"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-white shadow-lg shadow-primary/25">
              <Sparkles className="h-6 w-6" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-primary">
                {t('tenant.onboardingStep', lang)}
              </p>
              <h1 className={`text-xl font-extrabold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                {t('tenant.onboardingTitle', lang)}
              </h1>
            </div>
          </motion.div>
        ) : (
          <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
            {t('tenant.title', lang)}
          </h2>
        )}

        <p className={`mt-2 text-sm leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
          {isOnboarding ? t('tenant.onboardingSubtitle', lang) : t('tenant.subtitle', lang)}
        </p>

        <button
          type="button"
          onClick={() => void useGps()}
          disabled={gpsBusy}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3.5 text-sm font-bold text-white shadow-md shadow-primary/25 disabled:opacity-60 active:scale-[0.99]"
        >
          {gpsBusy ? <Loader2 className="h-5 w-5 animate-spin" /> : <MapPin className="h-5 w-5" />}
          {t('tenant.gps', lang)}
        </button>

        <div className="relative mt-3">
          <Search
            className={`pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('tenant.search', lang)}
            className={`w-full rounded-xl border py-2.5 pl-9 pr-3 text-sm ${
              isDark
                ? 'border-slate-700 bg-slate-800 text-white placeholder:text-slate-500'
                : 'border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-400'
            }`}
          />
        </div>

        {err ? <p className="mt-3 text-sm font-medium text-red-500">{err}</p> : null}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-2 pb-safe">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className={`h-8 w-8 animate-spin ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
          </div>
        ) : filtered.length === 0 ? (
          <p className={`py-8 text-center text-sm ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
            {t('tenant.emptySearch', lang)}
          </p>
        ) : (
          filtered.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => onSelect(m)}
              className={`flex w-full items-center gap-3 rounded-2xl border p-4 text-left transition-all active:scale-[0.99] ${
                isDark
                  ? 'border-slate-700 bg-slate-800/60 hover:bg-slate-800'
                  : 'border-slate-200 bg-white hover:border-primary/30 hover:shadow-sm'
              }`}
            >
              {m.logoUrl ? (
                <img src={m.logoUrl} alt="" className="h-12 w-12 rounded-xl object-contain bg-white p-0.5" />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Building2 className="h-6 w-6" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className={`truncate font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  {m.displayName}
                </p>
                {m.slogan ? (
                  <p className={`mt-0.5 truncate text-xs ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
                    {m.slogan}
                  </p>
                ) : null}
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
