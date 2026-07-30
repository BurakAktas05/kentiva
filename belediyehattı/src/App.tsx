import { Fragment, useCallback, useEffect, useRef, useState, lazy, Suspense } from 'react';
import { Capacitor } from '@capacitor/core';
import { useEdgeSwipeBack } from './lib/useEdgeSwipeBack';
import { clearStaleApiOverrideIfNeeded } from './lib/apiBase';
import { hideNativeSplash, initNativeShell } from './lib/nativeShell';
import { usePrefersReducedMotion } from './lib/usePrefersReducedMotion';
import { User, Bell, Building2, CheckCircle2, Clock3, AlertTriangle, X } from 'lucide-react';
import {
  resolveMediaUrl,
  type ApiAnnouncement,
  type PublicTenant,
} from './api';
import { Lang, pickLang, t } from './i18n';
import { useTenant } from './TenantContext';
import ErrorBoundary from './components/common/ErrorBoundary';
import { storageService } from './lib/storageService';
import { useAppSession } from './hooks/useAppSession';
import { useAppRouting, parsePublicRoute, type Tab } from './hooks/useAppRouting';
import { useAppOfflineSync } from './hooks/useAppOfflineSync';
import { useAppNotifications } from './hooks/useAppNotifications';
import BottomNavigation from './components/common/BottomNavigation';
import SplashScreen from './components/screens/SplashScreen';
import OfflineBanner from './components/ui/OfflineBanner';

const AuthScreen = lazy(() => import('./components/screens/AuthScreen'));
const Home = lazy(() => import('./components/screens/Home'));
const MyReports = lazy(() => import('./components/screens/MyReports'));
const NewReport = lazy(() => import('./components/screens/NewReport'));
const Profile = lazy(() => import('./components/screens/Profile'));
const Notifications = lazy(() => import('./components/screens/Notifications'));
const Settings = lazy(() => import('./components/screens/Settings'));
const ReportDetailScreen = lazy(() => import('./components/screens/ReportDetailScreen'));
const BelediyeHubScreen = lazy(() => import('./components/screens/BelediyeHubScreen'));
const NotificationPrefsModal = lazy(() => import('./components/screens/NotificationPrefsModal'));
const IntroductionModal = lazy(() => import('./components/screens/IntroductionModal'));
const AnnouncementDetailScreen = lazy(() => import('./components/screens/AnnouncementDetailScreen'));
const RanksScreen = lazy(() => import('./components/screens/RanksScreen'));
const MunicipalityPicker = lazy(() => import('./components/screens/MunicipalityPicker'));

function LoadingSpinner({ isDark, brand }: { isDark: boolean; brand?: boolean }) {
  if (brand) {
    return (
      <div
        className="flex min-h-app items-center justify-center bg-slate-50"
        aria-busy
        aria-live="polite"
      >
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-primary" />
      </div>
    );
  }
  return (
    <div className={`flex min-h-app items-center justify-center ${isDark ? 'bg-slate-950' : 'bg-slate-100'}`}>
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
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
  const [lang, setLang] = useState<Lang>(() => {
    const saved = storageService.getItem('belediye_lang') as Lang | null;
    if (saved === 'tr' || saved === 'en' || saved === 'ar' || saved === 'fil') return saved;
    return 'fil';
  });
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>(() => (storageService.getItem('belediye_theme') as any) || 'light');
  
  const [isGuest, setIsGuest] = useState(() => storageService.getItem('belediye_is_guest') === 'true');
  const mainContentRef = useRef<HTMLElement>(null);
  const [reportSuccessVisible, setReportSuccessVisible] = useState(false);
  const [offlineQueuedVisible, setOfflineQueuedVisible] = useState(false);
  const [offlineSyncErrorVisible, setOfflineSyncErrorVisible] = useState(false);

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

  const reducedMotion = usePrefersReducedMotion();
  const [minSplashDone, setMinSplashDone] = useState(false);
  const [bootTimedOut, setBootTimedOut] = useState(false);
  const [splashExiting, setSplashExiting] = useState(false);
  const [splashHidden, setSplashHidden] = useState(false);

  useEffect(() => {
    if (!reportSuccessVisible) return;
    const timeout = window.setTimeout(() => setReportSuccessVisible(false), 7000);
    return () => window.clearTimeout(timeout);
  }, [reportSuccessVisible]);

  useEffect(() => {
    if (!offlineQueuedVisible) return;
    const timeout = window.setTimeout(() => setOfflineQueuedVisible(false), 8000);
    return () => window.clearTimeout(timeout);
  }, [offlineQueuedVisible]);

  useEffect(() => {
    if (!offlineSyncErrorVisible) return;
    const timeout = window.setTimeout(() => setOfflineSyncErrorVisible(false), 8000);
    return () => window.clearTimeout(timeout);
  }, [offlineSyncErrorVisible]);

  useEffect(() => {
    const onOfflineSync = (event: Event) => {
      const detail = (event as CustomEvent<{ remaining?: number; synced?: number }>).detail;
      if (detail && typeof detail.remaining === 'number' && detail.remaining > 0) {
        setOfflineSyncErrorVisible(true);
      } else if (detail && typeof detail.synced === 'number' && detail.synced > 0) {
        setOfflineQueuedVisible(false);
        setOfflineSyncErrorVisible(false);
      }
    };
    window.addEventListener('kentiva:offline-sync', onOfflineSync);
    return () => window.removeEventListener('kentiva:offline-sync', onOfflineSync);
  }, []);

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

  useEffect(() => {
    const ms = reducedMotion ? 350 : 1800;
    const timeout = window.setTimeout(() => setMinSplashDone(true), ms);
    return () => window.clearTimeout(timeout);
  }, [reducedMotion]);

  // Never block forever if profile / public route API hangs (common on APK + tunnel).
  useEffect(() => {
    const ms = reducedMotion ? 1400 : 4200;
    const timeout = window.setTimeout(() => setBootTimedOut(true), ms);
    return () => window.clearTimeout(timeout);
  }, [reducedMotion]);

  // Preload auth (and home) during splash so Suspense does not flash a blank page.
  useEffect(() => {
    void import('./components/screens/AuthScreen');
    void import('./components/screens/Home');
  }, []);

  // Drop native solid splash as soon as React landing is painted.
  useEffect(() => {
    void hideNativeSplash();
  }, []);

  const bootBusy = (sessionBooting || routeBooting) && !bootTimedOut;
  const canDismissSplash = minSplashDone && !bootBusy;

  useEffect(() => {
    if (!canDismissSplash || splashHidden) return;
    setSplashExiting(true);
    const timeout = window.setTimeout(() => setSplashHidden(true), reducedMotion ? 40 : 320);
    return () => window.clearTimeout(timeout);
  }, [canDismissSplash, splashHidden, reducedMotion]);

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

  useEffect(() => {
    if (isGuest && !tenant?.id && !routeBooting && !pickerMode) {
      setPickerMode('onboarding');
    }
  }, [isGuest, pickerMode, routeBooting, setPickerMode, tenant?.id]);

  useEffect(() => {
    if (mainContentRef.current) {
      mainContentRef.current.scrollTop = 0;
    }
  }, [activeTab, openReportId, openAnnouncement]);

  const showBottomNavigation =
    ['home', 'report', 'reports', 'kent', 'profile'].includes(activeTab)
    && !openReportId
    && !openAnnouncement
    && !pickerMode;

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
    // Splash already hidden on first paint; keep status bar / keyboard in sync with theme.
    void initNativeShell(isDark, { hideSplash: false });
  }, [isDark]);

  const handleReportSubmit = () => {
    setKey((k) => k + 1);
    setOfflineQueuedVisible(false);
    setOfflineSyncErrorVisible(false);
    setReportSuccessVisible(true);
    setActiveTab('reports');
    setOpenReportId(null);
  };

  const handleReportQueuedOffline = () => {
    setKey((k) => k + 1);
    setReportSuccessVisible(false);
    setOfflineSyncErrorVisible(false);
    setOfflineQueuedVisible(true);
    setActiveTab('reports');
    setOpenReportId(null);
  };

  const authScreen = (
    <ErrorBoundary>
      <Suspense fallback={<LoadingSpinner isDark={isDark} brand />}>
        <AuthScreen
          onAuth={handleAuthWithClear}
          onContinueAsGuest={() => {
            setIsGuest(true);
            storageService.setItem('belediye_is_guest', 'true');
            setActiveTab('home');
            if (!tenant?.id) {
              setPickerMode('onboarding');
            }
          }}
          lang={lang}
          isDark={isDark}
        />
      </Suspense>
    </ErrorBoundary>
  );

  // While splash fades out, paint the next screen underneath (avoids white/blank gap).
  if (!splashHidden) {
    const underSplash =
      splashExiting
        ? (!user && !isGuest
            ? authScreen
            : <LoadingSpinner isDark={isDark} brand />)
        : null;
    return (
      <>
        {underSplash}
        <SplashScreen lang={lang} exiting={splashExiting} />
      </>
    );
  }

  if (!user && !isGuest) {
    return authScreen;
  }

  // Soft loader only — never remount the full splash after dismiss (felt like a hang).
  if ((sessionBooting || routeBooting) && !bootTimedOut) {
    return <LoadingSpinner isDark={isDark} brand />;
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
        <ul className={`mt-4 space-y-2 text-left text-[11px] font-semibold ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
          {[
            pickLang(lang, { tr: 'Konum doğrulama ile resmi kayıt', en: 'Official record with verified location', fil: 'Opisyal na record na may beripikadong lokasyon' }),
            pickLang(lang, { tr: 'Fotoğraflı kanıt ve canlı durum takibi', en: 'Photo evidence and live status tracking', fil: 'Katibayan sa larawan at live na pagsubaybay sa status' }),
            pickLang(lang, { tr: 'Belediyenizden şeffaf güncelleme', en: 'Transparent updates from your municipality', fil: 'Transparent na update mula sa iyong munisipyo' }),
          ].map((line) => (
            <li key={line} className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
              <span>{line}</span>
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={() => {
            setIsGuest(false);
            storageService.removeItem('belediye_is_guest');
          }}
          className="mt-6 w-full rounded-2xl bg-primary py-3 text-xs font-bold text-white shadow-lg shadow-primary/20 hover:brightness-105 active:scale-[0.98] transition-all cursor-pointer font-sans"
        >
          {pickLang(lang, { tr: 'Giriş Yap / Kayıt Ol', en: 'Log In / Register', fil: 'Mag-login / Mag-register' })}
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
          {pickLang(lang, { tr: 'Geri Dön', en: 'Go Back', fil: 'Bumalik' })}
        </button>
      </div>
    </div>
  );

  return (
    <ErrorBoundary>
      <div className={`min-h-app flex justify-center font-sans ${isDark ? 'bg-slate-950 text-white' : 'bg-slate-100 text-slate-900'}`}>
        <div className={`w-full max-w-md flex flex-col h-app relative overflow-hidden sm:border-x sm:shadow-kentiva ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200/80'}`}>
          <OfflineBanner />

        {!openReportId && !openAnnouncement && activeTab !== 'reports' && activeTab !== 'rewards' && !pickerMode && (
          <header className={`px-4 py-3.5 pt-safe z-10 flex justify-between items-center shrink-0 border-b backdrop-blur-md ${isDark ? 'border-slate-800 bg-slate-900/95' : 'border-slate-200/80 bg-white/90'}`}>
            <button
              type="button"
              onClick={() => tenant && setPickerMode('change')}
              className={`flex min-w-0 flex-1 items-center gap-3 text-left rounded-2xl -ml-1 p-1.5 ${tenant ? 'active:bg-slate-100 dark:active:bg-slate-800' : ''}`}
              aria-label={tenant ? t('settings.changeMunicipality', lang) : t('app.name', lang)}
            >
              <div className={`relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl shadow-sm ring-1 ${
                isDark
                  ? 'bg-gradient-to-br from-sky-500/25 to-primary/20 ring-sky-500/30 text-sky-200'
                  : 'bg-gradient-to-br from-sky-50 to-primary/10 ring-primary/15 text-primary'
              }`}>
                {tenant?.logoUrl ? (
                  <img
                    src={resolveMediaUrl(tenant.logoUrl)}
                    alt=""
                    className="h-full w-full object-contain bg-white p-1.5"
                    onError={(event) => { event.currentTarget.style.display = 'none'; }}
                  />
                ) : (
                  <span className="flex h-full w-full flex-col items-center justify-center">
                    <Building2 className="h-5 w-5" strokeWidth={2.25} />
                  </span>
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
            <div className="flex shrink-0 items-center gap-0.5">
            <button
              type="button"
              onClick={() => {
                if (activeTab === 'profile') {
                  goToTab('home');
                } else {
                  goToTab('profile');
                }
              }}
              aria-label={t('tab.profile', lang)}
              className={`relative shrink-0 p-2 rounded-xl transition-colors ${isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'} ${
                activeTab === 'profile' || activeTab === 'settings' || activeTab === 'ranks'
                  ? isDark ? 'bg-slate-800 text-sky-200' : 'bg-primary/10 text-primary'
                  : ''
              }`}
            >
              <User className={`w-5 h-5 ${
                activeTab === 'profile' || activeTab === 'settings'
                  ? ''
                  : isDark ? 'text-slate-300' : 'text-slate-600'
              }`} strokeWidth={activeTab === 'profile' ? 2.5 : 2} />
            </button>
            <button
              type="button"
              onClick={() => {
                if (activeTab === 'notifications') {
                  goToTab('home');
                } else {
                  setActiveTab('notifications');
                }
              }}
              aria-label={
                activeTab === 'notifications'
                  ? (pickLang(lang, { tr: 'Ana sayfaya dön', en: 'Back to home', ar: 'العودة إلى الرئيسية', fil: 'Bumalik sa home' }))
                  : t('notif.title', lang)
              }
              className={`relative shrink-0 p-2 rounded-xl transition-colors ${isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`}
            >
              <Bell className={`w-5 h-5 ${isDark ? 'text-slate-300' : 'text-slate-600'}`} strokeWidth={activeTab === 'notifications' ? 2.5 : 2} />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>
            </div>
          </header>
        )}

        {reportSuccessVisible && !openReportId && !openAnnouncement && (
          <div
            className={`mx-4 mt-3 shrink-0 rounded-2xl border p-4 shadow-sm ${
              isDark
                ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-50'
                : 'border-emerald-200 bg-emerald-50 text-emerald-950'
            }`}
            role="status"
          >
            <div className="flex items-start gap-3">
              <div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                isDark ? 'bg-emerald-400/15 text-emerald-300' : 'bg-emerald-100 text-emerald-700'
              }`}>
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-extrabold tracking-tight">
                  {pickLang(lang, { tr: 'Bildiriminiz alındı', en: 'Report received', ar: 'تم استلام البلاغ', fil: 'Natanggap ang iyong ulat' })}
                </p>
                <p className={`mt-0.5 text-xs font-semibold leading-relaxed ${
                  isDark ? 'text-emerald-100/80' : 'text-emerald-800'
                }`}>
                  {lang === 'tr'
                    ? 'Belediyeniz değerlendirmeye aldı. Durumu adım adım İhbarlarım’dan izleyebilirsiniz.'
                    : lang === 'ar'
                      ? 'بلديتك بدأت المراجعة. تابع الحالة خطوة بخطوة من بلاغاتي.'
                      : 'Your municipality is reviewing it. Track progress step by step in My Reports.'}
                </p>
                <div className={`mt-3 flex items-center gap-1.5 text-[10px] font-bold ${
                  isDark ? 'text-emerald-100/70' : 'text-emerald-700/80'
                }`}>
                  <span className="rounded-lg bg-emerald-600 px-2 py-1 text-white">
                    {pickLang(lang, { tr: '1. Alındı', en: '1. Received', fil: '1. Natanggap' })}
                  </span>
                  <span aria-hidden>→</span>
                  <span className="rounded-lg border border-current/20 px-2 py-1 opacity-80">
                    {pickLang(lang, { tr: '2. İşlem', en: '2. In progress', fil: '2. Isinasagawa' })}
                  </span>
                  <span aria-hidden>→</span>
                  <span className="rounded-lg border border-current/20 px-2 py-1 opacity-80">
                    {pickLang(lang, { tr: '3. Çözüm', en: '3. Resolved', fil: '3. Nalutas' })}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setReportSuccessVisible(false);
                      setActiveTab('reports');
                    }}
                    className={`rounded-xl px-3 py-2 text-xs font-bold transition-colors ${
                      isDark
                        ? 'bg-emerald-400/20 text-emerald-50 hover:bg-emerald-400/30'
                        : 'bg-emerald-700 text-white hover:bg-emerald-800'
                    }`}
                  >
                    {pickLang(lang, { tr: 'Takibe git', en: 'Track report', ar: 'متابعة البلاغ', fil: 'Subaybayan ang ulat' })}
                  </button>
                  <button
                    type="button"
                    onClick={() => setReportSuccessVisible(false)}
                    className={`rounded-xl px-3 py-2 text-xs font-bold transition-colors ${
                      isDark
                        ? 'bg-emerald-400/10 text-emerald-100/80 hover:bg-emerald-400/15'
                        : 'bg-white/80 text-emerald-800 hover:bg-white'
                    }`}
                  >
                    {pickLang(lang, { tr: 'Ana sayfada kal', en: 'Stay on home', fil: 'Manatili sa home' })}
                  </button>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setReportSuccessVisible(false)}
                className={`shrink-0 rounded-xl p-2 transition-colors ${
                  isDark ? 'text-emerald-100/70 hover:bg-emerald-400/10' : 'text-emerald-700 hover:bg-emerald-100'
                }`}
                aria-label={pickLang(lang, { tr: 'Bildirimi kapat', en: 'Dismiss notification', fil: 'Isara ang notification' })}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {offlineQueuedVisible && !openReportId && !openAnnouncement && (
          <div
            className={`mx-4 mt-3 shrink-0 rounded-2xl border p-3 shadow-sm ${
              isDark
                ? 'border-amber-500/30 bg-amber-500/10 text-amber-50'
                : 'border-amber-200 bg-amber-50 text-amber-950'
            }`}
            role="status"
          >
            <div className="flex items-start gap-3">
              <div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                isDark ? 'bg-amber-400/15 text-amber-300' : 'bg-amber-100 text-amber-800'
              }`}>
                <Clock3 className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-extrabold tracking-tight">
                  {pickLang(lang, { tr: 'Gönderilmeyi bekliyor', en: 'Waiting to send', fil: 'Naghihintay na maipadala' })}
                </p>
                <p className={`mt-0.5 text-xs font-semibold leading-relaxed ${
                  isDark ? 'text-amber-100/80' : 'text-amber-800'
                }`}>
                  {lang === 'tr'
                    ? 'İnternet bağlantısı gelince bildiriminiz otomatik gönderilecek.'
                    : 'Your report will be sent automatically when you are back online.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOfflineQueuedVisible(false)}
                className={`shrink-0 rounded-xl p-2 transition-colors ${
                  isDark ? 'text-amber-100/70 hover:bg-amber-400/10' : 'text-amber-800 hover:bg-amber-100'
                }`}
                aria-label={pickLang(lang, { tr: 'Bildirimi kapat', en: 'Dismiss notification', fil: 'Isara ang notification' })}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {offlineSyncErrorVisible && !openReportId && !openAnnouncement && (
          <div
            className={`mx-4 mt-3 shrink-0 rounded-2xl border p-3 shadow-sm ${
              isDark
                ? 'border-red-500/30 bg-red-500/10 text-red-50'
                : 'border-red-200 bg-red-50 text-red-950'
            }`}
            role="alert"
          >
            <div className="flex items-start gap-3">
              <div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                isDark ? 'bg-red-400/15 text-red-300' : 'bg-red-100 text-red-700'
              }`}>
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-extrabold tracking-tight">
                  {pickLang(lang, { tr: 'Çevrimdışı gönderim tamamlanamadı', en: 'Offline sync incomplete', fil: 'Hindi kumpleto ang offline sync' })}
                </p>
                <p className={`mt-0.5 text-xs font-semibold leading-relaxed ${
                  isDark ? 'text-red-100/80' : 'text-red-800'
                }`}>
                  {lang === 'tr'
                    ? 'Bazı bekleyen bildirimler gönderilemedi. Bağlantınız varken tekrar denenecek.'
                    : 'Some queued reports could not be sent. They will be retried when you are online.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOfflineSyncErrorVisible(false)}
                className={`shrink-0 rounded-xl p-2 transition-colors ${
                  isDark ? 'text-red-100/70 hover:bg-red-400/10' : 'text-red-700 hover:bg-red-100'
                }`}
                aria-label={pickLang(lang, { tr: 'Bildirimi kapat', en: 'Dismiss notification', fil: 'Isara ang notification' })}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        <main ref={mainContentRef} className={`flex-1 overflow-y-auto overflow-x-hidden relative ${showBottomNavigation ? 'pb-20' : 'pb-0'} ${isDark ? 'bg-slate-900' : 'bg-slate-50'}`}>
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
                  onCreateReport={() => setActiveTab('report')}
                  onViewMyReports={() => {
                    setActiveTab('reports');
                  }}
                  onOpenAnnouncement={setOpenAnnouncement}
                  onSelectMunicipality={() => setPickerMode('change')}
                  department={department}
                  lang={lang}
                  isDark={isDark}
                  homeMunicipality={tenant}
                  isAuthenticated={Boolean(user)}
                />
              </Fragment>
            )}
            {activeTab === 'kent' && (
              isMuniNotOnboarded ? (
                <NotOnboardedBlockedView lang={lang} isDark={isDark} />
              ) : (
                <BelediyeHubScreen
                  municipality={tenant}
                  department={department}
                  lang={lang}
                  isDark={isDark}
                  onSelectMunicipality={() => setPickerMode('change')}
                />
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
                  pickLang(lang, { tr: 'İhbar Oluşturun', en: 'Create Report', fil: 'Gumawa ng Ulat' }),
                  lang === 'tr'
                    ? 'Yeni bir ihbar kaydı oluşturmak ve durumunu takip etmek için lütfen kayıt olun veya giriş yapın.'
                    : 'Please log in or register to submit reports and track their status.'
                )
              ) : isMuniNotOnboarded ? (
                <NotOnboardedBlockedView lang={lang} isDark={isDark} />
              ) : (
                <NewReport
                  defaultMunicipality={tenant}
                  defaultDepartment={department}
                  onSubmit={handleReportSubmit}
                  onQueuedOffline={handleReportQueuedOffline}
                  onCancel={() => goToTab('home')}
                  lang={lang}
                  isDark={isDark}
                />
              )
            )}
            {activeTab === 'reports' && !openReportId && (
              !user ? (
                renderAuthRequiredView(
                  pickLang(lang, { tr: 'İhbarlarım', en: 'My Reports', fil: 'Mga Ulat Ko' }),
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
                  onCreateReport={() => setActiveTab('report')}
                  lang={lang}
                  isDark={isDark}
                />
              )
            )}
            {activeTab === 'profile' && (
              !user ? (
                renderAuthRequiredView(
                  pickLang(lang, { tr: 'Profilinizi Görüntüleyin', en: 'View Your Profile', fil: 'Tingnan ang Iyong Profile' }),
                  lang === 'tr'
                    ? 'Profil bilgilerinizi düzenlemek ve geçmiş ihbarlarınızı incelemek için giriş yapın.'
                    : 'Log in to edit your profile and review your report history.'
                )
              ) : (
                <Profile
                  onLogout={handleLogoutWithClear}
                  onSettings={() => setActiveTab('settings')}
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
                onBack={() => setActiveTab('kent')}
              />
            )}
            {activeTab === 'rewards' && (
              <RanksScreen
                lang={lang}
                isDark={isDark}
                municipality={tenant}
                initialSegment="rewards"
                onBack={() => setActiveTab('kent')}
              />
            )}
            {activeTab === 'notifications' && (
              !user ? (
                renderAuthRequiredView(
                  pickLang(lang, { tr: 'Bildirimler', en: 'Notifications', fil: 'Mga Notification' }),
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

        {showBottomNavigation && (
          <BottomNavigation activeTab={activeTab} lang={lang} isDark={isDark} onNavigate={goToTab} />
        )}

        {pickerMode && (
          <div
            className={`absolute inset-0 z-[90] flex ${
              pickerMode === 'change' ? 'items-end sm:items-center justify-center bg-slate-950/55 p-0 sm:p-4 backdrop-blur-[2px]' : ''
            }`}
            role="dialog"
            aria-modal="true"
            aria-label={t('tenant.title', lang)}
          >
            {pickerMode === 'change' ? (
              <button
                type="button"
                className="absolute inset-0 cursor-default"
                aria-label={t('settings.back', lang)}
                onClick={() => setPickerMode(null)}
              />
            ) : null}
            <div
              className={`relative z-10 flex flex-col overflow-hidden ${
                pickerMode === 'change'
                  ? `w-full max-h-[92%] rounded-t-[28px] sm:max-h-[85%] sm:max-w-md sm:rounded-3xl shadow-2xl ${
                      isDark ? 'bg-slate-950' : 'bg-white'
                    }`
                  : 'absolute inset-0'
              }`}
            >
              <Suspense fallback={<LoadingSpinner isDark={isDark} />}>
                <MunicipalityPicker
                  lang={lang}
                  isDark={isDark}
                  mode={pickerMode}
                  embedded
                  onSelect={(t) => void handleMunicipalitySelect(t)}
                  onCancel={pickerMode === 'change' ? () => setPickerMode(null) : undefined}
                />
              </Suspense>
            </div>
          </div>
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
                {pickLang(lang, { tr: 'Belediye Değişikliği', en: 'Switch Municipality', fil: 'Palitan ang Munisipyo' })}
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
                  {pickLang(lang, { tr: 'Evet, Geç', en: 'Yes, Switch', fil: 'Oo, Palitan' })}
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
                  {pickLang(lang, { tr: 'Hayır, Kal', en: 'No, Keep', fil: 'Hindi, Panatilihin' })}
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
