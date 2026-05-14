import { Fragment, useEffect, useState } from 'react';
import { Home as HomeIcon, PlusCircle, User, Bell, Building2 } from 'lucide-react';
import { getSavedUser, clearTokens, getUnreadCount, AuthUser, updateFcmToken } from './api';
import { Lang, t } from './i18n';
import { useTenant } from './TenantContext';
import { PushNotifications } from '@capacitor/push-notifications';
import AuthScreen from './components/screens/AuthScreen';
import Home from './components/screens/Home';
import NewReport from './components/screens/NewReport';
import Profile from './components/screens/Profile';
import Notifications from './components/screens/Notifications';
import Settings from './components/screens/Settings';
import MunicipalityPicker from './components/screens/MunicipalityPicker';
import ReportDetailScreen from './components/screens/ReportDetailScreen';

export type Tab = 'home' | 'report' | 'profile' | 'notifications' | 'settings';

export default function App() {
  const { tenant, setTenant } = useTenant();
  const [activeTab, setActiveTab] = useState<Tab>('home');
  const [openReportId, setOpenReportId] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(getSavedUser());
  const [unreadCount, setUnreadCount] = useState(0);
  const [key, setKey] = useState(0);
  const [lang, setLang] = useState<Lang>(() => (localStorage.getItem('belediye_lang') as Lang) || 'tr');
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>(() => (localStorage.getItem('belediye_theme') as any) || 'light');

  // Apply theme
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  // Apply RTL for Arabic
  useEffect(() => {
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
  }, [lang]);

  // Save preferences
  useEffect(() => { localStorage.setItem('belediye_lang', lang); }, [lang]);
  useEffect(() => { localStorage.setItem('belediye_theme', theme); }, [theme]);

  useEffect(() => {
    if (user) {
      loadUnreadCount();
      const interval = setInterval(loadUnreadCount, 30000);
      
      // Request Push Notifications permissions and register
      PushNotifications.requestPermissions().then((result) => {
        if (result.receive === 'granted') {
          PushNotifications.register();
        }
      });

      const pushListener = PushNotifications.addListener('registration', (token) => {
        updateFcmToken(token.value).catch(console.error);
      });

      return () => {
        clearInterval(interval);
        pushListener.then(l => l.remove()).catch(() => {});
      };
    }
  }, [user]);

  const loadUnreadCount = async () => {
    try { setUnreadCount(await getUnreadCount()); } catch { /* ignore */ }
  };

  const handleAuth = (authUser: AuthUser) => {
    setUser(authUser);
    setActiveTab('home');
  };

  const handleLogout = () => {
    clearTokens();
    setTenant(null);
    setUser(null);
    setActiveTab('home');
  };

  const handleReportSubmit = () => {
    setKey(k => k + 1);
    setActiveTab('home');
    setOpenReportId(null);
  };

  const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  if (!user) {
    return <AuthScreen onAuth={handleAuth} lang={lang} />;
  }

  if (!tenant) {
    return (
      <div className={`min-h-screen flex justify-center font-sans ${isDark ? 'bg-slate-950 text-white' : 'bg-slate-100 text-slate-900'}`}>
        <div className={`w-full max-w-md flex flex-col h-screen relative overflow-hidden sm:border-x sm:shadow-kentiva ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200/80'}`}>
          <MunicipalityPicker lang={lang} isDark={isDark} onSelect={setTenant} />
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen flex justify-center font-sans ${isDark ? 'bg-slate-950 text-white' : 'bg-slate-100 text-slate-900'}`}>
      <div className={`w-full max-w-md flex flex-col h-screen relative overflow-hidden sm:border-x sm:shadow-kentiva ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200/80'}`}>
        
        {/* Header */}
        <header className={`px-4 py-3.5 z-10 flex justify-between items-center shrink-0 border-b backdrop-blur-md ${isDark ? 'border-slate-800 bg-slate-900/95' : 'border-slate-200/80 bg-white/90'}`}>
          <div className="flex items-center gap-2.5">
            {tenant?.logoUrl ? (
              <img src={tenant.logoUrl} alt="" className="w-9 h-9 rounded-lg object-contain bg-white" />
            ) : (
              <div className="w-9 h-9 rounded-lg bg-primary/15 flex items-center justify-center text-primary">
                <Building2 className="w-5 h-5" />
              </div>
            )}
            <div>
              <h1 className={`text-base font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-800'}`}>
                {tenant?.displayName || t('app.name', lang)}
              </h1>
              <p className={`text-[10px] font-medium tracking-wide ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                {tenant?.slogan || t('app.slogan', lang)}
              </p>
            </div>
          </div>
          <button 
            onClick={() => setActiveTab('notifications')}
            className={`relative p-2 rounded-xl transition-colors ${isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`}
          >
            <Bell className={`w-5 h-5 ${isDark ? 'text-slate-300' : 'text-slate-600'}`} strokeWidth={activeTab === 'notifications' ? 2.5 : 2} />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>
        </header>

        {/* Content */}
        <main className={`flex-1 overflow-y-auto overflow-x-hidden relative pb-20 ${isDark ? 'bg-slate-900' : 'bg-slate-50'}`}>
          {activeTab === 'home' && (
            <Fragment key={key}>
              <Home
                onNavigate={setActiveTab}
                onOpenReport={(id) => setOpenReportId(id)}
                lang={lang}
                isDark={isDark}
              />
            </Fragment>
          )}
          {openReportId && (
            <ReportDetailScreen
              reportId={openReportId}
              lang={lang}
              isDark={isDark}
              onClose={() => {
                setOpenReportId(null);
                setKey((k) => k + 1);
              }}
            />
          )}
          {activeTab === 'report' && <NewReport onSubmit={handleReportSubmit} onCancel={() => setActiveTab('home')} lang={lang} isDark={isDark} />}
          {activeTab === 'profile' && <Profile onLogout={handleLogout} onSettings={() => setActiveTab('settings')} lang={lang} isDark={isDark} />}
          {activeTab === 'notifications' && <Notifications onBadgeUpdate={setUnreadCount} lang={lang} isDark={isDark} />}
          {activeTab === 'settings' && (
            <Settings
              lang={lang}
              theme={theme}
              onLangChange={setLang}
              onThemeChange={setTheme}
              onBack={() => setActiveTab('profile')}
              onChangeMunicipality={() => setTenant(null)}
            />
          )}
        </main>

        {/* Bottom Nav */}
        {activeTab !== 'settings' && !openReportId && (
          <nav className={`absolute bottom-0 w-full border-t flex justify-around items-center pb-safe pt-2.5 px-2 z-20 rounded-t-2xl shadow-[0_-8px_30px_-12px_rgba(15,23,42,0.12)] ${isDark ? 'bg-slate-900/95 border-slate-800 backdrop-blur-md' : 'bg-white/95 border-slate-200/90 backdrop-blur-md'}`}>
            <button 
              onClick={() => setActiveTab('home')}
              className={`flex flex-col items-center p-3 w-20 transition-colors ${activeTab === 'home' ? 'text-primary' : isDark ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <HomeIcon className="w-6 h-6 mb-1" strokeWidth={activeTab === 'home' ? 2.5 : 2} />
              <span className="text-[10px] font-medium">{t('tab.feed', lang)}</span>
            </button>
            
            <button onClick={() => setActiveTab('report')} className="flex flex-col items-center justify-center -mt-8 mb-2">
              <div className={`p-4 rounded-full shadow-lg shadow-primary/30 transition-transform active:scale-95 ${activeTab === 'report' ? 'bg-primary-hover' : 'bg-primary'}`}>
                <PlusCircle className="w-8 h-8 text-white" strokeWidth={2} />
              </div>
            </button>
            
            <button 
              onClick={() => setActiveTab('profile')}
              className={`flex flex-col items-center p-3 w-20 transition-colors ${activeTab === 'profile' ? 'text-primary' : isDark ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <User className="w-6 h-6 mb-1" strokeWidth={activeTab === 'profile' ? 2.5 : 2} />
              <span className="text-[10px] font-medium">{t('tab.profile', lang)}</span>
            </button>
          </nav>
        )}
      </div>
    </div>
  );
}
