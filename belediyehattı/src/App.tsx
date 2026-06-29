import { Fragment, useCallback, useEffect, useState, lazy, Suspense } from 'react';
import { Capacitor } from '@capacitor/core';
import { useEdgeSwipeBack } from './lib/useEdgeSwipeBack';
import { clearStaleApiOverrideIfNeeded } from './lib/apiBase';
import { initNativeShell } from './lib/nativeShell';
import { Home as HomeIcon, PlusCircle, User, Bell, Building2, Map, Users } from 'lucide-react';
import {
  type ApiAnnouncement,
  type PublicTenant,
} from './api';
import { Lang, t } from './i18n';
import { useTenant } from './TenantContext';
import ErrorBoundary from './components/common/ErrorBoundary';
import { storageService } from './lib/storageService';
import { useAppSession } from './hooks/useAppSession';
import { useAppRouting, parsePublicRoute, type Tab, MAIN_TABS } from './hooks/useAppRouting';
import { useAppOfflineSync } from './hooks/useAppOfflineSync';
import { useAppNotifications } from './hooks/useAppNotifications';

const AuthScreen = lazy(() => import('./components/screens/AuthScreen'));
const Home = lazy(() => import('./components/screens/Home'));
const MyReports = lazy(() => import('./components/screens/MyReports'));
const NewReport = lazy(() => import('./components/screens/NewReport'));
const Profile = lazy(() => import('./components/screens/Profile'));
const Notifications = lazy(() => import('./components/screens/Notifications'));
const Settings = lazy(() => import('./components/screens/Settings'));
const ReportDetailScreen = lazy(() => import('./components/screens/ReportDetailScreen'));
const MunicipalityPicker = lazy(() => import('./components/screens/MunicipalityPicker'));
const KentScreen = lazy(() => import('./components/screens/KentScreen'));
const CommunityScreen = lazy(() => import('./components/screens/CommunityScreen'));
const NotificationPrefsModal = lazy(() => import('./components/screens/NotificationPrefsModal'));
const IntroductionModal = lazy(() => import('./components/screens/IntroductionModal'));
const AnnouncementDetailScreen = lazy(() => import('./components/screens/AnnouncementDetailScreen'));
const RanksScreen = lazy(() => import('./components/screens/RanksScreen'));

function LoadingSpinner({ isDark }: { isDark: boolean }) {
  return (
    <div className={`flex min-h-app items-center justify-center ${isDark ? 'bg-slate-950' : 'bg-slate-100'}`}>
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  );
}

function AppLoadingScreen({ isDark, lang }: { isDark: boolean; lang: Lang }) {
  const heading = 'Kentiva';
  const subtitle = lang === 'tr' ? 'Akıllı Belediyecilik Platformu' : lang === 'ar' ? 'منصة البلدية الذكية' : 'Smart Municipalism Platform';
  const slogan = lang === 'tr' 
    ? 'Yapay zeka destekli modern şehir yönetimi ve katılımcı belediyecilik.'
    : lang === 'ar'
      ? 'إدارة المدن الحديثة المدعومة بالذكاء الاصطناعي والبلدية التشاركية.'
      : 'AI-powered modern city management and participatory municipalism.';

  return (
    <div className={`relative flex flex-col items-center justify-center min-h-app p-6 overflow-hidden transition-all duration-500 ${
      isDark 
        ? 'bg-slate-950 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-indigo-950/40 via-slate-950 to-slate-950 text-white' 
        : 'bg-slate-50 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-indigo-100/50 via-slate-50 to-slate-100 text-slate-900'
    }`}>
      <div className="absolute top-1/4 -right-16 w-64 h-64 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -left-16 w-64 h-64 rounded-full bg-secondary/10 blur-3xl pointer-events-none" />

      <div className={`w-full max-w-sm rounded-3xl p-8 backdrop-blur-md shadow-2xl transition-all border ${
        isDark 
          ? 'border-slate-800/80 bg-slate-900/70 shadow-black/40' 
          : 'border-white bg-white/80 shadow-primary/5'
      }`}>
        <div className="mx-auto mb-6 relative flex h-20 w-20 items-center justify-center rounded-[24px] bg-gradient-to-tr from-primary to-secondary text-white shadow-xl shadow-primary/25">
          <div className="absolute inset-0 rounded-[24px] bg-gradient-to-tr from-primary to-secondary opacity-50 blur-md -z-10 animate-pulse" />
          <Building2 className="h-10 w-10 text-white animate-bounce" strokeWidth={1.5} />
        </div>

        <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent dark:from-sky-400 dark:to-indigo-300">
          {heading}
        </h1>
        <p className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mt-2">
          {subtitle}
        </p>

        <div className={`mt-6 p-4 rounded-2xl border text-xs leading-relaxed font-semibold shadow-inner ${
          isDark 
            ? 'border-slate-800 bg-slate-950/60 text-slate-400' 
            : 'border-slate-100 bg-slate-50/50 text-slate-500'
        }`}>
          {slogan}
        </div>

        <div className="mt-8 flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-3 border-primary border-t-transparent" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-primary dark:text-sky-400 animate-pulse">
            {lang === 'tr' ? 'Yükleniyor' : lang === 'ar' ? 'جاري التحميل' : 'Loading'}
          </span>
        </div>
      </div>
    </div>
  );
}

function NotOnboardedBlockedView({ lang, isDark }: { lang: Lang; isDark: boolean }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center p-6 text-center min-h-[60vh]">
      <div className={`rounded-3xl border p-8 max-w-sm shadow-xl transition-all ${
        isDark 
          ? 'border-amber-500/20 bg-slate-900/60 text-slate-200' 
          : 'border-amber-200 bg-white text-slate-800'
      }`}>
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500 shadow-inner">
          <Building2 className="h-7 w-7" />
        </div>
        <h3 className="text-base font-bold tracking-tight">
          {t('tenant.notOnboardedTitle', lang)}
        </h3>
        <p className="mt-3 text-xs leading-relaxed text-slate-500 dark:text-slate-400 font-medium font-sans">
          {t('tenant.notOnboardedDesc', lang)}
        </p>
      </div>
    </div>
  );
}

export default function App() {
  const { tenant, setTenant, department, setDepartment } = useTenant();
  const isMuniNotOnboarded = Boolean(tenant && tenant.onboarded === false);

  const [key, setKey] = useState(0);
  const [lang, setLang] = useState<Lang>(() => (storageService.getItem('belediye_lang') as Lang) || 'tr');
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>(() => (storageService.getItem('belediye_theme') as any) || 'light');
  
  const [isGuest, setIsGuest] = useState(() => storageService.getItem('belediye_is_guest') === 'true');

  const [systemIsDark, setSystemIsDark] = useState(() => window.matchMedia('(prefers-color-scheme: dark)').matches);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => setSystemIsDark(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  const isDark = theme === 'dark' || (theme === 'system' && systemIsDark);

  useEffect(() => {
    void clearStaleApiOverrideIfNeeded();
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [isDark]);

  useEffect(() => {
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
  }, [lang]);

  useEffect(() => { storageService.setItem('belediye_lang', lang); }, [lang]);
  useEffect(() => { storageService.setItem('belediye_theme', theme); }, [theme]);

  // Shared router path definitions computed statically to bypass temporal dead zone (TDZ)
  const [explicitRoute] = useState<any>(() =>
    parsePublicRoute(window.location.pathname, window.location.hostname),
  );
  const [routeBooting, setRouteBooting] = useState(() =>
    Boolean(parsePublicRoute(window.location.pathname, window.location.hostname)),
  );

  // 1. Session initialization and onboarding verification
  const {
    user,
    sessionBooting,
    pickerMode,
    setPickerMode,
    isIntroModalOpen,
    setIsIntroModalOpen,
    isPrefsModalOpen,
    setIsPrefsModalOpen,
    pendingLocationTenant,
    setPendingLocationTenant,
    handleAuth,
    handleLogout,
    handleMunicipalitySelect,
  } = useAppSession({
    tenant,
    setTenant,
    setDepartment,
    routeBooting,
    explicitRoute,
    setKey,
  });

  const handleAuthWithClear = (usr: any, meta?: any) => {
    setIsGuest(false);
    storageService.removeItem('belediye_is_guest');
    handleAuth(usr, meta);
  };

  const handleLogoutWithClear = () => {
    setIsGuest(false);
    storageService.removeItem('belediye_is_guest');
    handleLogout();
  };

  // 2. Custom hooks routing manager
  const {
    activeTab,
    setActiveTab,
    openReportId,
    setOpenReportId,
    openAnnouncement,
    setOpenAnnouncement,
    reportReturnTab,
    setReportReturnTab,
    rewardsReturnTab,
    setRewardsReturnTab,
    openReport,
    closeReport,
    goToTab,
  } = useAppRouting({
    user,
    tenant,
    setTenant,
    department,
    setDepartment,
    pickerMode,
    setPickerMode,
    isIntroModalOpen,
    setIsIntroModalOpen,
    isPrefsModalOpen,
    setIsPrefsModalOpen,
    explicitRoute,
    routeBooting,
    setRouteBooting,
  });

  // 3. Auto sync background thread queue
  useAppOfflineSync();

  // 4. Notifications setups
  const handlePushClick = useCallback((reportId: string) => {
    setReportReturnTab('home');
    setOpenReportId(reportId);
    setActiveTab('home');
  }, [setReportReturnTab, setOpenReportId, setActiveTab]);

  const {
    unreadCount,
    setUnreadCount
  } = useAppNotifications({
    user,
    onPushNotificationClick: handlePushClick
  });

  useEffect(() => {
    void initNativeShell(isDark);
  }, [isDark]);

  const handleReportSubmit = () => {
    setKey((k) => k + 1);
    setActiveTab('home');
    setOpenReportId(null);
  };

  if (!user && !isGuest) {
    return (
      <ErrorBoundary>
        <Suspense fallback={<LoadingSpinner isDark={isDark} />}>
          <AuthScreen 
            onAuth={handleAuthWithClear} 
            onContinueAsGuest={() => {
              setIsGuest(true);
              storageService.setItem('belediye_is_guest', 'true');
            }} 
            lang={lang} 
            isDark={isDark} 
          />
        </Suspense>
      </ErrorBoundary>
    );
  }

  if (sessionBooting || routeBooting) {
    return <AppLoadingScreen isDark={isDark} lang={lang} />;
  }

  if (pickerMode) {
    return (
      <ErrorBoundary>
        <Suspense fallback={<LoadingSpinner isDark={isDark} />}>
          <MunicipalityPicker
            lang={lang}
            isDark={isDark}
            mode={pickerMode}
            onSelect={(t) => void handleMunicipalitySelect(t)}
            onCancel={pickerMode === 'change' ? () => setPickerMode(null) : undefined}
          />
        </Suspense>
      </ErrorBoundary>
    );
  }

  const renderAuthRequiredView = (title: string, desc: string) => (
    <div className="flex flex-1 flex-col items-center justify-center p-6 text-center min-h-[60vh] my-auto">
      <div className={`rounded-[32px] border p-8 max-w-sm shadow-xl transition-all ${
        isDark 
          ? 'border-slate-800 bg-slate-900/60 text-slate-200 shadow-black/35' 
          : 'border-slate-200 bg-white text-slate-800 shadow-primary/5'
      }`}>
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-inner">
          <User className="h-7 w-7 text-primary" />
        </div>
        <h3 className="text-base font-extrabold tracking-tight">
          {title}
        </h3>
        <p className="mt-3 text-xs leading-relaxed text-slate-500 dark:text-slate-400 font-semibold font-sans">
          {desc}
        </p>
        <button
          type="button"
          onClick={() => {
            setIsGuest(false);
            storageService.removeItem('belediye_is_guest');
          }}
          className="mt-6 w-full rounded-2xl bg-primary py-3 text-xs font-bold text-white shadow-lg shadow-primary/20 hover:brightness-105 active:scale-[0.98] transition-all cursor-pointer font-sans"
        >
          {lang === 'tr' ? 'Giriş Yap / Kayıt Ol' : 'Log In / Register'}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('home')}
          className={`mt-3 w-full rounded-2xl border py-3 text-xs font-bold active:scale-[0.98] transition-all cursor-pointer font-sans ${
            isDark 
              ? 'border-slate-700 text-slate-300 hover:bg-slate-800' 
              : 'border-slate-300 text-slate-600 hover:bg-slate-50'
          }`}
        >
          {lang === 'tr' ? 'Geri Dön' : 'Go Back'}
        </button>
      </div>
    </div>
  );

  return (
    <ErrorBoundary>
      <div className={`min-h-app flex justify-center font-sans ${isDark ? 'bg-slate-950 text-white' : 'bg-slate-100 text-slate-900'}`}>
        <div className={`w-full max-w-md flex flex-col h-app relative overflow-hidden sm:border-x sm:shadow-kentiva ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200/80'}`}>

        {!openReportId && !openAnnouncement && activeTab !== 'reports' && activeTab !== 'bus' && activeTab !== 'rewards' && (
          <header className={`px-4 py-3.5 pt-safe z-10 flex justify-between items-center shrink-0 border-b backdrop-blur-md ${isDark ? 'border-slate-800 bg-slate-900/95' : 'border-slate-200/80 bg-white/90'}`}>
            <button
              type="button"
              onClick={() => tenant && setPickerMode('change')}
              className={`flex min-w-0 flex-1 items-center gap-2.5 text-left rounded-xl -ml-1 p-1 ${tenant ? 'active:bg-slate-100 dark:active:bg-slate-800' : ''}`}
            >
              <div className="w-9 h-9 rounded-lg bg-primary/15 flex items-center justify-center text-primary shrink-0">
                {tenant?.logoUrl ? (
                  <img src={tenant.logoUrl} alt="" className="h-7 w-7 rounded object-contain" />
                ) : (
                  <Building2 className="w-5 h-5" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 min-w-0">
                  <h1 className={`text-base font-bold tracking-tight truncate ${isDark ? 'text-white' : 'text-slate-800'}`}>
                    {tenant?.displayName ?? t('app.name', lang)}
                  </h1>
                </div>
                <p className={`text-[10px] font-medium tracking-wide truncate ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  {department?.name || (tenant ? t('settings.municipalityLinked', lang) : t('app.slogan', lang))}
                </p>
              </div>
            </button>
            <button
              onClick={() => {
                if (activeTab === 'notifications') {
                  goToTab('home');
                } else {
                  setActiveTab('notifications');
                }
              }}
              className={`relative shrink-0 p-2 rounded-xl transition-colors ${isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`}
            >
              <Bell className={`w-5 h-5 ${isDark ? 'text-slate-300' : 'text-slate-600'}`} strokeWidth={activeTab === 'notifications' ? 2.5 : 2} />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>
          </header>
        )}

        <main className={`flex-1 overflow-y-auto overflow-x-hidden relative pb-20 ${isDark ? 'bg-slate-900' : 'bg-slate-50'}`}>
          <Suspense fallback={<LoadingSpinner isDark={isDark} />}>
            {openAnnouncement && (
              <AnnouncementDetailScreen
                announcement={openAnnouncement}
                municipality={tenant}
                lang={lang}
                isDark={isDark}
                onClose={() => setOpenAnnouncement(null)}
              />
            )}
            {activeTab === 'home' && !openReportId && !openAnnouncement && (
              <Fragment key={key}>
                <Home
                  onViewMyReports={() => {
                    setActiveTab('reports');
                  }}
                  onOpenAnnouncement={setOpenAnnouncement}
                  onSelectMunicipality={() => setPickerMode('onboarding')}
                  onReputationChange={() => setKey((prev) => prev + 1)}
                  department={department}
                  lang={lang}
                  isDark={isDark}
                  homeMunicipality={tenant}
                />
              </Fragment>
            )}
            {activeTab === 'kent' && (
              isMuniNotOnboarded ? (
                <NotOnboardedBlockedView lang={lang} isDark={isDark} />
              ) : (
                <KentScreen
                  municipality={tenant}
                  department={department}
                  lang={lang}
                  isDark={isDark}
                  onSelectMunicipality={() => setPickerMode('onboarding')}
                  onOpenRewards={() => {
                    setRewardsReturnTab('kent');
                    setActiveTab('rewards');
                  }}
                />
              )
            )}

            {activeTab === 'topluluk' && (
              isMuniNotOnboarded ? (
                <NotOnboardedBlockedView lang={lang} isDark={isDark} />
              ) : (
                <CommunityScreen municipality={tenant} lang={lang} isDark={isDark} />
              )
            )}
            {openReportId && (
              <ReportDetailScreen
                reportId={openReportId}
                lang={lang}
                isDark={isDark}
                onClose={closeReport}
              />
            )}
            {activeTab === 'report' && (
              !user ? (
                renderAuthRequiredView(
                  lang === 'tr' ? 'İhbar Oluşturun' : 'Create Report',
                  lang === 'tr' 
                    ? 'Yeni bir ihbar kaydı oluşturmak, durum takibi yapabilmek ve sadakat ödülleri kazanabilmek için lütfen kayıt olun veya giriş yapın.' 
                    : 'Please log in or register to submit reports, track status, and earn loyalty rewards.'
                )
              ) : isMuniNotOnboarded ? (
                <NotOnboardedBlockedView lang={lang} isDark={isDark} />
              ) : (
                <NewReport
                  defaultMunicipality={tenant}
                  defaultDepartment={department}
                  onSubmit={handleReportSubmit}
                  onCancel={() => goToTab('home')}
                  lang={lang}
                  isDark={isDark}
                />
              )
            )}
            {activeTab === 'reports' && !openReportId && (
              !user ? (
                renderAuthRequiredView(
                  lang === 'tr' ? 'İhbarlarım' : 'My Reports',
                  lang === 'tr' 
                    ? 'Geçmişte oluşturduğunuz ihbarları incelemek ve durumlarını takip etmek için lütfen kayıt olun veya giriş yapın.' 
                    : 'Please log in or register to review your past reports and track their status.'
                )
              ) : isMuniNotOnboarded ? (
                <NotOnboardedBlockedView lang={lang} isDark={isDark} />
              ) : (
                <MyReports
                  onBack={() => goToTab('home')}
                  onOpenReport={openReport}
                  lang={lang}
                  isDark={isDark}
                />
              )
            )}
            {activeTab === 'profile' && (
              !user ? (
                renderAuthRequiredView(
                  lang === 'tr' ? 'Profilinizi Görüntüleyin' : 'View Your Profile',
                  lang === 'tr' 
                    ? 'Profil bilgilerinizi düzenlemek, geçmiş ihbarlarınızı incelemek ve kazandığınız sadakat ödüllerini görmek için giriş yapın.' 
                    : 'Log in to edit your profile, review your report history, and view your loyalty rewards.'
                )
              ) : (
                <Profile
                  onLogout={handleLogoutWithClear}
                  onSettings={() => setActiveTab('settings')}
                  onRewards={() => {
                    setActiveTab('ranks');
                  }}
                  onChangeMunicipality={() => setPickerMode('change')}
                  municipality={tenant}
                  lang={lang}
                  isDark={isDark}
                />
              )
            )}
            {activeTab === 'ranks' && (
              <RanksScreen
                lang={lang}
                isDark={isDark}
                municipality={tenant}
                onBack={() => setActiveTab('profile')}
              />
            )}
            {activeTab === 'notifications' && (
              !user ? (
                renderAuthRequiredView(
                  lang === 'tr' ? 'Bildirimler' : 'Notifications',
                  lang === 'tr' 
                    ? 'İhbarlarınızın güncel durumlarından haberdar olmak ve yeni duyuru bildirimlerini almak için lütfen giriş yapın.' 
                    : 'Please log in to receive updates on your reports and new announcement notifications.'
                )
              ) : isMuniNotOnboarded ? (
                <NotOnboardedBlockedView lang={lang} isDark={isDark} />
              ) : (
                <Notifications
                  onBadgeUpdate={setUnreadCount}
                  onOpenReport={openReport}
                  onNavigate={goToTab}
                  lang={lang}
                  isDark={isDark}
                />
              )
            )}
            {activeTab === 'settings' && (
              <Settings
                lang={lang}
                isDark={isDark}
                theme={theme}
                municipality={tenant}
                onLangChange={setLang}
                onThemeChange={setTheme}
                onBack={() => setActiveTab('profile')}
                onChangeMunicipality={() => setPickerMode('change')}
                onNavigate={setActiveTab}
                onSessionEnded={handleLogoutWithClear}
              />
            )}
          </Suspense>
        </main>

        {activeTab !== 'settings' && activeTab !== 'reports' && activeTab !== 'report' && activeTab !== 'notifications' && !openReportId && !openAnnouncement && activeTab !== 'ranks' && (
          <nav className={`absolute bottom-0 w-full border-t flex items-end justify-between pb-safe pt-2 px-1 z-20 rounded-t-2xl shadow-[0_-8px_30px_-12px_rgba(15,23,42,0.12)] ${isDark ? 'bg-slate-900/95 border-slate-800 backdrop-blur-md' : 'bg-white/95 border-slate-200/90 backdrop-blur-md'}`}>
            <button
              type="button"
              onClick={() => goToTab('home')}
              className={`flex flex-1 flex-col items-center py-2 min-w-0 transition-colors ${activeTab === 'home' ? 'text-primary' : isDark ? 'text-slate-400' : 'text-slate-500'}`}
            >
              <HomeIcon className="w-5 h-5 mb-0.5" strokeWidth={activeTab === 'home' ? 2.5 : 2} />
              <span className="text-[11px] font-medium truncate max-w-full px-0.5">{t('tab.home', lang)}</span>
            </button>

            <button
              type="button"
              onClick={() => goToTab('kent')}
              className={`flex flex-1 flex-col items-center py-2 min-w-0 transition-colors ${activeTab === 'kent' ? 'text-primary' : isDark ? 'text-slate-400' : 'text-slate-500'}`}
            >
              <Map className="w-5 h-5 mb-0.5" strokeWidth={activeTab === 'kent' ? 2.5 : 2} />
              <span className="text-[11px] font-medium truncate max-w-full px-0.5">{t('tab.kent', lang)}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('report');
              }}
              className="flex flex-col items-center justify-center -mt-6 px-2 shrink-0"
              aria-label={t('tab.report', lang)}
            >
              <div className="p-3.5 rounded-full shadow-lg shadow-primary/30 transition-transform active:scale-95 bg-primary">
                <PlusCircle className="w-7 h-7 text-white" strokeWidth={2} />
              </div>
            </button>

            <button
              type="button"
              onClick={() => goToTab('topluluk')}
              className={`flex flex-1 flex-col items-center py-2 min-w-0 transition-colors ${activeTab === 'topluluk' ? 'text-primary' : isDark ? 'text-slate-400' : 'text-slate-500'}`}
            >
              <Users className="w-5 h-5 mb-0.5" strokeWidth={activeTab === 'topluluk' ? 2.5 : 2} />
              <span className="text-[11px] font-medium truncate max-w-full px-0.5">{t('tab.community', lang)}</span>
            </button>

            <button
              type="button"
              onClick={() => goToTab('profile')}
              className={`flex flex-1 flex-col items-center py-2 min-w-0 transition-colors ${activeTab === 'profile' ? 'text-primary' : isDark ? 'text-slate-400' : 'text-slate-500'}`}
            >
              <User className="w-5 h-5 mb-0.5" strokeWidth={activeTab === 'profile' ? 2.5 : 2} />
              <span className="text-[11px] font-medium truncate max-w-full px-0.5">{t('tab.profile', lang)}</span>
            </button>
          </nav>
        )}
        <Suspense fallback={null}>
          <IntroductionModal
            lang={lang}
            isDark={isDark}
            isOpen={isIntroModalOpen}
            onClose={() => setIsIntroModalOpen(false)}
          />
          <NotificationPrefsModal
            lang={lang}
            isDark={isDark}
            isOpen={isPrefsModalOpen}
            onClose={() => setIsPrefsModalOpen(false)}
          />
        </Suspense>

        {pendingLocationTenant && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
            <div className={`w-full max-w-sm rounded-3xl border p-6 shadow-2xl text-center transition-all ${
              isDark ? 'border-slate-800 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-800'
            }`}>
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-inner">
                <Building2 className="h-7 w-7 animate-pulse text-primary" />
              </div>
              <h3 className="text-center text-base font-extrabold tracking-tight">
                {lang === 'tr' ? 'Belediye Değişikliği' : 'Switch Municipality'}
              </h3>
              <p className="mt-3 text-center text-xs leading-relaxed text-slate-500 dark:text-slate-400 font-semibold">
                {lang === 'tr' 
                  ? `Şu anda ${pendingLocationTenant.displayName} sınırları içerisindesiniz. Bu belediyeye geçiş yapmak ister misiniz?`
                  : `You are currently within the boundaries of ${pendingLocationTenant.displayName}. Do you want to switch to this municipality?`}
              </p>
              <div className="mt-6 flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    void handleMunicipalitySelect(pendingLocationTenant);
                    setPendingLocationTenant(null);
                  }}
                  className="flex-1 rounded-2xl bg-primary py-3 text-xs font-bold text-white shadow-lg shadow-primary/20 hover:brightness-105 active:scale-[0.98] transition-all cursor-pointer"
                >
                  {lang === 'tr' ? 'Evet, Geç' : 'Yes, Switch'}
                </button>
                <button
                  type="button"
                  onClick={() => setPendingLocationTenant(null)}
                  className={`flex-1 rounded-2xl border py-3 text-xs font-bold active:scale-[0.98] transition-all cursor-pointer ${
                    isDark 
                      ? 'border-slate-700 hover:bg-slate-800 text-slate-300' 
                      : 'border-slate-300 hover:bg-slate-50 text-slate-600'
                  }`}
                >
                  {lang === 'tr' ? 'Hayır, Kal' : 'No, Keep'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
    </ErrorBoundary>
  );
}
