import { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { Building2, ChevronLeft, MapPin, Loader2, Sparkles, Search, Check } from 'lucide-react';
import { fetchPublicMunicipalities, resolveMunicipalityByGps, type PublicTenant } from '../../api';
import { getDevicePosition, isDeviceLocationFailure } from '../../lib/deviceLocation';
import { groupByProvince, sortedProvinces } from '../../lib/municipalityRegions';
import { Lang, t } from '../../i18n';
import { kentivaCard, primaryBtnClass, screenHeadingClass, screenSubtitleClass } from '../../lib/ui';

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
  const [province, setProvince] = useState('');
  const [districtId, setDistrictId] = useState('');
  const [districtSearch, setDistrictSearch] = useState('');

  const isOnboarding = mode === 'onboarding';

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const rows = await fetchPublicMunicipalities();
        if (!cancelled) setList(rows.filter((m) => m.onboarded));
      } catch {
        if (!cancelled) setErr(t('tenant.loadError', lang));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [lang]);

  const byProvince = useMemo(() => groupByProvince(list), [list]);
  const provinces = useMemo(() => sortedProvinces(byProvince), [byProvince]);

  const districtsInProvince = useMemo(() => {
    if (!province) return [];
    return byProvince.get(province) ?? [];
  }, [byProvince, province]);

  const filteredDistricts = useMemo(() => {
    const q = districtSearch.trim().toLowerCase();
    if (!q) return districtsInProvince;
    return districtsInProvince.filter((d) => d.displayName.toLowerCase().includes(q));
  }, [districtsInProvince, districtSearch]);

  const selectedDistrict = useMemo(
    () => list.find((m) => m.id === districtId) ?? null,
    [list, districtId],
  );

  useEffect(() => {
    if (province && !provinces.includes(province)) {
      setProvince('');
      setDistrictId('');
      setDistrictSearch('');
    }
  }, [province, provinces]);

  const useGps = async () => {
    setErr('');
    setGpsBusy(true);
    const result = await getDevicePosition({ highAccuracy: true, timeoutMs: 15000 });
    if (result.ok) {
      try {
        const resolved = await resolveMunicipalityByGps(result.coords.lat, result.coords.lng);
        if (resolved) {
          onSelect(resolved);
        } else {
          setErr(t('tenant.gpsNoMatch', lang));
        }
      } catch {
        setErr(t('tenant.gpsResolveError', lang));
      } finally {
        setGpsBusy(false);
      }
    } else if (isDeviceLocationFailure(result)) {
      setGpsBusy(false);
      if (result.reason === 'denied') setErr(t('report.location.denied', lang));
      else if (result.reason === 'unsupported') setErr(t('report.location.needGps', lang));
      else setErr(t('tenant.gpsFailed', lang));
    } else {
      setGpsBusy(false);
    }
  };

  const confirmManual = () => {
    if (!selectedDistrict) {
      setErr(t('tenant.pickDistrict', lang));
      return;
    }
    setErr('');
    onSelect(selectedDistrict);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={`flex min-h-app flex-col ${isDark ? 'bg-slate-950 text-white' : 'bg-slate-50 text-slate-900'}`}
    >
      <div className={`shrink-0 border-b px-4 pb-4 pt-safe ${isDark ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-white'}`}>
        {!isOnboarding && onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            className="mb-3 flex min-h-11 items-center gap-1 text-sm font-medium text-slate-500"
          >
            <ChevronLeft className="h-5 w-5" />
            {t('settings.back', lang)}
          </button>
        ) : null}

        {isOnboarding ? (
          <div className="mb-3 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-white">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-primary">
                {t('tenant.onboardingStep', lang)}
              </p>
              <h1 className={screenHeadingClass(isDark)}>{t('tenant.onboardingTitle', lang)}</h1>
            </div>
          </div>
        ) : (
          <h1 className={screenHeadingClass(isDark)}>{t('tenant.title', lang)}</h1>
        )}

        <p className={`mt-1.5 ${screenSubtitleClass()}`}>
          {isOnboarding ? t('tenant.onboardingSubtitle', lang) : t('tenant.subtitle', lang)}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 pb-28">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
          </div>
        ) : list.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-500">{t('tenant.emptyMembers', lang)}</p>
        ) : (
          <div className="space-y-5">
            <section>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                {t('tenant.sectionGps', lang)}
              </p>
              <button type="button" onClick={() => void useGps()} disabled={gpsBusy} className={primaryBtnClass(gpsBusy)}>
                {gpsBusy ? <Loader2 className="h-5 w-5 animate-spin" /> : <MapPin className="h-5 w-5" />}
                {t('tenant.gps', lang)}
              </button>
            </section>

            <div className="flex items-center gap-3">
              <div className={`h-px flex-1 ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`} />
              <span className="text-xs font-medium text-slate-400">{t('tenant.orManual', lang)}</span>
              <div className={`h-px flex-1 ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`} />
            </div>

            <section>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                {t('tenant.province', lang)}
              </p>
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                {provinces.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => {
                      setProvince(p);
                      setDistrictId('');
                      setDistrictSearch('');
                      setErr('');
                    }}
                    className={`shrink-0 rounded-full px-4 py-2 text-xs font-semibold transition-colors ${
                      province === p
                        ? 'bg-primary text-white'
                        : isDark
                          ? 'bg-slate-800 text-slate-300'
                          : 'bg-white border border-slate-200 text-slate-600'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </section>

            {province ? (
              <section>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {t('tenant.district', lang)}
                </p>
                <div className="relative mb-3">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="search"
                    value={districtSearch}
                    onChange={(e) => setDistrictSearch(e.target.value)}
                    placeholder={t('tenant.searchDistrict', lang)}
                    className={`w-full rounded-xl border py-3 pl-9 pr-3 text-sm ${
                      isDark
                        ? 'border-slate-700 bg-slate-900 text-white placeholder:text-slate-500'
                        : 'border-slate-200 bg-white text-slate-900 placeholder:text-slate-400'
                    }`}
                  />
                </div>
                <ul className="space-y-2 max-h-[min(50vh,360px)] overflow-y-auto">
                  {filteredDistricts.map((d) => {
                    const selected = districtId === d.id;
                    return (
                      <li key={d.id}>
                        <button
                          type="button"
                          onClick={() => {
                            setDistrictId(d.id);
                            setErr('');
                          }}
                          className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition active:scale-[0.99] ${
                            selected
                              ? 'border-primary bg-primary/5 dark:bg-primary/10'
                              : isDark
                                ? 'border-slate-800 bg-slate-900'
                                : 'border-slate-200 bg-white'
                          }`}
                        >
                          {d.logoUrl ? (
                            <img src={d.logoUrl} alt="" className="h-10 w-10 rounded-lg object-contain bg-white p-0.5" />
                          ) : (
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                              <Building2 className="h-5 w-5" />
                            </div>
                          )}
                          <span className="min-w-0 flex-1 truncate text-sm font-semibold">{d.displayName}</span>
                          {selected ? <Check className="h-5 w-5 shrink-0 text-primary" /> : null}
                        </button>
                      </li>
                    );
                  })}
                </ul>
                {filteredDistricts.length === 0 ? (
                  <p className="py-4 text-center text-xs text-slate-500">{t('tenant.noDistrictMatch', lang)}</p>
                ) : null}
              </section>
            ) : (
              <p className="text-center text-xs text-slate-500">{t('tenant.selectProvinceFirst', lang)}</p>
            )}

            {selectedDistrict ? (
              <div className={kentivaCard(isDark)}>
                <p className="text-xs text-slate-500">{t('tenant.selected', lang)}</p>
                <p className="mt-1 text-sm font-semibold">{selectedDistrict.displayName}</p>
              </div>
            ) : null}
          </div>
        )}
        {err ? <p className="mt-4 text-sm font-medium text-red-500">{err}</p> : null}
      </div>

      <div
        className={`fixed bottom-0 left-0 right-0 z-20 border-t px-4 py-3 pb-safe mx-auto max-w-md ${
          isDark ? 'border-slate-800 bg-slate-900/95' : 'border-slate-200 bg-white/95'
        } backdrop-blur-md`}
      >
        <button type="button" onClick={confirmManual} disabled={!districtId} className={primaryBtnClass(!districtId)}>
          {t('tenant.confirm', lang)}
        </button>
      </div>
    </motion.div>
  );
}
