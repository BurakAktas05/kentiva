import { useState, useEffect } from 'react';
import {
  ArrowLeftRight,
  Building2,
  Camera,
  ChevronRight,
  ClipboardList,
  Info,
  MapPin,
  Navigation,
  Plus,
  ShieldCheck,
} from 'lucide-react';
import {
  getMyReports,
  getPublicAnnouncements,
  getMyProfile,
  type PublicDepartment,
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
  onCreateReport: () => void;
  onViewMyReports: () => void;
  onOpenAnnouncement: (announcement: ApiAnnouncement) => void;
  onSelectMunicipality?: () => void;
  onReputationChange?: (score: number) => void;
  lang: Lang;
  isDark: boolean;
  department?: PublicDepartment | null;
  homeMunicipality?: PublicTenant | null;
}

export default function Home({
  onCreateReport,
  onViewMyReports,
  onOpenAnnouncement,
  onSelectMunicipality,
  onReputationChange,
  lang,
  isDark,
  department,
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
          <div className="flex shrink-0 flex-col items-end gap-1">
            <button
              type="button"
              onClick={onSelectMunicipality}
              className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
            >
              <MapPin className="h-3.5 w-3.5 text-primary" />
              <span className="max-w-[120px] truncate">{homeMunicipality.displayName}</span>
            </button>
            {department && (
              <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-semibold text-primary dark:bg-primary/15 dark:text-sky-300">
                {department.name}
              </span>
            )}
          </div>
        )}
      </div>

      {homeMunicipality && !homeMunicipality.onboarded ? (
        <div className="px-5 py-6">
          <div className={`rounded-3xl border p-6 text-center shadow-lg transition-all ${
            isDark 
              ? 'border-amber-500/20 bg-gradient-to-br from-slate-900 to-amber-950/10' 
              : 'border-amber-200 bg-gradient-to-br from-white to-amber-50/20'
          }`}>
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500 shadow-inner">
              <Building2 className="h-7 w-7" />
            </div>
            <h3 className={`text-base font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {t('tenant.notOnboardedTitle', lang)}
            </h3>
            <p className="mt-2.5 text-xs leading-relaxed text-slate-500 dark:text-slate-400 font-medium font-sans">
              {t('tenant.notOnboardedDesc', lang)}
            </p>
            {onSelectMunicipality && (
              <button
                type="button"
                onClick={onSelectMunicipality}
                className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all"
              >
                <ArrowLeftRight className="h-4 w-4" />
                {t('settings.changeMunicipality', lang)}
              </button>
            )}
          </div>
        </div>
      ) : (
        <>
          {homeMunicipality?.id ? (
            <div className="px-4 pb-4">
              <section className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-primary-dark via-primary to-sky-500 p-5 text-white shadow-[0_22px_48px_-24px_rgba(11,79,156,.8)]">
                <div className="absolute -right-12 -top-16 h-40 w-40 rounded-full border-[28px] border-white/10" />
                <div className="absolute -bottom-16 right-16 h-32 w-32 rounded-full bg-sky-300/15 blur-2xl" />
                <div className="relative">
                  <div className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[.16em] text-sky-100">
                    <ShieldCheck className="h-4 w-4" />
                    {lang === 'tr' ? 'Güvenli belediye bildirimi' : 'Secure municipality report'}
                  </div>
                  <h3 className="mt-3 max-w-[280px] text-[21px] font-extrabold leading-[1.18] tracking-[-.025em]">
                    {lang === 'tr' ? 'Kentte gördüğünüz sorunu birkaç adımda bildirin.' : 'Report an issue in your city in a few steps.'}
                  </h3>
                  <p className="mt-2 max-w-[300px] text-xs font-medium leading-5 text-blue-100/90">
                    {lang === 'tr'
                      ? 'Konumu doğrulayın, fotoğraf ekleyin; süreci belediyenizle şeffaf biçimde takip edin.'
                      : 'Verify the location, add a photo, and transparently track the process.'}
                  </p>

                  <button
                    type="button"
                    onClick={onCreateReport}
                    className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-extrabold text-primary shadow-lg shadow-slate-950/15 transition hover:bg-sky-50 active:scale-[.98]"
                  >
                    <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-primary/10"><Plus className="h-4 w-4" /></span>
                    {lang === 'tr' ? 'Yeni ihbar oluştur' : 'Create a new report'}
                    <ChevronRight className="h-4 w-4" />
                  </button>

                  <div className="mt-5 grid grid-cols-3 gap-2 border-t border-white/15 pt-4">
                    {[
                      { icon: Navigation, label: lang === 'tr' ? 'GPS konumu' : 'GPS location' },
                      { icon: Camera, label: lang === 'tr' ? 'Fotoğraf' : 'Photo' },
                      { icon: ClipboardList, label: lang === 'tr' ? 'Canlı takip' : 'Live tracking' },
                    ].map(({ icon: Icon, label }) => (
                      <div key={label} className="flex min-w-0 items-center gap-1.5 text-[10px] font-bold text-blue-50">
                        <Icon className="h-3.5 w-3.5 shrink-0 text-sky-200" />
                        <span className="truncate">{label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            </div>
          ) : null}

          {homeMunicipality?.id ? (
            <div className="px-4 pb-4">
              <WeatherWidgetCard tenant={homeMunicipality} lang={lang} isDark={isDark} />
            </div>
          ) : null}

          {homeMunicipality && (
            <div className="px-4 pb-4">
              <div className="mb-2">
                <h3 className={sectionTitleClass()}>{t('home.announcements.title', lang)}</h3>
              </div>
              {announcementsLoading ? (
                <div className="w-full aspect-[16/9] animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800/40" />
              ) : announcements.length === 0 ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-5 text-center dark:border-slate-800 dark:bg-slate-900">
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
              <div className="px-4 pb-4">{reportsCard()}</div>
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
            </>
          )}
        </>
      )}
    </div>
  );

  function reportsCard() {
    return (
      <button
        type="button"
        onClick={onViewMyReports}
        className={`w-full rounded-[22px] border p-4 text-left shadow-sm transition active:scale-[0.99] ${
          isDark ? 'border-slate-800 bg-slate-900' : 'border-slate-200/80 bg-white'
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
