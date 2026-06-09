import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, CalendarDays, Droplets, Zap, MapPin, Clock, Info } from 'lucide-react';
import { fetchHomeWidgets, type OutageWidget, type EventWidget, type PublicTenant } from '../../api';
import { Lang, t } from '../../i18n';

interface CityCalendarProps {
  municipality: PublicTenant | null;
  lang: Lang;
  isDark: boolean;
  onBack?: () => void;
  embedded?: boolean;
}

export default function CityCalendar({ municipality, lang, isDark, onBack, embedded }: CityCalendarProps) {
  const [outages, setOutages] = useState<OutageWidget[]>([]);
  const [events, setEvents] = useState<EventWidget[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<'all' | 'outage' | 'event'>('all');

  useEffect(() => {
    if (!municipality?.id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    fetchHomeWidgets(municipality.id, municipality.centerLat ?? 41.0082, municipality.centerLng ?? 28.9784)
      .then((res) => {
        setOutages(res.outages ?? []);
        setEvents(res.events ?? []);
      })
      .catch(() => {
        // Fallback
      })
      .finally(() => {
        setLoading(false);
      });
  }, [municipality]);

  const filteredItems = [
    ...outages.map((o) => ({ ...o, type: 'outage' as const, date: o.startsAt ? new Date(o.startsAt) : new Date() })),
    ...events.map((e) => ({ ...e, type: 'event' as const, date: new Date(e.startsAt) })),
  ].sort((a, b) => b.date.getTime() - a.date.getTime());

  const displayedItems = filteredItems.filter((item) => {
    if (activeFilter === 'all') return true;
    return item.type === activeFilter;
  });

  return (
    <motion.div
      initial={{ opacity: 0, x: embedded ? 0 : 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="pb-6"
    >
      {!embedded && onBack && (
        <div className="flex items-center gap-3 border-b border-slate-200 p-4 dark:border-slate-800">
          <button type="button" onClick={onBack} className="-ml-2 p-2 text-slate-500 dark:text-slate-400">
            <ChevronLeft className="h-6 w-6" />
          </button>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">{t('home.widgets.calendar', lang)}</h2>
            <p className="text-[11px] font-medium text-slate-500">{municipality?.displayName}</p>
          </div>
        </div>
      )}

      {embedded && (
        <div className="px-4 pt-4 pb-1">
          <h3 className="text-sm font-semibold text-slate-800 dark:text-white">
            {t('kent.calendar.section', lang)}
          </h3>
        </div>
      )}

      <div className={`flex gap-2 p-4 ${embedded ? 'pt-2' : ''}`}>
        <button
          onClick={() => setActiveFilter('all')}
          className={`rounded-xl px-4 py-2 text-xs font-bold transition-all ${
            activeFilter === 'all'
              ? 'bg-primary text-white shadow-lg shadow-primary/20'
              : isDark
              ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          {t('kent.calendar.filter.all', lang)}
        </button>
        <button
          onClick={() => setActiveFilter('outage')}
          className={`rounded-xl px-4 py-2 text-xs font-semibold transition-all ${
            activeFilter === 'outage'
              ? 'bg-amber-600 text-white shadow-md shadow-amber-600/20'
              : isDark
              ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          {t('kent.calendar.filter.outage', lang)}
        </button>
        <button
          onClick={() => setActiveFilter('event')}
          className={`rounded-xl px-4 py-2 text-xs font-semibold transition-all ${
            activeFilter === 'event'
              ? 'bg-violet-600 text-white shadow-md shadow-violet-600/20'
              : isDark
              ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          {t('kent.calendar.filter.event', lang)}
        </button>
      </div>

      {/* List Container */}
      <div className="px-4 space-y-4">
        {loading ? (
          <div className="space-y-4 pt-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-28 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800/50"
              />
            ))}
          </div>
        ) : !municipality?.id ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Info className="h-12 w-12 text-slate-400 mb-2" />
            <p className="text-sm font-medium text-slate-500">{t('report.needTenant', lang)}</p>
          </div>
        ) : displayedItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <CalendarDays className="h-14 w-14 text-slate-300 dark:text-slate-700 mb-3" />
            <p className="text-sm font-medium text-slate-500">{t('kent.calendar.empty', lang)}</p>
          </div>
        ) : (
          <div className="relative border-l border-slate-200 dark:border-slate-800 pl-4 ml-2 space-y-6">
            {displayedItems.map((item, index) => {
              const isOutage = item.type === 'outage';
              const dateStr = item.date.toLocaleDateString(
                lang === 'tr' ? 'tr-TR' : lang === 'ar' ? 'ar' : 'en-US',
                {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                  hour: '2-digit',
                  minute: '2-digit',
                }
              );

              return (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  key={item.id}
                  className="relative"
                >
                  {/* Timeline point */}
                  <span
                    className={`absolute -left-[25px] top-1.5 h-4 w-4 rounded-full border-4 flex items-center justify-center ${
                      isOutage
                        ? 'bg-amber-500 border-white dark:border-slate-900 ring-2 ring-amber-500/20'
                        : 'bg-violet-600 border-white dark:border-slate-900 ring-2 ring-violet-600/20'
                    }`}
                  />

                  {/* Card Content */}
                  <div
                    className={`rounded-2xl border p-4 shadow-sm backdrop-blur-md transition-all ${
                      isOutage
                        ? isDark
                          ? 'border-amber-950 bg-amber-950/10'
                          : 'border-amber-100 bg-amber-50/50'
                        : isDark
                        ? 'border-violet-950 bg-violet-950/10'
                        : 'border-violet-100 bg-violet-50/50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                          isOutage
                            ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400'
                            : 'bg-violet-600/15 text-violet-700 dark:text-violet-400'
                        }`}
                      >
                        {isOutage ? (
                          <>
                            {item.outageType === 'WATER' ? (
                              <Droplets className="h-3 w-3" />
                            ) : (
                              <Zap className="h-3 w-3" />
                            )}
                            {item.outageType === 'WATER'
                              ? t('kent.outage.water', lang)
                              : t('kent.outage.power', lang)}
                          </>
                        ) : (
                          <>
                            <CalendarDays className="h-3 w-3" />
                            {t('kent.event.label', lang)}
                          </>
                        )}
                      </span>
                    </div>

                    <h3 className="mt-2 text-sm font-extrabold text-slate-800 dark:text-white leading-tight">
                      {item.title}
                    </h3>

                    {item.type === 'outage' && item.message && (
                      <p className="mt-2 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                        {item.message}
                      </p>
                    )}

                    {item.type === 'event' && item.description && (
                      <p className="mt-2 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                        {item.description}
                      </p>
                    )}

                    <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 border-t border-slate-200/50 dark:border-slate-800/50 pt-3 text-[11px] text-slate-500">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5 text-primary" />
                        <span>{dateStr}</span>
                      </div>

                      {isOutage && item.endsAt && (
                        <div className="flex items-center gap-1">
                          <span className="font-semibold">{t('kent.event.end', lang)}</span>
                          <span>
                            {new Date(item.endsAt).toLocaleDateString(
                              lang === 'tr' ? 'tr-TR' : lang === 'ar' ? 'ar' : 'en-US',
                              { hour: '2-digit', minute: '2-digit' }
                            )}
                          </span>
                        </div>
                      )}

                      {!isOutage && item.venue && (
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5 text-secondary" />
                          <span>{item.venue}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </motion.div>
  );
}
