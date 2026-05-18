import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import {
  AlertTriangle,
  Calendar,
  Cloud,
  Droplets,
  ExternalLink,
  MapPin,
  Pill,
  Plus,
  Wind,
  Zap,
} from 'lucide-react';
import {
  fetchHomeWidgets,
  type HomeWidgetsBundle,
  type PublicTenant,
} from '../../api';
import { Lang } from '../../i18n';

type Props = {
  tenant: PublicTenant;
  userLat: number | null;
  userLng: number | null;
  lang: Lang;
  isDark: boolean;
  onReport: () => void;
};

const OFFICIAL_PHARMACY_URL = 'https://www.turkiye.gov.tr/saglik-nobetci-eczane-arama';

export default function HomeWidgets({ tenant, userLat, userLng, lang, isDark, onReport }: Props) {
  const [bundle, setBundle] = useState<HomeWidgetsBundle | null>(null);
  const [loading, setLoading] = useState(true);

  const card = isDark
    ? 'border-slate-700 bg-slate-800/95'
    : 'border-slate-200/90 bg-white';

  useEffect(() => {
    if (!tenant.id) {
      setLoading(false);
      return;
    }
    // GPS izni verilmemiş / başarısız ise belediye merkez koordinatına geri düşeriz —
    // bu sayede hava durumu kartı her durumda görünür.
    const lat = userLat ?? tenant.centerLat;
    const lng = userLng ?? tenant.centerLng;
    if (lat == null || lng == null) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetchHomeWidgets(tenant.id, lat, lng)
      .then((b) => {
        if (!cancelled) setBundle(b);
      })
      .catch(() => {
        if (!cancelled) setBundle(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tenant.id, tenant.centerLat, tenant.centerLng, userLat, userLng]);

  const outages = bundle?.outages ?? [];
  const weather = bundle?.weather;
  const pharmacies = bundle?.pharmacies ?? [];
  const events = bundle?.events ?? [];
  const pharmacyConfigured = bundle?.pharmacyApiConfigured ?? false;

  return (
    <div className="space-y-3">
      {outages.length > 0 && (
        <div className="space-y-2 px-4">
          {outages.slice(0, 2).map((o) => (
            <div
              key={o.id}
              className="flex gap-3 rounded-xl border border-amber-300/80 bg-amber-50 px-3 py-2.5 dark:border-amber-700/50 dark:bg-amber-950/40"
            >
              {o.outageType === 'WATER' ? (
                <Droplets className="h-5 w-5 shrink-0 text-amber-700 dark:text-amber-300" />
              ) : (
                <Zap className="h-5 w-5 shrink-0 text-amber-700 dark:text-amber-300" />
              )}
              <div className="min-w-0">
                <p className="text-xs font-bold text-amber-900 dark:text-amber-100">{o.title}</p>
                {o.message && (
                  <p className="mt-0.5 text-[11px] text-amber-800/90 dark:text-amber-200/90">{o.message}</p>
                )}
                {o.district && (
                  <p className="mt-0.5 text-[10px] font-medium text-amber-700/80 dark:text-amber-300/80">
                    {o.district}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between px-4">
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-primary">
          {tenant.displayName}
        </p>
        <button
          type="button"
          onClick={onReport}
          className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-xs font-bold text-white shadow-sm active:scale-[0.98]"
        >
          <Plus className="h-4 w-4" />
          {lang === 'tr' ? 'İhbar Yap' : 'New report'}
        </button>
      </div>

      <div className="-mx-0 flex gap-3 overflow-x-auto px-4 pb-1 snap-x snap-mandatory scrollbar-hide">
        {/* Hava kartı her zaman gösterilir: GPS yoksa belediye merkezi kullanılır,
            servis cevap vermezse "alınamadı" mesajı görünür. */}
        <motion.article
            className={`min-w-[200px] max-w-[200px] shrink-0 snap-start rounded-2xl border p-4 shadow-sm ${card}`}
          >
            <motion.div className="mb-2 flex items-center gap-2 text-sky-600 dark:text-sky-400">
              <Cloud className="h-4 w-4" />
              <span className="text-[10px] font-bold uppercase tracking-wide">
                {lang === 'tr' ? 'Hava' : 'Weather'}
              </span>
            </motion.div>
            {loading ? (
              <p className="text-xs text-slate-500">{lang === 'tr' ? 'Yükleniyor…' : 'Loading…'}</p>
            ) : weather?.available && weather.temperatureC != null ? (
              <>
                <p className="text-2xl font-extrabold tabular-nums text-slate-900 dark:text-white">
                  {Math.round(weather.temperatureC)}°
                </p>
                <p className="text-xs text-slate-500">{weather.description}</p>
                {weather.apparentTemperatureC != null && (
                  <p className="mt-0.5 text-[10px] text-slate-500">
                    {lang === 'tr' ? 'Hissedilen' : 'Feels'}{' '}
                    <span className="font-semibold text-slate-700 dark:text-slate-200 tabular-nums">
                      {Math.round(weather.apparentTemperatureC)}°
                    </span>
                  </p>
                )}
                {(weather.dailyMaxC != null || weather.dailyMinC != null) && (
                  <p className="text-[10px] text-slate-500 tabular-nums">
                    {weather.dailyMinC != null && `↓ ${Math.round(weather.dailyMinC)}°`}
                    {weather.dailyMaxC != null && weather.dailyMinC != null && ' · '}
                    {weather.dailyMaxC != null && `↑ ${Math.round(weather.dailyMaxC)}°`}
                  </p>
                )}
                {weather.windSpeedKmh != null && (
                  <p className="mt-1 flex items-center gap-1 text-[10px] text-slate-500">
                    <Wind className="h-3 w-3" />
                    {Math.round(weather.windSpeedKmh)} km/h
                  </p>
                )}
                {weather.usAqi != null && (
                  <p className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-violet-700 dark:text-violet-300">
                    AQI {weather.usAqi} · {weather.aqiLabel}
                  </p>
                )}
                {weather.dataSource && (
                  <p className="mt-2 text-[9px] text-slate-400 leading-tight">{weather.dataSource}</p>
                )}
              </>
            ) : (
              <p className="text-xs text-slate-500">
                {lang === 'tr' ? 'Hava verisi şu an alınamadı.' : 'Weather unavailable.'}
              </p>
            )}
          </motion.article>

        {/* Eczane kartı her zaman görünür. Sadece NÖBETÇİ eczane listelenir:
            önce EczaneAPI (varsa), olmazsa eczaneler.gen.tr (Eczacı Odası listesi, ücretsiz),
            ikisi de boşsa e-Devlet doğrulama linki gösterilir. */}
        {(() => {
          const hasOnDuty = pharmacies.some((p) => p.onDuty);
          const cardTitle =
            pharmacies.length === 0
              ? lang === 'tr' ? 'Nöbetçi eczane' : 'On-duty pharmacy'
              : hasOnDuty
                ? lang === 'tr' ? 'Nöbetçi eczane' : 'On-duty pharmacy'
                : lang === 'tr' ? 'Yakın eczaneler' : 'Nearby pharmacies';
          return (
            <motion.article
              className={`min-w-[220px] max-w-[240px] shrink-0 snap-start rounded-2xl border p-4 shadow-sm ${card}`}
            >
              <motion.div className="mb-2 flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                <Pill className="h-4 w-4" />
                <span className="text-[10px] font-bold uppercase tracking-wide">{cardTitle}</span>
              </motion.div>
              {loading ? (
                <p className="text-xs text-slate-500">{lang === 'tr' ? 'Yükleniyor…' : 'Loading…'}</p>
              ) : pharmacies.length === 0 ? (
                <>
                  <p className="text-xs text-slate-500">
                    {lang === 'tr'
                      ? 'Yakında eczane bulunamadı.'
                      : 'No pharmacy found nearby.'}
                  </p>
                  <a
                    href={OFFICIAL_PHARMACY_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold text-primary"
                  >
                    {lang === 'tr' ? 'e-Devlet nöbetçi arama' : 'Official lookup'}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </>
              ) : (
                <>
                  <ul className="space-y-2">
                    {pharmacies.slice(0, 3).map((p, i) => (
                      <li key={i} className="text-xs">
                        <p className="font-bold text-slate-800 dark:text-slate-100 truncate">{p.name}</p>
                        {p.address && <p className="text-[10px] text-slate-500 truncate">{p.address}</p>}
                        {p.distanceMeters != null && (
                          <p className="text-[10px] text-primary font-semibold">
                            {p.distanceMeters < 1000
                              ? `~${Math.round(p.distanceMeters)} m`
                              : `~${(p.distanceMeters / 1000).toFixed(1)} km`}
                          </p>
                        )}
                        {p.phone && (
                          <a
                            href={`tel:${p.phone.replace(/\s/g, '')}`}
                            className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-300"
                          >
                            {p.phone}
                          </a>
                        )}
                      </li>
                    ))}
                  </ul>
                  {!hasOnDuty && (
                    <a
                      href={OFFICIAL_PHARMACY_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-flex items-center gap-1 text-[10px] font-bold text-primary"
                    >
                      {lang === 'tr' ? 'Nöbet için e-Devlet' : 'Verify on e-Devlet'}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </>
              )}
              {bundle?.pharmacyDataSource && (
                <p className="mt-2 text-[9px] text-slate-400 leading-tight">{bundle.pharmacyDataSource}</p>
              )}
            </motion.article>
          );
        })()}

        <motion.article
          className={`min-w-[240px] max-w-[240px] shrink-0 snap-start rounded-2xl border p-4 shadow-sm ${card}`}
        >
          <motion.div className="mb-2 flex items-center gap-2 text-violet-600 dark:text-violet-400">
            <Calendar className="h-4 w-4" />
            <span className="text-[10px] font-bold uppercase tracking-wide">
              {lang === 'tr' ? 'Kent takvimi' : 'Events'}
            </span>
          </motion.div>
          {events.length === 0 ? (
            <p className="text-xs text-slate-500">
              {lang === 'tr'
                ? 'Belediyenizin yayınladığı etkinlik yok.'
                : 'No events published by your municipality.'}
            </p>
          ) : (
            <ul className="space-y-2">
              {events.slice(0, 2).map((ev) => (
                <li key={ev.id} className="rounded-lg bg-slate-50 p-2 dark:bg-slate-900/60">
                  <p className="text-xs font-bold text-slate-800 dark:text-white">{ev.title}</p>
                  <p className="text-[10px] text-slate-500">
                    {new Date(ev.startsAt).toLocaleDateString(lang === 'tr' ? 'tr-TR' : 'en-US', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                  {ev.venue && <p className="text-[10px] text-slate-400 truncate">{ev.venue}</p>}
                  <button
                    type="button"
                    onClick={() => {
                      const start = new Date(ev.startsAt);
                      const end = ev.endsAt
                        ? new Date(ev.endsAt)
                        : new Date(start.getTime() + 2 * 60 * 60 * 1000);
                      const ics = [
                        'BEGIN:VCALENDAR',
                        'VERSION:2.0',
                        'BEGIN:VEVENT',
                        `DTSTART:${start.toISOString().replace(/[-:]/g, '').split('.')[0]}Z`,
                        `DTEND:${end.toISOString().replace(/[-:]/g, '').split('.')[0]}Z`,
                        `SUMMARY:${ev.title}`,
                        `LOCATION:${ev.venue ?? ''}`,
                        'END:VEVENT',
                        'END:VCALENDAR',
                      ].join('\n');
                      const blob = new Blob([ics], { type: 'text/calendar' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = 'kentiva-etkinlik.ics';
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                    className="mt-1 text-[10px] font-bold text-primary"
                  >
                    {lang === 'tr' ? 'Takvime ekle' : 'Add to calendar'}
                  </button>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-2 text-[9px] text-slate-400">
            {lang === 'tr' ? 'Resmi belediye duyurusu' : 'Official municipality listing'}
          </p>
        </motion.article>

        {userLat != null && userLng != null && (
          <motion.article
            className={`min-w-[160px] shrink-0 snap-start rounded-2xl border p-4 shadow-sm ${card}`}
          >
            <MapPin className="h-4 w-4 text-primary mb-2" />
            <p className="text-[10px] font-bold uppercase text-slate-500">
              {lang === 'tr' ? 'Konumunuz' : 'Your location'}
            </p>
            <p className="mt-1 font-mono text-xs text-slate-700 dark:text-slate-300">
              {userLat.toFixed(4)}, {userLng.toFixed(4)}
            </p>
            <p className="mt-2 text-[10px] text-slate-400">
              {lang === 'tr' ? 'İhbar GPS ile yönlendirilir.' : 'Reports route via GPS.'}
            </p>
          </motion.article>
        )}
      </div>

      {!loading && outages.length === 0 && events.length === 0 && (
        <p className="px-4 text-center text-[11px] text-slate-400 flex items-center justify-center gap-1">
          <AlertTriangle className="h-3.5 w-3.5" />
          {lang === 'tr'
            ? 'Kesinti ve etkinlikler yalnızca belediye yönetiminden yayınlandığında görünür.'
            : 'Outages and events appear only when published by your municipality.'}
        </p>
      )}
    </div>
  );
}
