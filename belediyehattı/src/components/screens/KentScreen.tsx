import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Bus, ChevronRight } from 'lucide-react';
import { fetchPublicStatsOverview, type PublicDepartment, type PublicStatsOverview, type PublicTenant } from '../../api';
import { Lang, t } from '../../i18n';
import { screenHeadingClass, screenSubtitleClass } from '../../lib/ui';
import { PharmacyWidgetCard } from '../home/HomeWidgets';
import CityCalendar from './CityCalendar';

interface KentScreenProps {
  municipality: PublicTenant | null;
  department?: PublicDepartment | null;
  lang: Lang;
  isDark: boolean;
  onSelectMunicipality?: () => void;
  onOpenBusSchedules?: () => void;
}

export default function KentScreen({ municipality, department, lang, isDark, onSelectMunicipality, onOpenBusSchedules }: KentScreenProps) {
  const [publicOverview, setPublicOverview] = useState<PublicStatsOverview | null>(null);
  const cardStyle = isDark ? 'border-slate-800 bg-slate-900' : 'border-slate-200/80 bg-white';

  useEffect(() => {
    fetchPublicStatsOverview()
      .then(setPublicOverview)
      .catch(() => setPublicOverview(null));
  }, []);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="pb-6">
      <div className="px-5 pt-4 pb-2">
        <h2 className={screenHeadingClass(isDark)}>{t('tab.kent', lang)}</h2>
        <p className={`mt-0.5 ${screenSubtitleClass()}`}>{t('kent.subtitle', lang)}</p>
        {municipality && (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <p className="flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-300">
              <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />
              {municipality.displayName}
            </p>
            {department && (
              <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-semibold text-primary dark:bg-primary/15 dark:text-sky-300">
                {department.name}
              </span>
            )}
          </div>
        )}
      </div>

      {!municipality?.id ? (
        <div className="px-4">
          <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5 dark:border-primary/30 dark:bg-primary/10">
            <p className="text-sm font-semibold text-slate-900 dark:text-white">
              {t('home.municipalityBanner.title', lang)}
            </p>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
              {t('home.municipalityBanner.desc', lang)}
            </p>
            {onSelectMunicipality && (
              <button
                type="button"
                onClick={onSelectMunicipality}
                className="mt-3 rounded-xl bg-primary px-4 py-2.5 text-xs font-semibold text-white"
              >
                {t('home.selectMunicipality', lang)}
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-4 px-4">
          <PharmacyWidgetCard tenant={municipality} lang={lang} isDark={isDark} />

          {/* Otobüs Seferleri Kartı */}
          <section 
            onClick={onOpenBusSchedules}
            className={`rounded-2xl border shadow-sm p-4 cursor-pointer transition-all hover:scale-[1.01] active:scale-[0.99] flex items-center justify-between ${
              isDark
                ? 'border-slate-800 bg-slate-900/60 hover:bg-slate-900'
                : 'border-slate-200/80 bg-white hover:bg-slate-50/50'
            }`}
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div 
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${
                  isDark ? 'bg-primary/20 text-sky-400' : 'bg-primary/15 text-primary'
                }`}
              >
                <Bus className="h-6 w-6" strokeWidth={1.5} />
              </div>
              <div className="min-w-0">
                <h3 className={`truncate text-sm font-semibold ${isDark ? 'text-white' : 'text-slate-800'}`}>
                  {t('bus.title', lang)}
                </h3>
                <p className={`mt-0.5 text-xs truncate ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  {t('bus.subtitle', lang)}
                </p>
              </div>
            </div>
            <ChevronRight className={`w-5 h-5 shrink-0 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
          </section>
        </div>
      )}

      {publicOverview && (
        <div className="mt-4 px-4">
          <p className="mb-2 text-xs font-medium text-slate-500">{t('home.public.eyebrow', lang)}</p>
          <div className="grid grid-cols-3 gap-2">
            <div className={`rounded-xl border px-3 py-2.5 ${cardStyle}`}>
              <p className="text-[10px] text-slate-500">{t('home.public.total', lang)}</p>
              <p className="text-sm font-bold tabular-nums text-slate-800 dark:text-white">
                {publicOverview.totalReports}
              </p>
            </div>
            <div className={`rounded-xl border px-3 py-2.5 ${cardStyle}`}>
              <p className="text-[10px] text-slate-500">{t('home.public.resolved', lang)}</p>
              <p className="text-sm font-bold tabular-nums text-emerald-600">{publicOverview.resolvedReports}</p>
            </div>
            <div className={`rounded-xl border px-3 py-2.5 ${cardStyle}`}>
              <p className="text-[10px] text-slate-500">{t('home.public.rate', lang)}</p>
              <p className="text-sm font-bold tabular-nums text-primary">%{publicOverview.resolutionRatePercent}</p>
            </div>
          </div>
        </div>
      )}

      <CityCalendar municipality={municipality} lang={lang} isDark={isDark} embedded />
    </motion.div>
  );
}
