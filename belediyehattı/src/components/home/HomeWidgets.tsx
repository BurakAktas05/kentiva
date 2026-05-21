import { useCallback, useEffect, useState, type ReactNode } from 'react';
import {
  Cloud,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSnow,
  CloudSun,
  ExternalLink,
  Navigation,
  Pill,
  RefreshCw,
  Sun,
  Wind,
} from 'lucide-react';
import {
  fetchHomeWidgets,
  type HomeWidgetsBundle,
  type PublicTenant,
} from '../../api';
import { getDevicePosition, isDeviceLocationFailure, openMapsNavigation, type DeviceCoords } from '../../lib/deviceLocation';
import { Lang, t } from '../../i18n';

const OFFICIAL_PHARMACY_URL = 'https://www.turkiye.gov.tr/saglik-nobetci-eczane-arama';
const LOCATION_CACHE_TTL_MS = 5 * 60 * 1000;

type WidgetBaseProps = {
  tenant: PublicTenant;
  lang: Lang;
  isDark: boolean;
};

type WidgetLocationSource = 'device' | 'tenant' | 'none';

let cachedDeviceCoords: DeviceCoords | null = null;
let cachedDeviceCoordsAt = 0;
let deviceCoordsPromise: Promise<DeviceCoords | null> | null = null;

function weatherVisual(code: number | null | undefined, className: string): ReactNode {
  const c = code ?? -1;
  if (c === 0) return <Sun className={className} strokeWidth={1.5} />;
  if (c >= 1 && c <= 3) return <CloudSun className={className} strokeWidth={1.5} />;
  if (c === 45 || c === 48) return <CloudFog className={className} strokeWidth={1.5} />;
  if ((c >= 51 && c <= 67) || (c >= 80 && c <= 82)) return <CloudRain className={className} strokeWidth={1.5} />;
  if ((c >= 71 && c <= 77) || (c >= 85 && c <= 86)) return <CloudSnow className={className} strokeWidth={1.5} />;
  if (c >= 95) return <CloudLightning className={className} strokeWidth={1.5} />;
  return <Cloud className={className} strokeWidth={1.5} />;
}

function weatherCardTheme(code: number | null | undefined, isDark: boolean): string {
  if (isDark) return 'border-sky-800/60 bg-gradient-to-br from-sky-950 via-slate-900 to-slate-900';
  const c = code ?? -1;
  if (c === 0) return 'border-amber-200/80 bg-gradient-to-br from-amber-100 via-sky-50 to-sky-100';
  if (c >= 95) return 'border-violet-200/80 bg-gradient-to-br from-violet-100 via-slate-100 to-sky-100';
  if ((c >= 61 && c <= 82) || (c >= 51 && c <= 57)) return 'border-sky-300/80 bg-gradient-to-br from-sky-200/70 via-sky-50 to-blue-50';
  if (c >= 71 && c <= 86) return 'border-slate-200 bg-gradient-to-br from-slate-100 via-sky-50 to-white';
  return 'border-sky-200/80 bg-gradient-to-br from-sky-100 via-white to-sky-50';
}

function locationSourceLabel(source: WidgetLocationSource, lang: Lang): string {
  if (lang === 'ar') {
    if (source === 'device') return 'بحسب موقعك';
    if (source === 'tenant') return 'مركز البلدية';
    return 'الموقع غير متاح';
  }
  if (lang === 'en') {
    if (source === 'device') return 'Using your location';
    if (source === 'tenant') return 'Municipality center';
    return 'Location unavailable';
  }
  if (source === 'device') return 'Konumuna gore';
  if (source === 'tenant') return 'Belediye merkezi';
  return 'Konum yok';
}

async function loadDeviceCoords(forceRefresh: boolean): Promise<DeviceCoords | null> {
  const now = Date.now();
  if (!forceRefresh && cachedDeviceCoords && now - cachedDeviceCoordsAt < LOCATION_CACHE_TTL_MS) {
    return cachedDeviceCoords;
  }

  if (!deviceCoordsPromise) {
    deviceCoordsPromise = (async () => {
      const result = await getDevicePosition({ highAccuracy: false, timeoutMs: 7000 });
      if (isDeviceLocationFailure(result)) {
        return null;
      }
      cachedDeviceCoords = result.coords;
      cachedDeviceCoordsAt = Date.now();
      return result.coords;
    })().finally(() => {
      deviceCoordsPromise = null;
    });
  }

  return deviceCoordsPromise;
}

async function resolveWidgetCoords(
  centerLat: number | null | undefined,
  centerLng: number | null | undefined,
  forceRefresh: boolean,
): Promise<{ coords: DeviceCoords | null; source: WidgetLocationSource }> {
  const deviceCoords = await loadDeviceCoords(forceRefresh);
  if (deviceCoords) {
    return { coords: deviceCoords, source: 'device' };
  }
  if (centerLat != null && centerLng != null) {
    return { coords: { lat: centerLat, lng: centerLng }, source: 'tenant' };
  }
  return { coords: null, source: 'none' };
}

function WidgetHeader({
  icon,
  title,
  accent,
  isDark,
}: {
  icon: ReactNode;
  title: string;
  accent: 'sky' | 'emerald';
  isDark: boolean;
}) {
  const tones = {
    sky: isDark ? 'bg-sky-500/20 text-sky-300' : 'bg-sky-500/15 text-sky-700',
    emerald: isDark ? 'bg-emerald-500/20 text-emerald-300' : 'bg-emerald-500/15 text-emerald-700',
  };
  return (
    <div className="flex items-center gap-2.5">
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${tones[accent]}`}>
        {icon}
      </div>
      <h3 className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-slate-800'}`}>{title}</h3>
    </div>
  );
}

function useWidgetBundle(tenant: PublicTenant) {
  const [bundle, setBundle] = useState<HomeWidgetsBundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [locationSource, setLocationSource] = useState<WidgetLocationSource>('none');
  const { id, centerLat, centerLng } = tenant;

  const loadWidgets = useCallback(
    async (signal?: { cancelled: boolean }) => {
      if (!id) {
        setLoading(false);
        setLocationSource('none');
        return;
      }

      setLoading(true);
      try {
        const resolved = await resolveWidgetCoords(centerLat, centerLng, refreshKey > 0);
        if (signal?.cancelled) return;
        setLocationSource(resolved.source);

        if (!resolved.coords) {
          setBundle(null);
          return;
        }

        const next = await fetchHomeWidgets(id, resolved.coords.lat, resolved.coords.lng);
        if (!signal?.cancelled) {
          setBundle(next);
        }
      } catch {
        if (!signal?.cancelled) {
          setBundle(null);
        }
      } finally {
        if (!signal?.cancelled) {
          setLoading(false);
        }
      }
    },
    [centerLat, centerLng, id, refreshKey],
  );

  useEffect(() => {
    const signal = { cancelled: false };
    void loadWidgets(signal);
    return () => {
      signal.cancelled = true;
    };
  }, [loadWidgets]);

  return { bundle, loading, locationSource, refresh: () => setRefreshKey((k) => k + 1) };
}

export function WeatherWidgetCard({ tenant, lang, isDark }: WidgetBaseProps) {
  const { bundle, loading, locationSource, refresh } = useWidgetBundle(tenant);
  const weather = bundle?.weather;
  const hasData = weather?.available && weather.temperatureC != null;
  const theme = weatherCardTheme(weather?.weatherCode, isDark);

  return (
    <section className={`overflow-hidden rounded-2xl border shadow-sm ${theme}`}>
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <WidgetHeader
              icon={<Cloud className="h-4 w-4" />}
              title={t('home.widgets.weather', lang)}
              accent="sky"
              isDark={isDark}
            />
            <p className={`mt-2 text-[11px] font-medium ${isDark ? 'text-sky-200/80' : 'text-slate-600'}`}>
              {locationSourceLabel(locationSource, lang)}
              {weather?.dataSource ? ` · ${weather.dataSource}` : ''}
            </p>
          </div>
          <button
            type="button"
            onClick={refresh}
            disabled={loading}
            aria-label={t('home.widgets.refresh', lang)}
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition active:scale-95 disabled:opacity-50 ${
              isDark ? 'bg-slate-800 text-slate-300' : 'bg-white/70 text-sky-700 shadow-sm'
            }`}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {loading ? (
          <div className="mt-4 h-24 animate-pulse rounded-xl bg-white/40 dark:bg-slate-700/50" />
        ) : hasData ? (
          <div className="mt-3 flex items-center gap-4">
            <div
              className={`flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl ${
                isDark ? 'bg-sky-500/15 text-sky-200' : 'bg-white/60 text-sky-600 shadow-inner'
              }`}
              aria-hidden
            >
              {weatherVisual(weather.weatherCode, 'h-12 w-12')}
            </div>
            <div className="min-w-0 flex-1">
              <p className={`text-4xl font-bold tabular-nums leading-none ${isDark ? 'text-white' : 'text-slate-900'}`}>
                {Math.round(weather.temperatureC!)}°
              </p>
              <p className={`mt-1 text-sm font-medium ${isDark ? 'text-sky-100/90' : 'text-slate-700'}`}>
                {weather.description}
              </p>
              <div className={`mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                {weather.apparentTemperatureC != null && (
                  <span>
                    {t('home.widgets.feelsLike', lang)}{' '}
                    <strong className={isDark ? 'text-slate-200' : 'text-slate-800'}>
                      {Math.round(weather.apparentTemperatureC)}°
                    </strong>
                  </span>
                )}
                {weather.windSpeedKmh != null && (
                  <span className="inline-flex items-center gap-1">
                    <Wind className="h-3 w-3" />
                    {Math.round(weather.windSpeedKmh)} km/h
                  </span>
                )}
              </div>
            </div>
          </div>
        ) : (
          <p className={`mt-4 text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            {t('home.widgets.weatherUnavailable', lang)}
          </p>
        )}
      </div>
    </section>
  );
}

export function PharmacyWidgetCard({ tenant, lang, isDark }: WidgetBaseProps) {
  const { bundle, loading, locationSource, refresh } = useWidgetBundle(tenant);
  const pharmacies = bundle?.pharmacies ?? [];
  const hasOnDuty = pharmacies.some((p) => p.onDuty);

  const pharmacyTitle =
    pharmacies.length === 0
      ? t('home.widgets.pharmacy', lang)
      : hasOnDuty
        ? t('home.widgets.pharmacy', lang)
        : t('home.widgets.pharmacyNearby', lang);

  const pharmacySurface = isDark
    ? 'border-emerald-800/50 bg-gradient-to-br from-emerald-950/30 to-slate-900/80'
    : 'border-emerald-200/90 bg-gradient-to-br from-emerald-50/90 via-white to-teal-50/30';

  return (
    <section className={`rounded-2xl border shadow-sm ${pharmacySurface}`}>
      <div className="p-4">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="flex min-w-0 items-center gap-3">
              <div
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${
                  isDark ? 'bg-emerald-500/20 text-emerald-300' : 'bg-emerald-500/15 text-emerald-600'
                }`}
                aria-hidden
              >
                <Pill className="h-6 w-6" strokeWidth={1.5} />
              </div>
              <h3 className={`truncate text-sm font-semibold ${isDark ? 'text-white' : 'text-slate-800'}`}>
                {pharmacyTitle}
              </h3>
            </div>
            <p className={`mt-2 text-[11px] font-medium ${isDark ? 'text-emerald-100/75' : 'text-slate-600'}`}>
              {locationSourceLabel(locationSource, lang)}
              {bundle?.pharmacyDataSource ? ` · ${bundle.pharmacyDataSource}` : ''}
            </p>
          </div>
          <button
            type="button"
            onClick={refresh}
            disabled={loading}
            aria-label={t('home.widgets.refresh', lang)}
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
              isDark ? 'text-slate-400' : 'text-slate-500'
            }`}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
        <div className="mt-3">
          {loading ? (
            <div className="space-y-2">
              {[1, 2].map((i) => (
                <div key={i} className="h-12 animate-pulse rounded-xl bg-emerald-100/50 dark:bg-slate-700/40" />
              ))}
            </div>
          ) : pharmacies.length === 0 ? (
            <div>
              <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                {t('home.widgets.pharmacyEmpty', lang)}
              </p>
              <a
                href={OFFICIAL_PHARMACY_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-primary"
              >
                {t('home.widgets.pharmacyEdevlet', lang)}
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          ) : (
            <ul className="divide-y divide-emerald-100/80 dark:divide-emerald-900/40">
              {pharmacies.slice(0, 3).map((p, i) => (
                <li key={i} className="py-2.5 first:pt-0 last:pb-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>{p.name}</p>
                      {p.address && (
                        <p className={`mt-0.5 line-clamp-2 text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                          {p.address}
                        </p>
                      )}
                    </div>
                    {p.distanceMeters != null && (
                      <span className="shrink-0 rounded-lg bg-emerald-500/15 px-2 py-1 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300">
                        {p.distanceMeters < 1000
                          ? `${Math.round(p.distanceMeters)} m`
                          : `${(p.distanceMeters / 1000).toFixed(1)} km`}
                      </span>
                    )}
                  </div>
                  <div className="mt-1.5 flex flex-wrap gap-3">
                    {p.phone && (
                      <a
                        href={`tel:${p.phone.replace(/\s/g, '')}`}
                        className="text-xs font-semibold text-emerald-700 dark:text-emerald-300"
                      >
                        {p.phone}
                      </a>
                    )}
                    {p.lat != null && p.lng != null && (
                      <button
                        type="button"
                        onClick={() => openMapsNavigation(p.lat!, p.lng!, p.name)}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-primary"
                      >
                        <Navigation className="h-3.5 w-3.5" />
                        {t('home.widgets.directions', lang)}
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
          {!loading && !hasOnDuty && pharmacies.length > 0 && (
            <a
              href={OFFICIAL_PHARMACY_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-primary"
            >
              {t('home.widgets.pharmacyVerify', lang)}
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
      </div>
    </section>
  );
}

/** @deprecated Use PharmacyWidgetCard on Kent tab only */
export default function HomeWidgets(props: WidgetBaseProps) {
  return <PharmacyWidgetCard {...props} />;
}
