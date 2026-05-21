import { useState, useEffect } from 'react';
import { Building2, ChevronRight, ClipboardList, MapPin, Info } from 'lucide-react';
import {
  getMyReports,
  getPublicAnnouncements,
  getMyProfile,
  type PublicTenant,
  type ApiAnnouncement,
} from '../../api';
import { Lang, t } from '../../i18n';
import { WeatherWidgetCard } from '../home/HomeWidgets';
import AnnouncementCarousel from '../home/AnnouncementCarousel';
import Surveys from './Surveys';
import { screenBg, sectionTitleClass } from '../../lib/ui';

const MY_REPORTS_PREVIEW_SIZE = 3;

interface HomeProps {
  onViewMyReports: () => void;
  onOpenAnnouncement: (announcement: ApiAnnouncement) => void;
  onSelectMunicipality?: () => void;
  onReputationChange?: (score: number) => void;
  lang: Lang;
  isDark: boolean;
  homeMunicipality?: PublicTenant | null;
}

export default function Home({
  onViewMyReports,
  onOpenAnnouncement,
  onSelectMunicipality,
  onReputationChange,
  lang,
  isDark,
  homeMunicipality,
}: HomeProps) {
  const [totalMyReports, setTotalMyReports] = useState(0);
  const [previewTitles, setPreviewTitles] = useState<string[]>([]);
  const [reportsLoading, setReportsLoading] = useState(true);
  const [announcements, setAnnouncements] = useState<ApiAnnouncement[]>([]);
  const [announcementsLoading, setAnnouncementsLoading] = useState(true);
  const [citizenName, setCitizenName] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setReportsLoading(true);
      try {
        const [rep, profile] = await Promise.all([
          getMyReports(0, MY_REPORTS_PREVIEW_SIZE).catch(() => ({ content: [], totalElements: 0 })),
          getMyProfile().catch(() => null),
        ]);
        if (cancelled) return;
        setTotalMyReports(rep.totalElements ?? (rep.content || []).length);
        setPreviewTitles((rep.content || []).map((r) => r.title).filter(Boolean));
        if (profile) {
          setCitizenName(`${profile.firstName} ${profile.lastName}`.trim());
        }
      } finally {
        if (!cancelled) setReportsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!homeMunicipality?.id) {
      setAnnouncementsLoading(false);
      return;
    }
    setAnnouncementsLoading(true);
    getPublicAnnouncements(homeMunicipality.id)
      .then((res) => setAnnouncements(res || []))
      .catch((err) => console.error('Duyurular yuklenirken hata:', err))
      .finally(() => setAnnouncementsLoading(false));
  }, [homeMunicipality]);

  const mutedText = isDark ? 'text-slate-400' : 'text-slate-500';

  return (
    <div className={`pb-8 ${screenBg(isDark)}`}>
      <div className="px-5 pt-5 pb-3 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-slate-500">{t('home.welcome', lang)}</p>
          <h2 className="text-base font-semibold text-slate-800 dark:text-white leading-tight truncate">
            {citizenName || t('home.welcomeGuest', lang)}
          </h2>
        </div>
        {homeMunicipality && (
          <button
            type="button"
            onClick={onSelectMunicipality}
            className="flex shrink-0 items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
          >
            <MapPin className="h-3.5 w-3.5 text-primary" />
            <span className="max-w-[120px] truncate">{homeMunicipality.displayName}</span>
          </button>
        )}
      </div>

      {homeMunicipality?.id ? (
        <div className="px-4 pb-4">
          <WeatherWidgetCard tenant={homeMunicipality} lang={lang} isDark={isDark} />
        </div>
      ) : null}

      {homeMunicipality && (
        <div className="pb-4">
          <div className="px-4 mb-2">
            <h3 className={sectionTitleClass()}>{t('home.announcements.title', lang)}</h3>
          </div>
          {announcementsLoading ? (
            <div className="mx-auto w-[78%] max-w-[320px] aspect-[16/9] animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800/40" />
          ) : announcements.length === 0 ? (
            <div className="mx-4 rounded-2xl border border-slate-200 bg-white p-5 text-center dark:border-slate-800 dark:bg-slate-900">
              <Info className="h-8 w-8 text-slate-300 mx-auto mb-2" />
              <p className="text-xs text-slate-500">{t('home.announcements.empty', lang)}</p>
            </div>
          ) : (
            <AnnouncementCarousel
              announcements={announcements}
              lang={lang}
              isDark={isDark}
              onOpen={onOpenAnnouncement}
            />
          )}
        </div>
      )}

      {!homeMunicipality?.id ? (
        <div className="px-4">
          <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5 dark:border-primary/30 dark:bg-primary/10">
            <div className="flex gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
                <Building2 className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
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
                    className="mt-3 inline-flex items-center gap-1 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-white"
                  >
                    {t('home.selectMunicipality', lang)}
                    <ChevronRight className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="pb-4">
            <Surveys
              municipality={homeMunicipality}
              lang={lang}
              isDark={isDark}
              embedded
              homeSection
              onReputationChange={onReputationChange}
            />
          </div>
          <div className="px-4">{reportsCard()}</div>
        </>
      )}
    </div>
  );

  function reportsCard() {
    return (
      <button
        type="button"
        onClick={onViewMyReports}
        className={`w-full rounded-2xl border p-4 text-left transition active:scale-[0.99] ${
          isDark ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-white'
        }`}
      >
        <div className="flex items-center gap-3">
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
              isDark ? 'bg-primary/20 text-primary' : 'bg-primary/10 text-primary'
            }`}
          >
            <ClipboardList className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-slate-800'}`}>
              {t('home.reports.cardTitle', lang)}
            </p>
            {reportsLoading ? (
              <p className={`mt-0.5 text-xs ${mutedText}`}>…</p>
            ) : (
              <>
                <p className={`mt-0.5 text-xs ${mutedText}`}>
                  {t('home.reports.count', lang, { n: totalMyReports })}
                </p>
                {previewTitles.length > 0 && (
                  <p className="mt-1 truncate text-xs text-slate-400">{previewTitles[0]}</p>
                )}
              </>
            )}
          </div>
          <div className="flex shrink-0 flex-col items-end gap-0.5">
            <span className="text-xs font-medium text-primary">{t('home.reports.viewAll', lang)}</span>
            <ChevronRight className="h-4 w-4 text-primary" />
          </div>
        </div>
      </button>
    );
  }
}
