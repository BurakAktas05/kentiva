import { Fragment, useCallback, useEffect, useRef, useState, lazy, Suspense } from 'react';
import { Capacitor } from '@capacitor/core';
import { useEdgeSwipeBack } from './lib/useEdgeSwipeBack';
import { clearStaleApiOverrideIfNeeded } from './lib/apiBase';
import { initNativeShell, registerNativeBackHandler } from './lib/nativeShell';
import { inferMunicipalitySlugFromHostname, municipalityAppUrl } from './lib/tenantHost';
import { toPublicTenant } from './lib/tenantUtils';
import { Home as HomeIcon, PlusCircle, User, Bell, Building2, Map, Users } from 'lucide-react';
import {
  getSavedUser,
  clearTokens,
  getUnreadCount,
  getMyProfile,
  createReport,
  fetchPublicDepartmentContext,
  fetchPublicMunicipalityBySlug,
  setPreferredMunicipality,
  AuthUser,
  type ApiAnnouncement,
} from './api';
import { setupCitizenPush } from './lib/pushNotifications';
import { Lang, t } from './i18n';
import { useTenant } from './TenantContext';
import ErrorBoundary from './components/common/ErrorBoundary';
import type { AuthMeta } from './lib/authTypes';
import type { MunicipalityPickerMode } from './components/screens/MunicipalityPicker';

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
const BusScheduleScreen = lazy(() => import('./components/screens/BusScheduleScreen'));

export type Tab =
  | 'home'
  | 'kent'
  | 'topluluk'
  | 'report'
  | 'reports'
  | 'profile'
  | 'notifications'
  | 'settings'
  | 'bus';

const MAIN_TABS: Tab[] = ['home', 'kent', 'topluluk', 'profile'];

type PublicRouteContext = {
  municipalitySlug: string;
  departmentSlug?: string;
};

function parsePublicRoute(pathname: string, hostname: string): PublicRouteContext | null {
  const parts = pathname.split('/').filter(Boolean);
  const hostMunicipalitySlug = inferMunicipalitySlugFromHostname(hostname);

  if (hostMunicipalitySlug) {
    if (parts[0] === 'departments' && parts[1]) {
      return {
        municipalitySlug: hostMunicipalitySlug,
        departmentSlug: decodeURIComponent(parts[1]),
      };
    }
    return { municipalitySlug: hostMunicipalitySlug };
  }

  if (parts[0] !== 'belediye' || !parts[1]) {
    return null;
  }
  if (parts[2] === 'departments' && parts[3]) {
    return {
      municipalitySlug: decodeURIComponent(parts[1]),
      departmentSlug: decodeURIComponent(parts[3]),
    };
  }
  return { municipalitySlug: decodeURIComponent(parts[1]) };
}

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
      ? 'إدارة المدن الحديثة والبلدية التشاركية المدعومة بالذكاء الاصطناعي.'
      : 'AI-powered modern city management and participatory municipalism.';

  return (
    <div className={`flex flex-col items-center justify-center min-h-app p-5 text-center ${isDark ? 'bg-slate-950 text-white' : 'bg-slate-100 text-slate-900'}`}>
      <div className={`w-full max-w-sm rounded-3xl border p-8 shadow-xl transition-all ${
        isDark ? 'border-slate-800 bg-slate-900' : 'border-slate-200/90 bg-white'
      }`}>
        <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-3xl bg-primary/10 text-primary shadow-inner">
          <Building2 className="h-12 w-12 animate-pulse text-primary" strokeWidth={1.5} />
        </div>
        <h1 className="text-2xl font-bold tracking-tight">{heading}</h1>
        <p className="text-sm font-bold text-primary mt-1">{subtitle}</p>
        <div className={`mt-6 p-4 rounded-2xl border text-xs leading-relaxed font-semibold ${
          isDark ? 'border-slate-800 bg-slate-950/60 text-slate-400' : 'border-slate-100 bg-slate-50 text-slate-500'
        }`}>
          {slogan}
        </div>
        <div className="mt-8 flex justify-center">
          <div className="h-7 w-7 animate-spin rounded-full border-3 border-primary border-t-transparent" />
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
          ? 'border-amber-500/20 bg-slate-900/60 text-slate-150' 
          : 'border-amber-250 bg-white text-slate-800'
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
  const [explicitRoute] = useState<PublicRouteContext | null>(() =>
    parsePublicRoute(window.location.pathname, window.location.hostname),
  );
  const [routeBooting, setRouteBooting] = useState(() =>
    Boolean(parsePublicRoute(window.location.pathname, window.location.hostname)),
  );
  const [activeTab, setActiveTab] = useState<Tab>('home');
  const [navStack, setNavStack] = useState<Tab[]>([]);
  const navStackRef = useRef(navStack);
  navStackRef.current = navStack;
  const [openReportId, setOpenReportId] = useState<string | null>(null);
  const [openAnnouncement, setOpenAnnouncement] = useState<ApiAnnouncement | null>(null);
  const [reportReturnTab, setReportReturnTab] = useState<Tab>('home');
  const [user, setUser] = useState<AuthUser | null>(getSavedUser());
  const [unreadCount, setUnreadCount] = useState(0);
  const [key, setKey] = useState(0);
  const [lang, setLang] = useState<Lang>(() => (localStorage.getItem('belediye_lang') as Lang) || 'tr');
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>(() => (localStorage.getItem('belediye_theme') as any) || 'light');
  const [pickerMode, setPickerMode] = useState<MunicipalityPickerMode | null>(null);
  const [sessionBooting, setSessionBooting] = useState(() => Boolean(getSavedUser()));
  const [isPrefsModalOpen, setIsPrefsModalOpen] = useState(false);
  const [isIntroModalOpen, setIsIntroModalOpen] = useState(false);
  
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
    if (!explicitRoute) {
      setRouteBooting(false);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        if (explicitRoute.departmentSlug) {
          const resolvedDepartment = await fetchPublicDepartmentContext(
            explicitRoute.municipalitySlug,
            explicitRoute.departmentSlug,
          );
          const resolvedTenant = await fetchPublicMunicipalityBySlug(explicitRoute.municipalitySlug);
          if (!cancelled) {
            setTenant(toPublicTenant(resolvedTenant));
            setDepartment(resolvedDepartment);
            setPickerMode(null);
          }
          return;
        }

        const resolvedTenant = await fetchPublicMunicipalityBySlug(explicitRoute.municipalitySlug);
        if (!cancelled) {
          setTenant(toPublicTenant(resolvedTenant));
          setDepartment(null);
          setPickerMode(null);
        }
      } catch {
        if (!cancelled) {
          setDepartment(null);
        }
      } finally {
        if (!cancelled) {
          setRouteBooting(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [explicitRoute, setDepartment, setTenant]);

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

  useEffect(() => { localStorage.setItem('belediye_lang', lang); }, [lang]);
  useEffect(() => { localStorage.setItem('belediye_theme', theme); }, [theme]);

  /** Giriş sonrası profilden belediye yükle; yoksa seçim ekranı. */
  useEffect(() => {
    if (!user) {
      setSessionBooting(false);
      return;
    }
    if (explicitRoute && routeBooting) {
      return;
    }
    if (explicitRoute && tenant?.id) {
      setSessionBooting(false);
      return;
    }
    let cancelled = false;
    setSessionBooting(true);
    (async () => {
      try {
        const p = await getMyProfile();
        const pref = p.preferredMunicipality;
        if (pref?.id) {
          if (!cancelled) {
            setTenant(toPublicTenant(pref as Parameters<typeof toPublicTenant>[0]));
            setPickerMode(null);
          }
          return;
        }
        if (!cancelled) {
          if (!tenant?.id) {
            setTenant(null);
            setPickerMode('onboarding');
          }
        }
      } catch {
        if (!cancelled) {
          if (!tenant?.id) setPickerMode('onboarding');
        }
      } finally {
        if (!cancelled) setSessionBooting(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [explicitRoute, routeBooting, user]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (user && localStorage.getItem('belediye_welcome_onboarded') !== 'true') {
      setIsIntroModalOpen(true);
    }
  }, [user]);

  useEffect(() => {
    if (
      user &&
      localStorage.getItem('belediye_welcome_onboarded') === 'true' &&
      localStorage.getItem('belediye_notification_prefs_onboarded') !== 'true' &&
      !isIntroModalOpen
    ) {
      const timer = setTimeout(() => {
        setIsPrefsModalOpen(true);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [user, isIntroModalOpen]);

  useEffect(() => {
    if (user) {
      loadUnreadCount();
      const interval = setInterval(loadUnreadCount, 30000);

      const teardownPush = setupCitizenPush((reportId) => {
        setReportReturnTab('home');
        setOpenReportId(reportId);
        setActiveTab('home');
      });

      return () => {
        clearInterval(interval);
        teardownPush();
      };
    }
  }, [user]);

  const loadUnreadCount = async () => {
    try { setUnreadCount(await getUnreadCount()); } catch { /* ignore */ }
  };

  useEffect(() => {
    const syncOfflineReports = async () => {
      const raw = localStorage.getItem('belediye_offline_reports');
      if (!raw) return;
      const queue = JSON.parse(raw) as Array<{
        title: string; description: string; categoryId: string;
        latitude: number; longitude: number; district: string | null;
        mediaUrl: string | null; targetMunicipalityId: string | null;
        kvkkApproved: boolean; savedAt: string;
      }>;
      if (queue.length === 0) return;

      const remaining = [...queue];
      let synced = 0;
      for (let i = 0; i < queue.length; i++) {
        const r = queue[i];
        try {
          await createReport(
            r.title, r.description, r.categoryId,
            r.latitude, r.longitude, r.district ?? undefined,
            r.mediaUrl ? [r.mediaUrl] : [], r.targetMunicipalityId, r.kvkkApproved,
          );
          remaining.splice(remaining.indexOf(r), 1);
          synced++;
        } catch {
          // Keep in queue for next attempt
        }
      }
      localStorage.setItem('belediye_offline_reports', JSON.stringify(remaining));
      if (synced > 0) {
        console.log(`[Kentiva] ${synced} offline rapor başarıyla gönderildi.`);
      }
    };

    const handler = () => { void syncOfflineReports(); };
    window.addEventListener('online', handler);
    // Also try on mount in case we're already online with pending reports
    if (navigator.onLine) handler();
    return () => window.removeEventListener('online', handler);
  }, []);

  const handleMunicipalitySelect = useCallback(
    async (t: Parameters<typeof setTenant>[0]) => {
      if (!t) return;
      setTenant(t);
      setDepartment(null);
      setPickerMode(null);
      setKey((k) => k + 1);
      const targetUrl = t.slug ? municipalityAppUrl(t.slug, '/') : null;
      const currentHostSlug = inferMunicipalitySlugFromHostname(window.location.hostname);
      if (!Capacitor.isNativePlatform() && targetUrl && currentHostSlug !== t.slug) {
        window.location.replace(targetUrl);
        return;
      }
      try {
        await setPreferredMunicipality(t.id);
      } catch {
        /* offline — yerel seçim yeterli */
      }
    },
    [setDepartment, setTenant],
  );

  const handleAuth = (authUser: AuthUser, meta?: AuthMeta) => {
    setUser(authUser);
    setActiveTab('home');
    if (meta?.isNewUser) {
      setTenant(null);
      setPickerMode('onboarding');
    }
  };

  const handleLogout = () => {
    clearTokens();
    setUser(null);
    setTenant(null);
    setDepartment(null);
    setPickerMode(null);
    setActiveTab('home');
  };

  const handleReportSubmit = () => {
    setKey((k) => k + 1);
    setActiveTab('home');
    setOpenReportId(null);
  };

  useEffect(() => {
    if (routeBooting) return;

    const currentHostSlug = inferMunicipalitySlugFromHostname(window.location.hostname);

    if (tenant?.slug && currentHostSlug === tenant.slug) {
      const nextHostPath = department?.slug ? `/departments/${department.slug}` : '/';
      if (window.location.pathname !== nextHostPath) {
        window.history.replaceState({}, '', nextHostPath);
      }
      return;
    }

    if (!Capacitor.isNativePlatform() && tenant?.slug) {
      const nextSubdomainUrl = municipalityAppUrl(
        tenant.slug,
        department?.slug ? `/departments/${department.slug}` : '/',
      );
      if (nextSubdomainUrl && window.location.pathname.startsWith('/belediye/')) {
        window.location.replace(nextSubdomainUrl);
        return;
      }
    }

    const nextPath = tenant?.slug
      ? department?.slug
        ? `/belediye/${tenant.slug}/departments/${department.slug}`
        : `/belediye/${tenant.slug}`
      : '/';

    if (window.location.pathname !== nextPath) {
      window.history.replaceState({}, '', nextPath);
    }
  }, [department?.slug, routeBooting, tenant?.slug]);

  useEffect(() => {
    void initNativeShell(isDark);
  }, [isDark]);

  const openReport = useCallback((id: string) => {
    setReportReturnTab(activeTab);
    setOpenReportId(id);
  }, [activeTab]);

  const closeReport = useCallback(() => {
    setOpenReportId(null);
    setActiveTab(reportReturnTab);
    setKey((k) => k + 1);
  }, [reportReturnTab]);

  const goToTab = useCallback((tab: Tab) => {
    setActiveTab((current) => {
      if (current === tab) return current;
      if (MAIN_TABS.includes(current) && MAIN_TABS.includes(tab)) {
        setNavStack((stack) => [...stack, current].slice(-8));
      }
      return tab;
    });
  }, []);

  const popNavigation = useCallback((): boolean => {
    if (isIntroModalOpen) {
      setIsIntroModalOpen(false);
      return true;
    }
    if (isPrefsModalOpen) {
      setIsPrefsModalOpen(false);
      return true;
    }
    if (pickerMode === 'change') {
      setPickerMode(null);
      return true;
    }
    if (openAnnouncement) {
      setOpenAnnouncement(null);
      return true;
    }
    if (openReportId) {
      closeReport();
      return true;
    }
    if (activeTab === 'settings') {
      setActiveTab('profile');
      return true;
    }
    if (activeTab === 'bus') {
      setActiveTab('kent');
      return true;
    }
    if (activeTab === 'report' || activeTab === 'notifications' || activeTab === 'reports') {
      setNavStack([]);
      setActiveTab('home');
      return true;
    }
    const stack = navStackRef.current;
    if (stack.length > 0) {
      const prev = stack[stack.length - 1];
      setNavStack((s) => s.slice(0, -1));
      setActiveTab(prev);
      return true;
    }
    if (activeTab !== 'home' && MAIN_TABS.includes(activeTab)) {
      setActiveTab('home');
      return true;
    }
    return false;
  }, [activeTab, openReportId, openAnnouncement, closeReport, pickerMode, isPrefsModalOpen]);

  const handleNativeBack = popNavigation;

  useEffect(() => registerNativeBackHandler(handleNativeBack), [handleNativeBack]);

  useEdgeSwipeBack({
    enabled:
      Boolean(user) &&
      !pickerMode &&
      !openAnnouncement &&
      !openReportId &&
      activeTab !== 'report' &&
      activeTab !== 'settings',
    onBack: popNavigation,
  });

  if (!user) {
    return (
      <ErrorBoundary>
        <Suspense fallback={<LoadingSpinner isDark={isDark} />}>
          <AuthScreen onAuth={handleAuth} lang={lang} />
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

  return (
    <ErrorBoundary>
      <div className={`min-h-app flex justify-center font-sans ${isDark ? 'bg-slate-950 text-white' : 'bg-slate-100 text-slate-900'}`}>
        <div className={`w-full max-w-md flex flex-col h-app relative overflow-hidden sm:border-x sm:shadow-kentiva ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200/80'}`}>

        {!openReportId && !openAnnouncement && activeTab !== 'reports' && activeTab !== 'bus' && (
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
                setNavStack((s) => [...s, activeTab].slice(-8));
                setActiveTab('notifications');
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
                lang={lang}
                isDark={isDark}
                onClose={() => setOpenAnnouncement(null)}
              />
            )}
            {activeTab === 'home' && !openReportId && !openAnnouncement && (
              <Fragment key={key}>
                <Home
                  onViewMyReports={() => {
                    setNavStack((s) => [...s, 'home' as Tab].slice(-8));
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
                  onOpenBusSchedules={() => setActiveTab('bus')}
                />
              )
            )}
            {activeTab === 'bus' && (
              isMuniNotOnboarded ? (
                <NotOnboardedBlockedView lang={lang} isDark={isDark} />
              ) : (
                <BusScheduleScreen
                  lang={lang}
                  isDark={isDark}
                  municipality={tenant}
                  onBack={() => setActiveTab('kent')}
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
              isMuniNotOnboarded ? (
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
              isMuniNotOnboarded ? (
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
              <Profile
                onLogout={handleLogout}
                onSettings={() => setActiveTab('settings')}
                onChangeMunicipality={() => setPickerMode('change')}
                municipality={tenant}
                lang={lang}
                isDark={isDark}
              />
            )}
            {activeTab === 'notifications' && (
              isMuniNotOnboarded ? (
                <NotOnboardedBlockedView lang={lang} isDark={isDark} />
              ) : (
                <Notifications
                  onBadgeUpdate={setUnreadCount}
                  onOpenReport={openReport}
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
              />
            )}
          </Suspense>
        </main>

        {activeTab !== 'settings' && activeTab !== 'reports' && activeTab !== 'report' && activeTab !== 'notifications' && !openReportId && !openAnnouncement && activeTab !== 'bus' && (
          <nav className={`absolute bottom-0 w-full border-t flex items-end justify-between pb-safe pt-2 px-1 z-20 rounded-t-2xl shadow-[0_-8px_30px_-12px_rgba(15,23,42,0.12)] ${isDark ? 'bg-slate-900/95 border-slate-800 backdrop-blur-md' : 'bg-white/95 border-slate-200/90 backdrop-blur-md'}`}>
            <button
              type="button"
              onClick={() => goToTab('home')}
              className={`flex flex-1 flex-col items-center py-2 min-w-0 transition-colors ${activeTab === 'home' ? 'text-primary' : isDark ? 'text-slate-400' : 'text-slate-500'}`}
            >
              <HomeIcon className="w-5 h-5 mb-0.5" strokeWidth={activeTab === 'home' ? 2.5 : 2} />
              <span className="text-[9px] font-medium truncate max-w-full px-0.5">{t('tab.home', lang)}</span>
            </button>

            <button
              type="button"
              onClick={() => goToTab('kent')}
              className={`flex flex-1 flex-col items-center py-2 min-w-0 transition-colors ${activeTab === 'kent' ? 'text-primary' : isDark ? 'text-slate-400' : 'text-slate-500'}`}
            >
              <Map className="w-5 h-5 mb-0.5" strokeWidth={activeTab === 'kent' ? 2.5 : 2} />
              <span className="text-[9px] font-medium truncate max-w-full px-0.5">{t('tab.kent', lang)}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setNavStack((s) => (MAIN_TABS.includes(activeTab) ? [...s, activeTab] : s).slice(-8));
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
              <span className="text-[9px] font-medium truncate max-w-full px-0.5">{t('tab.community', lang)}</span>
            </button>

            <button
              type="button"
              onClick={() => goToTab('profile')}
              className={`flex flex-1 flex-col items-center py-2 min-w-0 transition-colors ${activeTab === 'profile' ? 'text-primary' : isDark ? 'text-slate-400' : 'text-slate-500'}`}
            >
              <User className="w-5 h-5 mb-0.5" strokeWidth={activeTab === 'profile' ? 2.5 : 2} />
              <span className="text-[9px] font-medium truncate max-w-full px-0.5">{t('tab.profile', lang)}</span>
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
      </div>
    </div>
    </ErrorBoundary>
  );
}
