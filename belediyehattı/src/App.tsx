import { Fragment, useCallback, useEffect, useRef, useState } from 'react';
import { useEdgeSwipeBack } from './lib/useEdgeSwipeBack';
import { clearStaleApiOverrideIfNeeded } from './lib/apiBase';
import { initNativeShell, registerNativeBackHandler } from './lib/nativeShell';
import { toPublicTenant } from './lib/tenantUtils';
import { Home as HomeIcon, PlusCircle, User, Bell, Building2, Map, Users } from 'lucide-react';
import {
  getSavedUser,
  clearTokens,
  getUnreadCount,
  getMyProfile,
  setPreferredMunicipality,
  AuthUser,
  type ApiAnnouncement,
} from './api';
import { setupCitizenPush } from './lib/pushNotifications';
import { Lang, t } from './i18n';
import { useTenant } from './TenantContext';
import AuthScreen from './components/screens/AuthScreen';
import Home from './components/screens/Home';
import MyReports from './components/screens/MyReports';
import NewReport from './components/screens/NewReport';
import Profile from './components/screens/Profile';
import Notifications from './components/screens/Notifications';
import Settings from './components/screens/Settings';
import ReportDetailScreen from './components/screens/ReportDetailScreen';
import MunicipalityPicker, { type MunicipalityPickerMode } from './components/screens/MunicipalityPicker';
import type { AuthMeta } from './lib/authTypes';

import KentScreen from './components/screens/KentScreen';
import CommunityScreen from './components/screens/CommunityScreen';
import NotificationPrefsModal from './components/screens/NotificationPrefsModal';
import AnnouncementDetailScreen from './components/screens/AnnouncementDetailScreen';

export type Tab =
  | 'home'
  | 'kent'
  | 'topluluk'
  | 'report'
  | 'reports'
  | 'profile'
  | 'notifications'
  | 'settings';

const MAIN_TABS: Tab[] = ['home', 'kent', 'topluluk', 'profile'];

export default function App() {
  const { tenant, setTenant } = useTenant();
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

  useEffect(() => {
    void clearStaleApiOverrideIfNeeded();
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

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
    let cancelled = false;
    setSessionBooting(true);
    (async () => {
      try {
        const p = await getMyProfile();
        const pref = p.preferredMunicipality;
        if (pref?.id && pref.onboarded) {
          if (!cancelled) {
            setTenant(toPublicTenant(pref as Parameters<typeof toPublicTenant>[0]));
            setPickerMode(null);
          }
          return;
        }
        if (!cancelled) {
          setTenant(null);
          setPickerMode('onboarding');
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
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps -- yalnızca oturum açılışında

  useEffect(() => {
    if (user && localStorage.getItem('belediye_notification_prefs_onboarded') !== 'true') {
      const timer = setTimeout(() => {
        setIsPrefsModalOpen(true);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [user]);

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

  const handleMunicipalitySelect = useCallback(
    async (t: Parameters<typeof setTenant>[0]) => {
      if (!t) return;
      setTenant(t);
      setPickerMode(null);
      setKey((k) => k + 1);
      try {
        await setPreferredMunicipality(t.id);
      } catch {
        /* offline — yerel seçim yeterli */
      }
    },
    [setTenant],
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
    setPickerMode(null);
    setActiveTab('home');
  };

  const handleReportSubmit = () => {
    setKey((k) => k + 1);
    setActiveTab('home');
    setOpenReportId(null);
  };

  const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

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
  }, [activeTab, openReportId, openAnnouncement, closeReport, pickerMode]);

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
    return <AuthScreen onAuth={handleAuth} lang={lang} />;
  }

  if (sessionBooting) {
    return (
      <div
        className={`flex min-h-app items-center justify-center ${isDark ? 'bg-slate-950' : 'bg-slate-100'}`}
      >
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (pickerMode) {
    return (
      <MunicipalityPicker
        lang={lang}
        isDark={isDark}
        mode={pickerMode}
        onSelect={(t) => void handleMunicipalitySelect(t)}
        onCancel={pickerMode === 'change' ? () => setPickerMode(null) : undefined}
      />
    );
  }

  return (
    <div className={`min-h-app flex justify-center font-sans ${isDark ? 'bg-slate-950 text-white' : 'bg-slate-100 text-slate-900'}`}>
      <div className={`w-full max-w-md flex flex-col h-app relative overflow-hidden sm:border-x sm:shadow-kentiva ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200/80'}`}>

        {!openReportId && !openAnnouncement && activeTab !== 'reports' && (
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
                  {tenant ? t('settings.municipalityLinked', lang) : t('app.slogan', lang)}
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
                  setNavStack((s) => [...s, 'home'].slice(-8));
                  setActiveTab('reports');
                }}
                onOpenAnnouncement={setOpenAnnouncement}
                onSelectMunicipality={() => setPickerMode('onboarding')}
                onReputationChange={() => setKey((prev) => prev + 1)}
                lang={lang}
                isDark={isDark}
                homeMunicipality={tenant}
              />
            </Fragment>
          )}
          {activeTab === 'kent' && (
            <KentScreen
              municipality={tenant}
              lang={lang}
              isDark={isDark}
              onSelectMunicipality={() => setPickerMode('onboarding')}
            />
          )}
          {activeTab === 'topluluk' && (
            <CommunityScreen municipality={tenant} lang={lang} isDark={isDark} />
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
            <NewReport
              defaultMunicipality={tenant}
              onSubmit={handleReportSubmit}
              onCancel={() => goToTab('home')}
              lang={lang}
              isDark={isDark}
            />
          )}
          {activeTab === 'reports' && !openReportId && (
            <MyReports
              onBack={() => goToTab('home')}
              onOpenReport={openReport}
              lang={lang}
              isDark={isDark}
            />
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
            <Notifications
              onBadgeUpdate={setUnreadCount}
              onOpenReport={openReport}
              lang={lang}
              isDark={isDark}
            />
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
        </main>

        {activeTab !== 'settings' && activeTab !== 'reports' && activeTab !== 'report' && activeTab !== 'notifications' && !openReportId && !openAnnouncement && (
          <nav className={`absolute bottom-0 w-full border-t flex items-end justify-between pb-safe pt-2 px-1 z-20 rounded-t-2xl shadow-[0_-8px_30px_-12px_rgba(15,23,42,0.12)] ${isDark ? 'bg-slate-900/95 border-slate-800 backdrop-blur-md' : 'bg-white/95 border-slate-200/90 backdrop-blur-md'}`}>
            <button
              type="button"
              onClick={() => goToTab('home')}
              className={`flex flex-1 flex-col items-center py-2 min-w-0 transition-colors ${activeTab === 'home' ? 'text-primary' : isDark ? 'text-slate-500' : 'text-slate-400'}`}
            >
              <HomeIcon className="w-5 h-5 mb-0.5" strokeWidth={activeTab === 'home' ? 2.5 : 2} />
              <span className="text-[9px] font-medium truncate max-w-full px-0.5">{t('tab.home', lang)}</span>
            </button>

            <button
              type="button"
              onClick={() => goToTab('kent')}
              className={`flex flex-1 flex-col items-center py-2 min-w-0 transition-colors ${activeTab === 'kent' ? 'text-primary' : isDark ? 'text-slate-500' : 'text-slate-400'}`}
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
              <div className={`p-3.5 rounded-full shadow-lg shadow-primary/30 transition-transform active:scale-95 ${activeTab === 'report' ? 'bg-primary-hover' : 'bg-primary'}`}>
                <PlusCircle className="w-7 h-7 text-white" strokeWidth={2} />
              </div>
            </button>

            <button
              type="button"
              onClick={() => goToTab('topluluk')}
              className={`flex flex-1 flex-col items-center py-2 min-w-0 transition-colors ${activeTab === 'topluluk' ? 'text-primary' : isDark ? 'text-slate-500' : 'text-slate-400'}`}
            >
              <Users className="w-5 h-5 mb-0.5" strokeWidth={activeTab === 'topluluk' ? 2.5 : 2} />
              <span className="text-[9px] font-medium truncate max-w-full px-0.5">{t('tab.community', lang)}</span>
            </button>

            <button
              type="button"
              onClick={() => goToTab('profile')}
              className={`flex flex-1 flex-col items-center py-2 min-w-0 transition-colors ${activeTab === 'profile' ? 'text-primary' : isDark ? 'text-slate-500' : 'text-slate-400'}`}
            >
              <User className="w-5 h-5 mb-0.5" strokeWidth={activeTab === 'profile' ? 2.5 : 2} />
              <span className="text-[9px] font-medium truncate max-w-full px-0.5">{t('tab.profile', lang)}</span>
            </button>
          </nav>
        )}
        <NotificationPrefsModal
          lang={lang}
          isDark={isDark}
          isOpen={isPrefsModalOpen}
          onClose={() => setIsPrefsModalOpen(false)}
        />
      </div>
    </div>
  );
}
