import React, { useState, useEffect, lazy, Suspense, useCallback, useRef, useMemo } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  Users,
  LogOut,
  Bell,
  Search,
  Menu,
  Building2,
  PieChart,
  Download,
  CalendarClock,
  CheckCircle2,
  Clock,
  AlertCircle,
  AlertTriangle,
  TrendingUp,
  Settings as SettingsIcon,
  MapPinned,
  ArrowRight,
  Shield,
  Sparkles,
  Megaphone,
  BarChart3,
  X,
  MessageSquare,
  Gift,
  ClipboardPlus,
  Briefcase,
  Cpu,
  ChevronDown,
  UserCheck,
  ShieldAlert,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api, { clearAuthStorage, getStoredAccessToken, type PredictiveInsight, type Stats } from './api';
import { LanguageProvider, useTranslation, type Language } from './context/LanguageContext';
import { downloadBlobResponse } from './lib/downloadExport';
import DashboardLoadingSkeleton from './components/DashboardLoadingSkeleton';
import { reportStatusBadgeClass } from './lib/ui';
import { reportStatusLabel } from './lib/reportUtils';
import { ReportLiveProvider, useReportLive } from './context/ReportLiveContext';
import LoginPage, { LoginLandingPage } from './pages/LoginPage';
import ErrorBoundary from './components/ErrorBoundary';
import Toast from './components/ui/Toast';
import {
  buildPortalUser,
  isFieldOfficerOnly,
  isPlatformSuperAdmin,
  loginPathForCurrentHost,
  loginPathForPortal,
  loginPathForUser,
  portalForHostname,
  portalRoleLabel,
  type AuthenticatedPortalUser,
} from './lib/auth';

const LiveMap = lazy(() => import('./LiveMap'));
const ReportsPage = lazy(() => import('./pages/ReportsPage'));
const ReportDetailPage = lazy(() => import('./pages/ReportDetailPage'));
const StatisticsPage = lazy(() => import('./pages/StatisticsPage'));
const DepartmentsPage = lazy(() => import('./pages/DepartmentsPage'));
const UsersPage = lazy(() => import('./pages/UsersPage'));
const MunicipalitySettingsPage = lazy(() => import('./pages/MunicipalitySettingsPage'));
const MunicipalityNotificationTemplatesPage = lazy(() => import('./pages/MunicipalityNotificationTemplatesPage'));
const SuperAdminMunicipalitiesPage = lazy(() => import('./pages/SuperAdminMunicipalitiesPage'));
const SuperAdminMunicipalityBrandingPage = lazy(() => import('./pages/SuperAdminMunicipalityBrandingPage'));
const MunicipalityOnboardingPage = lazy(() => import('./pages/MunicipalityOnboardingPage'));
const AuditLogsPage = lazy(() => import('./pages/AuditLogsPage'));
const SetupPage = lazy(() => import('./pages/SetupPage'));
const SuperAdminHomePage = lazy(() => import('./pages/SuperAdminHomePage'));
const AnnouncementsPage = lazy(() => import('./pages/AnnouncementsPage'));
const SurveysPage = lazy(() => import('./pages/SurveysPage'));
const SystemFeedbackPage = lazy(() => import('./pages/SystemFeedbackPage'));
const EventsAndOutagesPage = lazy(() => import('./pages/EventsAndOutagesPage'));
const SuperAdminRecentReportsPage = lazy(() => import('./pages/SuperAdminRecentReportsPage'));
const RewardsPage = lazy(() => import('./pages/RewardsPage'));
const ScheduledExportsPage = lazy(() => import('./pages/ScheduledExportsPage'));
const PilotSuccessPage = lazy(() => import('./pages/PilotSuccessPage'));
const WhiteDeskReportPage = lazy(() => import('./pages/WhiteDeskReportPage'));
const MarketingKitPage = lazy(() => import('./pages/MarketingKitPage'));
const PricingPage = lazy(() => import('./pages/PricingPage'));
const ExecutiveDashboardPage = lazy(() => import('./pages/ExecutiveDashboardPage'));
const SuperAdminApiTrackerPage = lazy(() => import('./pages/SuperAdminApiTrackerPage'));

const PageFallback = () => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    className="flex min-h-[40vh] items-center justify-center p-6"
  >
    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Sayfa yükleniyor…</p>
  </motion.div>
);

const MapFallback = () => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    className="flex h-[420px] items-center justify-center rounded-xl bg-slate-50 dark:bg-slate-800/50"
  >
    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Harita yükleniyor…</p>
  </motion.div>
);

const UnauthorizedPage = () => (
  <motion.div
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-6 text-center"
  >
    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-rose-50 text-rose-500 dark:bg-rose-500/10">
      <ShieldAlert size={28} aria-hidden="true" />
    </div>
    <div>
      <h1 className="text-lg font-bold text-slate-900 dark:text-white">Bu sayfaya yetkiniz yok</h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Bu içeriği görüntülemek için gerekli yetkiye sahip değilsiniz.
      </p>
    </div>
    <Link
      to="/"
      className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-primary/90"
    >
      Ana sayfaya dön
    </Link>
  </motion.div>
);

const ProtectedRoute = ({
  user,
  allow,
  children,
}: {
  user: AuthenticatedPortalUser;
  allow: (u: AuthenticatedPortalUser) => boolean;
  children: React.ReactNode;
}) => (allow(user) ? <>{children}</> : <UnauthorizedPage />);

// --- Components ---
const Sidebar = ({
  isOpen,
  setOpen,
  user,
}: {
  isOpen: boolean;
  setOpen: (o: boolean) => void;
  user: AuthenticatedPortalUser;
}) => {
  const location = useLocation();
  const { newCount: liveNewReports } = useReportLive();
  const { t } = useTranslation();
  const [advancedOpen, setAdvancedOpen] = useState(false);

  type MenuItem = { name: string; icon: typeof LayoutDashboard; path: string };
  type MenuGroup = { title: string; items: MenuItem[]; collapsible?: boolean };

  const menuGroups: MenuGroup[] = isPlatformSuperAdmin(user)
    ? [
        {
          title: t('platform_management'),
          items: [
            { name: t('dashboard'), icon: LayoutDashboard, path: '/' },
            { name: t('recent_reports'), icon: FileText, path: '/admin/recent-reports' },
            { name: t('onboarding'), icon: Sparkles, path: '/admin/onboarding' },
            { name: t('municipalities'), icon: MapPinned, path: '/admin/municipalities' },
            { name: t('api_tracker') || 'API Takibi', icon: Cpu, path: '/admin/api-tracker' },
            { name: t('feedback'), icon: MessageSquare, path: '/system-feedback' },
            { name: t('audit_logs'), icon: Shield, path: '/audit-logs' },
          ]
        }
      ]
    : (() => {
        const canManagePr = user.roles.some((r) => ['ROLE_ADMIN', 'ROLE_DEPT_MANAGER'].includes(r));
        const canManageOrg =
          user.roles.some((r) => ['ROLE_ADMIN', 'ROLE_DEPT_MANAGER'].includes(r)) && Boolean(user.municipality);
        const isMunicipalityAdmin = user.roles.includes('ROLE_ADMIN') && Boolean(user.municipality);
        const isFieldOfficer = user.roles.includes('ROLE_FIELD_OFFICER');
        const isWhiteDesk = user.roles.includes('ROLE_WHITE_DESK');
        const canWhiteDesk =
          user.roles.some((r) => ['ROLE_WHITE_DESK', 'ROLE_DEPT_MANAGER', 'ROLE_ADMIN'].includes(r)) &&
          Boolean(user.municipality);

        // FIELD_OFFICER: dashboard + reports + stats only
        if (isFieldOfficer && !canManagePr && !isWhiteDesk) {
          return [
            {
              title: t('overview_group'),
              items: [
                { name: t('dashboard'), icon: LayoutDashboard, path: '/' },
                { name: t('reports'), icon: FileText, path: '/reports' },
                { name: t('stats'), icon: PieChart, path: '/stats' },
              ],
            },
          ];
        }

        // WHITE_DESK (without admin/dept manager)
        if (isWhiteDesk && !canManagePr) {
          const items: MenuItem[] = [
            { name: t('dashboard'), icon: LayoutDashboard, path: '/' },
            { name: t('reports'), icon: FileText, path: '/reports' },
          ];
          if (canWhiteDesk) {
            items.push({ name: t('white_desk_entry'), icon: ClipboardPlus, path: '/reports/new-white-desk' });
          }
          items.push({ name: t('stats'), icon: PieChart, path: '/stats' });
          return [{ title: t('overview_group'), items }];
        }

        // ROLE_ADMIN municipality — primary IA
        if (isMunicipalityAdmin) {
          const genelItems: MenuItem[] = [
            { name: t('dashboard'), icon: LayoutDashboard, path: '/' },
            { name: t('reports'), icon: FileText, path: '/reports' },
          ];
          if (canWhiteDesk) {
            genelItems.push({ name: t('white_desk_entry'), icon: ClipboardPlus, path: '/reports/new-white-desk' });
          }
          genelItems.push({ name: t('stats'), icon: PieChart, path: '/stats' });

          const groups: MenuGroup[] = [
            { title: t('overview_group'), items: genelItems },
            {
              title: t('org_group'),
              items: [
                { name: t('staff'), icon: Users, path: '/staff' },
                { name: t('departments'), icon: Building2, path: '/departments' },
              ],
            },
            {
              title: t('pr_group'),
              items: [
                { name: t('announcements'), icon: Megaphone, path: '/announcements' },
                { name: t('events_outages'), icon: CalendarClock, path: '/events-outages' },
                { name: t('surveys'), icon: BarChart3, path: '/surveys' },
              ],
            },
            {
              title: t('system_group'),
              items: [
                { name: t('municipality_settings'), icon: SettingsIcon, path: '/municipality-settings' },
                { name: t('audit_logs'), icon: Shield, path: '/audit-logs' },
              ],
            },
            {
              title: t('advanced_group'),
              collapsible: true,
              items: [
                { name: t('pilot_success'), icon: TrendingUp, path: '/pilot' },
                { name: t('executive_dashboard'), icon: Briefcase, path: '/executive' },
                { name: t('rewards'), icon: Gift, path: '/rewards' },
                { name: t('scheduled_exports') || 'Planlı Dışa Aktarma', icon: Download, path: '/scheduled-exports' },
                { name: t('pricing'), icon: Sparkles, path: '/pricing' },
                { name: t('marketing_kit'), icon: Megaphone, path: '/marketing-kit' },
              ],
            },
          ];
          return groups;
        }

        // DEPT_MANAGER and other municipality staff
        const genelItems: MenuItem[] = [
          { name: t('dashboard'), icon: LayoutDashboard, path: '/' },
          { name: t('reports'), icon: FileText, path: '/reports' },
        ];
        if (canWhiteDesk) {
          genelItems.push({ name: t('white_desk_entry'), icon: ClipboardPlus, path: '/reports/new-white-desk' });
        }
        genelItems.push({ name: t('stats'), icon: PieChart, path: '/stats' });

        const groups: MenuGroup[] = [{ title: t('overview_group'), items: genelItems }];
        if (canManagePr) {
          groups.push({
            title: t('pr_group'),
            items: [
              { name: t('announcements'), icon: Megaphone, path: '/announcements' },
              { name: t('events_outages'), icon: CalendarClock, path: '/events-outages' },
              { name: t('surveys'), icon: BarChart3, path: '/surveys' },
            ],
          });
        }
        if (canManageOrg) {
          groups.push({
            title: t('org_group'),
            items: [
              { name: t('staff'), icon: Users, path: '/staff' },
              { name: t('departments'), icon: Building2, path: '/departments' },
            ],
          });
        }
        return groups;
      })();

  const advancedActive = menuGroups.some(
    (g) =>
      g.collapsible &&
      g.items.some((item) => location.pathname === item.path || location.pathname.startsWith(`${item.path}/`)),
  );

  useEffect(() => {
    if (advancedActive) setAdvancedOpen(true);
  }, [advancedActive]);

  return (
    <aside className={`fixed inset-y-0 left-0 z-50 w-72 border-r border-slate-200/70 bg-white/95 shadow-[12px_0_40px_-30px_rgba(15,23,42,0.35)] backdrop-blur-xl transition-transform duration-200 dark:border-slate-800 dark:bg-slate-950/95 transform ${isOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}>
      <div className="flex flex-col h-full">
        <div className="relative flex items-center gap-3 border-b border-slate-200/70 px-5 py-5 dark:border-slate-800">
          <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-primary via-sky-400 to-emerald-400" />
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-sky-600 text-white shadow-lg shadow-primary/20 ring-1 ring-white/20">
            <Building2 size={20} strokeWidth={2} />
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-base font-bold tracking-tight text-slate-900 dark:text-white">Kentiva</h1>
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">Yönetim portalı</p>
          </div>
        </div>

        <nav className="flex flex-1 flex-col space-y-5 overflow-y-auto px-3 py-5">
          {menuGroups.filter((g) => !g.collapsible).map((group) => {
            if (group.items.length === 0) return null;
            return (
              <div key={group.title} className="space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-3 py-1">
                  {group.title}
                </p>
                {group.items.map((item) => {
                  const isActive =
                    item.path === '/'
                      ? location.pathname === '/'
                      : location.pathname === item.path || location.pathname.startsWith(`${item.path}/`);
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setOpen(false)}
                      className={`group relative flex min-h-10 items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold transition-colors ${
                        isActive
                          ? 'bg-primary text-white shadow-md shadow-primary/15 dark:bg-primary dark:text-white'
                          : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-950 dark:text-slate-400 dark:hover:bg-slate-800/70 dark:hover:text-white'
                      }`}
                    >
                      <item.icon size={18} strokeWidth={isActive ? 2.25 : 2} />
                      <span className="flex-1">{item.name}</span>
                      {item.path === '/reports' && liveNewReports > 0 ? (
                        <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-emerald-500 px-1.5 text-[10px] font-bold text-white animate-pulse">
                          +{liveNewReports > 9 ? '9+' : liveNewReports}
                        </span>
                      ) : null}
                    </Link>
                  );
                })}
              </div>
            );
          })}
          {menuGroups
            .filter((g) => g.collapsible)
            .map((group) => {
              if (group.items.length === 0) return null;
              const isCollapsedAdvanced = !advancedOpen;
              return (
                <div key={group.title} className="mt-auto space-y-1 border-t border-slate-200/80 pt-4 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setAdvancedOpen((o) => !o)}
                    className="flex w-full items-center justify-between rounded-lg px-3 py-1 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400 transition hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
                    aria-expanded={advancedOpen}
                  >
                    <span>{group.title}</span>
                    <ChevronDown size={14} className={`transition-transform ${advancedOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {!isCollapsedAdvanced &&
                    group.items.map((item) => {
                      const isActive =
                        location.pathname === item.path || location.pathname.startsWith(`${item.path}/`);
                      return (
                        <Link
                          key={item.path}
                          to={item.path}
                          onClick={() => setOpen(false)}
                          className={`group relative flex min-h-10 items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold transition-colors ${
                            isActive
                              ? 'bg-primary text-white shadow-md shadow-primary/15 dark:bg-primary dark:text-white'
                              : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-950 dark:text-slate-400 dark:hover:bg-slate-800/70 dark:hover:text-white'
                          }`}
                        >
                          <item.icon size={18} strokeWidth={isActive ? 2.25 : 2} />
                          <span className="flex-1">{item.name}</span>
                        </Link>
                      );
                    })}
                </div>
              );
            })}
        </nav>

        <div className="border-t border-slate-200/80 p-3 dark:border-slate-800">
          <div className="flex items-center gap-2.5 rounded-xl border border-slate-200/90 bg-slate-50/80 px-3 py-2 dark:border-slate-700 dark:bg-slate-800/40">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-sm font-bold text-primary shadow-sm ring-1 ring-slate-200/80 dark:bg-slate-700 dark:ring-slate-600 dark:text-sky-200">
              {user.fullName[0]}
            </div>
            <div className="min-w-0 flex-1 overflow-hidden">
              <p className="truncate text-xs font-bold text-slate-900 dark:text-white leading-tight">{user.fullName}</p>
              <p className="truncate text-[10px] font-semibold text-slate-500 dark:text-slate-400 mt-0.5">{user.municipality?.name || user.district || 'Süper Admin'}</p>
            </div>
            <button 
              onClick={async () => {
                try { await api.post('/auth/logout'); } catch { /* ignore */ }
                clearAuthStorage();
                window.location.href = loginPathForUser(user);
              }}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-red-50 hover:text-red-600 dark:text-slate-400 dark:hover:bg-red-950/30 dark:hover:text-red-400 transition-colors"
              title={t('logout')}
              aria-label={t('logout')}
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
};

interface SystemNotification {
  id: string;
  title: string;
  body: string;
  type: 'warning' | 'info' | 'danger';
  link?: string;
}

const userInitials = (fullName?: string | null): string => {
  if (!fullName) return '?';
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
};

const Header = ({
  user,
  setSidebarOpen,
}: {
  user: AuthenticatedPortalUser | null;
  setSidebarOpen: (o: boolean) => void;
}) => {
  const navigate = useNavigate();
  const { language, setLanguage } = useTranslation();
  const [notifications, setNotifications] = useState<SystemNotification[]>([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isSuperAdmin = useMemo(() => {
    return user ? isPlatformSuperAdmin(user) : false;
  }, [user]);

  const refreshNotifications = useCallback(() => {
    if (!user) return;

    if (isSuperAdmin) {
      api.get('/admin/platform/dashboard')
        .then((res) => {
          const tenants = res.data.data?.tenants ?? [];
          const list: SystemNotification[] = [];
          tenants.forEach((t: any) => {
            if (!t.onboarded) {
              list.push({
                id: `onboard-${t.id}`,
                title: 'Kurulum Sihirbazı Bekliyor',
                body: `${t.displayName || t.name} belediyesinin kurulum (onboarding) işlemi henüz tamamlanmadı.`,
                type: 'info',
                link: '/admin/onboarding',
              });
            }
            if (t.membershipStatus === 'EXPIRING_SOON') {
              list.push({
                id: `expiring-${t.id}`,
                title: 'Üyelik Yakında Bitiyor',
                body: `${t.displayName || t.name} belediye üyeliğinin bitmesine ${t.daysRemaining ?? 0} gün kaldı.`,
                type: 'warning',
                link: '/admin/municipalities',
              });
            } else if (t.membershipStatus === 'EXPIRED') {
              list.push({
                id: `expired-${t.id}`,
                title: 'Üyelik Süresi Doldu',
                body: `${t.displayName || t.name} belediye üyeliğinin süresi doldu!`,
                type: 'danger',
                link: '/admin/municipalities',
              });
            } else if (t.membershipStatus === 'SUSPENDED') {
              list.push({
                id: `suspended-${t.id}`,
                title: 'Hesap Askıda',
                body: `${t.displayName || t.name} belediye hesabı askıya alındı.`,
                type: 'danger',
                link: '/admin/municipalities',
              });
            }
          });
          setNotifications(list);
        })
        .catch(() => {});
    } else if (user.municipality) {
      const muni = user.municipality;
      const list: SystemNotification[] = [];
      if (muni.membershipStatus === 'EXPIRING_SOON') {
        list.push({
          id: 'muni-expiring',
          title: 'Üyeliğiniz Yakında Bitiyor',
          body: `Kentiva üyeliğinizin bitmesine ${muni.daysRemaining ?? 0} gün kaldı. Lütfen üyeliğinizi yenileyin.`,
          type: 'warning',
          link: '/municipality-settings',
        });
      } else if (muni.membershipStatus === 'EXPIRED') {
        list.push({
          id: 'muni-expired',
          title: 'Üyelik Süreniz Doldu',
          body: 'Kentiva üyelik süreniz doldu! İşlemlere devam edebilmek için platform yöneticinizle iletişime geçin.',
          type: 'danger',
        });
      } else if (muni.membershipStatus === 'TRIAL') {
        list.push({
          id: 'muni-trial',
          title: 'Deneme Sürümü Aktif',
          body: `Kentiva deneme sürümündesiniz. Kalan süre: ${muni.daysRemaining ?? 0} gün.`,
          type: 'info',
          link: '/municipality-settings',
        });
      }
      setNotifications(list);
    }
  }, [user, isSuperAdmin]);

  useEffect(() => {
    refreshNotifications();
  }, [refreshNotifications]);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    if (dropdownOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [dropdownOpen]);

  return (
    <header className="sticky top-0 z-45 flex h-[4.5rem] items-center justify-between border-b border-slate-200/70 bg-white/80 px-4 backdrop-blur-xl sm:px-6 dark:border-slate-800 dark:bg-slate-950/80">
      <button type="button" onClick={() => setSidebarOpen(true)} className="kentiva-btn-icon lg:hidden" aria-label="Menüyü aç">
        <Menu />
      </button>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          const q = (e.currentTarget.elements.namedItem('headerSearch') as HTMLInputElement)?.value?.trim();
          if (q) navigate(`/reports?q=${encodeURIComponent(q)}`);
          else navigate('/reports');
        }}
        className="hidden w-full max-w-lg items-center gap-2 rounded-xl border border-slate-200/90 bg-slate-100/70 px-3.5 py-2.5 shadow-inner shadow-slate-200/30 transition focus-within:border-primary/35 focus-within:bg-white focus-within:ring-4 focus-within:ring-primary/5 dark:border-slate-700 dark:bg-slate-900/70 dark:shadow-none dark:focus-within:bg-slate-900 md:flex"
      >
        <Search size={17} className="shrink-0 text-slate-400" />
        <input
          type="search"
          name="headerSearch"
          placeholder="Rapor ara…"
          className="w-full border-0 bg-transparent text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:ring-0 dark:text-slate-100"
        />
      </form>

      <div className="flex items-center gap-1 sm:gap-2">
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value as Language)}
          aria-label="Dil seçimi"
          title="Dil seçimi"
          className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700 outline-none focus:ring-1 focus:ring-primary/20"
        >
          <option value="tr">TR</option>
          <option value="en">EN</option>
        </select>


        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="kentiva-btn-icon relative"
            title="Sistem Bildirimleri"
            aria-label="Sistem Bildirimleri"
          >
            <Bell size={19} />
            {notifications.length > 0 ? (
              <span className="absolute right-0.5 top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white ring-2 ring-white dark:ring-slate-900 animate-pulse">
                {notifications.length}
              </span>
            ) : null}
          </button>

          <AnimatePresence>
            {dropdownOpen && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 mt-2.5 w-80 sm:w-96 rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xl dark:border-slate-850 dark:bg-slate-900/95 z-50 max-h-[450px] overflow-y-auto"
              >
                <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-3 dark:border-slate-800">
                  <h3 className="font-bold text-slate-900 dark:text-white text-xs">
                    Sistem Uyarıları & Durumlar
                  </h3>
                  {notifications.length > 0 && (
                    <span className="rounded-full bg-red-100 dark:bg-red-950/40 px-2 py-0.5 text-[10px] font-bold text-red-600 dark:text-red-400">
                      {notifications.length} bildirim
                    </span>
                  )}
                </div>

                {notifications.length === 0 ? (
                  <div className="py-6 text-center text-xs text-slate-500 dark:text-slate-400">
                    <CheckCircle2 className="mx-auto mb-2 h-8 w-8 text-emerald-500" />
                    <p className="font-semibold text-slate-700 dark:text-slate-300">Her Şey Yolunda!</p>
                    <p className="mt-1">Kritik bir üyelik veya sistem uyarısı bulunmuyor.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {notifications.map((n) => {
                      let Icon = Sparkles;
                      let iconColor = 'text-sky-500 bg-sky-50 dark:bg-sky-950/40';
                      if (n.type === 'warning') {
                        Icon = AlertTriangle;
                        iconColor = 'text-amber-500 bg-amber-50 dark:bg-amber-950/40';
                      } else if (n.type === 'danger') {
                        Icon = AlertCircle;
                        iconColor = 'text-rose-500 bg-rose-50 dark:bg-rose-950/40';
                      }

                      const content = (
                        <div className="flex gap-3">
                          <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${iconColor}`}>
                            <Icon size={16} />
                          </div>
                          <div className="min-w-0 flex-1 text-left">
                            <p className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
                              {n.title}
                            </p>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-normal">
                              {n.body}
                            </p>
                          </div>
                        </div>
                      );

                      if (n.link) {
                        return (
                          <button
                            key={n.id}
                            onClick={() => {
                              setDropdownOpen(false);
                              navigate(n.link!);
                            }}
                            className="w-full block rounded-xl border border-slate-100/70 p-2.5 hover:bg-slate-50 dark:border-slate-800/60 dark:hover:bg-slate-800/40 transition-colors text-left"
                          >
                            {content}
                          </button>
                        );
                      }

                      return (
                        <div
                          key={n.id}
                          className="rounded-xl border border-slate-100/70 p-2.5 dark:border-slate-800/60"
                        >
                          {content}
                        </div>
                      );
                    })}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="mx-1 hidden h-7 w-px bg-slate-200 sm:block dark:bg-slate-700" />
        <div className="hidden items-center gap-2 rounded-lg border border-transparent px-2 py-1 sm:flex dark:hover:border-slate-700">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-xs font-bold text-primary ring-1 ring-primary/10 dark:bg-primary/25 dark:text-sky-200">
            {userInitials(user?.fullName)}
          </div>
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{portalRoleLabel(user)}</span>
        </div>
      </div>
    </header>
  );
};

const isSuperAdminOnly = (user: AuthenticatedPortalUser) => isPlatformSuperAdmin(user);

const SuperAdminDashboard = () => {
  return <SuperAdminHomePage />;
};

const MunicipalityDashboard = ({ user }: { user: AuthenticatedPortalUser }) => {
  const [stats, setStats] = useState<Stats | null>(null);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [recentReports, setRecentReports] = useState<{ id: string; title: string; status: string; categoryName: string; createdAt: string; district: string }[]>([]);
  const [insights, setInsights] = useState<PredictiveInsight[]>([]);
  const [exporting, setExporting] = useState<'excel' | 'pdf' | null>(null);
  const [mapReportId, setMapReportId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const fieldOnly = isFieldOfficerOnly(user);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 5000);
    return () => window.clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    if (!mapReportId) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMapReportId(null);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [mapReportId]);

  useEffect(() => {
    api
      .get('/dashboard/stats')
      .then((res) => setStats(res.data.data))
      .catch(() => setStatsError('İstatistikler alınamadı.'));

    api
      .get('/reports', { params: { page: 0, size: 5, sort: 'createdAt,desc' } })
      .then((res) => setRecentReports(res.data.data?.content ?? []))
      .catch(() => {});

    if (!fieldOnly) {
      api
        .get('/dashboard/predictive-insights')
        .then((res) => setInsights(((res.data.data as PredictiveInsight[]) ?? []).slice(0, 3)))
        .catch(() => setInsights([]));
    }
  }, [fieldOnly]);

  const handleExport = async (format: 'excel' | 'pdf') => {
    setExporting(format);
    try {
      const path = format === 'excel' ? '/export/reports/excel' : '/export/reports/pdf';
      const res = await api.get(path, { responseType: 'blob' });
      await downloadBlobResponse(
        res,
        `kentiva-raporlar-${new Date().toISOString().slice(0, 10)}.${format === 'excel' ? 'xlsx' : 'pdf'}`,
      );
    } catch (e: unknown) {
      setToast({ type: 'error', message: e instanceof Error ? e.message : 'Dışa aktarma başarısız oldu.' });
    } finally {
      setExporting(null);
    }
  };

  if (statsError) {
    return (
      <div className="p-6">
        <p className="kentiva-alert-error">{statsError}</p>
      </div>
    );
  }

  if (!stats) return <DashboardLoadingSkeleton />;

  if (fieldOnly) {
    const assignedOpen = (stats.pendingReports ?? 0) + (stats.processingReports ?? 0);
    return (
      <div className="mx-auto max-w-3xl space-y-6 p-4 sm:p-6 lg:p-8">
        <div className="rounded-[2rem] border border-slate-200/80 bg-white p-6 shadow-sm sm:p-8 dark:border-slate-800 dark:bg-slate-900">
          <p className="kentiva-eyebrow">Saha operasyonu</p>
          <h2 className="mt-2 text-3xl font-black tracking-[-0.04em] text-slate-950 dark:text-white">Bana atananlar</h2>
          <p className="mt-2 text-sm font-medium text-slate-500 dark:text-slate-400">
            Bugün odaklanmanız gereken atanmış ihbarlar. Liste, size atanmış kayıtları gösterir.
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-amber-200/80 bg-amber-50/60 p-4 dark:border-amber-900/40 dark:bg-amber-950/20">
              <p className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">Bekleyen / açık</p>
              <p className="mt-1 text-3xl font-black tabular-nums text-slate-950 dark:text-white">{assignedOpen}</p>
            </div>
            <div className="rounded-2xl border border-sky-200/80 bg-sky-50/60 p-4 dark:border-sky-900/40 dark:bg-sky-950/20">
              <p className="text-[10px] font-bold uppercase tracking-wider text-sky-700 dark:text-sky-300">İşleniyor</p>
              <p className="mt-1 text-3xl font-black tabular-nums text-slate-950 dark:text-white">{stats.processingReports}</p>
            </div>
          </div>
          <Link
            to="/reports"
            className="mt-6 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-white shadow-sm hover:bg-primary-hover sm:w-auto"
          >
            <UserCheck size={18} />
            Atanmış ihbarları aç
            <ArrowRight size={16} />
          </Link>
        </div>
        {recentReports.length > 0 && (
          <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h3 className="mb-3 text-sm font-bold text-slate-900 dark:text-white">Son atananlar</h3>
            <div className="space-y-2">
              {recentReports.slice(0, 5).map((r) => (
                <Link
                  key={r.id}
                  to={`/reports/${r.id}`}
                  className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 px-3 py-2.5 text-sm hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50"
                >
                  <span className="truncate font-medium text-slate-900 dark:text-white">{r.title}</span>
                  <span className={`kentiva-status-badge shrink-0 ${reportStatusBadgeClass(r.status)}`}>{reportStatusLabel(r.status)}</span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  const workQueue = [
    {
      label: 'Bekleyen',
      hint: 'Değerlendirme bekleyen',
      value: stats.pendingReports,
      to: '/reports?status=PENDING',
      icon: Clock,
      tone: 'border-amber-200/90 bg-amber-50 text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100',
    },
    {
      label: 'İşleniyor',
      hint: 'Sahada devam eden',
      value: stats.processingReports,
      to: '/reports?status=PROCESSING',
      icon: AlertCircle,
      tone: 'border-sky-200/90 bg-sky-50 text-sky-900 dark:border-sky-900/50 dark:bg-sky-950/40 dark:text-sky-100',
    },
  ];

  const statCards = [
    {
      name: 'Toplam',
      value: stats.totalReports,
      icon: FileText,
      iconWrap: 'bg-primary/10 text-primary ring-1 ring-primary/15',
      to: '/reports',
    },
    {
      name: 'Bekleyen',
      value: stats.pendingReports,
      icon: Clock,
      iconWrap: 'bg-amber-50 text-amber-700 ring-1 ring-amber-600/15 dark:bg-amber-950/30 dark:text-amber-200',
      to: '/reports?status=PENDING',
    },
    {
      name: 'İşleniyor',
      value: stats.processingReports,
      icon: AlertCircle,
      iconWrap: 'bg-sky-50 text-sky-700 ring-1 ring-sky-600/15 dark:bg-sky-950/40 dark:text-sky-200',
      to: '/reports?status=PROCESSING',
    },
    {
      name: 'Çözülen',
      value: stats.resolvedReports,
      icon: CheckCircle2,
      iconWrap: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/15 dark:bg-emerald-950/30 dark:text-emerald-200',
      to: '/reports?status=RESOLVED',
    },
    {
      name: 'Red',
      value: stats.rejectedReports,
      icon: AlertCircle,
      iconWrap: 'bg-red-50 text-red-700 ring-1 ring-red-600/15 dark:bg-red-950/30 dark:text-red-200',
      to: '/reports?status=REJECTED',
    },
    {
      name: 'Memnuniyet',
      value: stats.averageSatisfaction != null ? `${Number(stats.averageSatisfaction).toFixed(1)}` : '—',
      icon: Sparkles,
      iconWrap: 'bg-violet-50 text-violet-700 ring-1 ring-violet-600/15 dark:bg-violet-950/30 dark:text-violet-200',
      to: undefined as string | undefined,
    },
  ];

  return (
    <>
      <Toast toast={toast} onDismiss={() => setToast(null)} />
    <div className="mx-auto max-w-[1600px] space-y-5 p-4 sm:p-6 lg:p-8">
      {/* Compact ops bar */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <p className="kentiva-eyebrow">Operasyon haritası</p>
          <h2 className="mt-1 text-2xl font-black tracking-[-0.04em] text-slate-950 sm:text-3xl dark:text-white">
            Bugün
          </h2>
          <p className="mt-1 max-w-xl text-sm font-medium text-slate-500 dark:text-slate-400">
            Haritadan ihbar seçin; kuyruk ve son kayıtlar yanında hazır.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {workQueue.map((row) => (
            <Link
              key={row.label}
              to={row.to}
              className={`inline-flex min-h-11 items-center gap-2 rounded-xl border px-3.5 py-2 shadow-sm transition hover:-translate-y-px ${row.tone}`}
            >
              <row.icon size={16} />
              <span className="text-xs font-bold uppercase tracking-wide">{row.label}</span>
              <span className="text-lg font-black tabular-nums">{row.value}</span>
            </Link>
          ))}
          <button
            type="button"
            onClick={() => handleExport('excel')}
            disabled={exporting !== null}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
          >
            <Download size={14} />
            {exporting === 'excel' ? '…' : 'Excel'}
          </button>
          <button
            type="button"
            onClick={() => handleExport('pdf')}
            disabled={exporting !== null}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
          >
            <Download size={14} />
            {exporting === 'pdf' ? '…' : 'PDF'}
          </button>
        </div>
      </div>

      {/* Map-first stage */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12 xl:gap-5">
        <div className="xl:col-span-9">
          <div className="overflow-hidden rounded-[1.75rem] border border-slate-200/90 bg-white shadow-[0_24px_70px_-42px_rgba(15,23,42,0.45)] dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 dark:border-slate-800 sm:px-5">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Canlı harita</h3>
                <p className="text-[11px] font-medium text-slate-500">İşaretçiye tıklayınca detay açılır</p>
              </div>
              <Link to="/reports" className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline">
                Liste <ArrowRight size={12} />
              </Link>
            </div>
            <div className="p-2 sm:p-3">
              <Suspense fallback={<MapFallback />}>
                <LiveMap
                  className="h-[min(72vh,820px)] min-h-[420px]"
                  centerLat={user.municipality?.centerLat}
                  centerLng={user.municipality?.centerLng}
                  zoom={user.municipality?.defaultZoom}
                  municipalityId={user.municipality?.id}
                  pauseRecenter={Boolean(mapReportId)}
                  onOpenReport={(id) => setMapReportId(id)}
                />
              </Suspense>
            </div>
          </div>
        </div>

        <aside className="flex flex-col gap-4 xl:col-span-3">
          <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-5">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Son bildiriler</h3>
              <Link to="/reports" className="text-[11px] font-bold text-primary hover:underline">
                Tümü
              </Link>
            </div>
            {recentReports.length === 0 ? (
              <p className="text-sm text-slate-500">Henüz bildirim yok.</p>
            ) : (
              <div className="space-y-2">
                {recentReports.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setMapReportId(r.id)}
                    className="flex w-full items-start gap-3 rounded-xl border border-slate-100 p-3 text-left transition-colors hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary dark:bg-primary/25 dark:text-sky-300">
                      <FileText size={14} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-900 dark:text-white">{r.title}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <span className={`kentiva-status-badge ${reportStatusBadgeClass(r.status)}`}>
                          {reportStatusLabel(r.status)}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {r.createdAt ? new Date(r.createdAt).toLocaleDateString('tr-TR') : ''}
                        </span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {insights.length > 0 && (
            <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-5">
              <div className="mb-3 flex items-center gap-2">
                <TrendingUp size={16} className="text-primary" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Uyarılar</h3>
              </div>
              <div className="space-y-2">
                {insights.slice(0, 2).map((item, idx) => (
                  <div
                    key={`${item.categoryName}-${item.district}-${idx}`}
                    className={`rounded-xl border p-3 ${
                      item.riskLevel === 'HIGH'
                        ? 'border-red-200/80 bg-red-50/80 dark:border-red-900/50 dark:bg-red-950/30'
                        : 'border-amber-200/80 bg-amber-50/80 dark:border-amber-900/50 dark:bg-amber-950/30'
                    }`}
                  >
                    <p className="text-xs font-bold text-slate-900 dark:text-white">{item.categoryName}</p>
                    <p className="mt-1 line-clamp-2 text-[11px] text-slate-600 dark:text-slate-400">{item.recommendation}</p>
                  </div>
                ))}
              </div>
              <Link to="/stats" className="mt-3 inline-flex items-center gap-1 text-[11px] font-bold text-primary hover:underline">
                Analizler <ArrowRight size={11} />
              </Link>
            </div>
          )}
        </aside>
      </div>

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
        {statCards.map((stat) => {
          const cardClassName =
            'group relative flex min-h-[4.5rem] items-center gap-2.5 overflow-hidden rounded-2xl border border-slate-200/80 bg-white px-3 py-3 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/20 hover:shadow-md dark:border-slate-800 dark:bg-slate-900';
          const content = (
            <>
              <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${stat.iconWrap}`}>
                <stat.icon size={16} strokeWidth={2.2} />
              </div>
              <div className="min-w-0">
                <p className="truncate text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  {stat.name}
                </p>
                <p className="mt-0.5 text-xl font-black leading-none tabular-nums tracking-tight text-slate-950 dark:text-white">
                  {stat.value}
                </p>
              </div>
            </>
          );
          if (stat.to) {
            return (
              <Link key={stat.name} to={stat.to} className={cardClassName} aria-label={`${stat.name} raporlarını görüntüle`}>
                {content}
              </Link>
            );
          }
          return (
            <div key={stat.name} className={cardClassName}>
              {content}
            </div>
          );
        })}
      </div>

      <AnimatePresence>
        {mapReportId && (
          <div className="fixed inset-0 z-[2000] flex justify-end overflow-hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              onClick={() => setMapReportId(null)}
              className="absolute inset-0 bg-slate-950/45 backdrop-blur-[2px] cursor-pointer"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className="relative flex h-full w-full max-w-3xl flex-col overflow-hidden border-l border-slate-200 bg-slate-50 shadow-2xl dark:border-slate-800 dark:bg-slate-950"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setMapReportId(null)}
                className="absolute right-4 top-4 z-20 rounded-lg border border-slate-200 bg-white p-2 text-slate-600 shadow-sm hover:bg-slate-50 transition-colors dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
                aria-label="Kapat"
              >
                <X className="h-4 w-4" />
              </button>
              <div className="flex-1 overflow-y-auto overscroll-contain">
                <Suspense fallback={<div className="p-6 text-slate-500">Yükleniyor...</div>}>
                  <ReportDetailPage
                    reportId={mapReportId}
                    embedded
                    onClose={() => setMapReportId(null)}
                  />
                </Suspense>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
    </>
  );
};

const Dashboard = ({ user }: { user: AuthenticatedPortalUser }) => {
  if (isSuperAdminOnly(user)) {
    return <SuperAdminDashboard />;
  }
  return <MunicipalityDashboard user={user} />;
};

// --- Main App ---
const App = () => {
  const [user, setUser] = useState<AuthenticatedPortalUser | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(() => Boolean(getStoredAccessToken()));
  const hostPortal = typeof window !== 'undefined' ? portalForHostname(window.location.hostname) : null;
  const loginRedirectPath = loginPathForCurrentHost();

  useEffect(() => {
    const token = getStoredAccessToken();
    if (token) {
      api.get('/auth/me').then(res => {
        setUser(buildPortalUser(res.data.data));
      }).catch(() => {
        clearAuthStorage();
      }).finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    document.documentElement.classList.remove('dark');
    localStorage.setItem('kentiva_theme', 'light');
  }, []);

  if (loading) return <div className="flex h-screen items-center justify-center bg-slate-100 text-sm font-medium text-slate-500">Yükleniyor…</div>;

  return (
    <LanguageProvider>
    <Router>
        <ErrorBoundary>
        <Routes>
        <Route
          path="/setup"
          element={
            <Suspense fallback={<PageFallback />}>
              <SetupPage />
            </Suspense>
          }
        />
        <Route
          path="/login"
          element={
            user ? <Navigate to="/" /> : hostPortal ? <Navigate to={loginPathForPortal(hostPortal)} replace /> : <LoginLandingPage />
          }
        />
        <Route
          path="/super-admin/login"
          element={
            user ? <Navigate to="/" /> : hostPortal === 'municipality' ? <Navigate to="/municipality/login" replace /> : <LoginPage portal="super-admin" onLogin={setUser} />
          }
        />
        <Route path="/platform/login" element={<Navigate to="/super-admin/login" replace />} />
        <Route path="/owner/login" element={<Navigate to="/super-admin/login" replace />} />
        <Route
          path="/municipality/login"
          element={
            user ? <Navigate to="/" /> : hostPortal === 'super-admin' ? <Navigate to="/super-admin/login" replace /> : <LoginPage portal="municipality" onLogin={setUser} />
          }
        />
        
        <Route path="/*" element={
          !user ? <Navigate to={loginRedirectPath} replace /> : (
            <ReportLiveProvider municipalityId={user.municipality?.id}>
            <div className="kentiva-app-shell flex min-h-screen bg-slate-100">
              <Sidebar isOpen={sidebarOpen} setOpen={setSidebarOpen} user={user} />
              
              <div className="flex flex-1 flex-col lg:ml-72">
                <Header
                  user={user}
                  setSidebarOpen={setSidebarOpen}
                />
                <main className="relative flex-1 overflow-x-hidden">
                  <Suspense fallback={<PageFallback />}>
                  <Routes>
                    <Route path="/" element={<Dashboard user={user} />} />
                    <Route path="/reports" element={<ReportsPage />} />
                    <Route
                      path="/pilot"
                      element={
                        <ProtectedRoute user={user} allow={(u) => u.roles.some((r) => ['ROLE_ADMIN', 'ROLE_DEPT_MANAGER'].includes(r)) && Boolean(u.municipality)}>
                          <PilotSuccessPage />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/reports/new-white-desk"
                      element={
                        <ProtectedRoute user={user} allow={(u) => u.roles.some((r) => ['ROLE_WHITE_DESK', 'ROLE_DEPT_MANAGER', 'ROLE_ADMIN'].includes(r)) && Boolean(u.municipality)}>
                          <WhiteDeskReportPage />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/announcements"
                      element={
                        <ProtectedRoute user={user} allow={(u) => u.roles.some((r) => ['ROLE_ADMIN', 'ROLE_DEPT_MANAGER', 'ROLE_SUPER_ADMIN'].includes(r))}>
                          <AnnouncementsPage canManage={user.roles.some((r) => ['ROLE_ADMIN', 'ROLE_SUPER_ADMIN'].includes(r))} />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/surveys"
                      element={
                        <ProtectedRoute user={user} allow={(u) => u.roles.some((r) => ['ROLE_ADMIN', 'ROLE_DEPT_MANAGER', 'ROLE_SUPER_ADMIN'].includes(r))}>
                          <SurveysPage canManage={user.roles.some((r) => ['ROLE_ADMIN', 'ROLE_SUPER_ADMIN'].includes(r))} />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/events-outages"
                      element={
                        <ProtectedRoute user={user} allow={(u) => u.roles.includes('ROLE_ADMIN') && Boolean(u.municipality)}>
                          <EventsAndOutagesPage />
                        </ProtectedRoute>
                      }
                    />
                    <Route path="/reports/:id" element={<ReportDetailPage />} />
                    <Route path="/stats" element={<StatisticsPage />} />
                    <Route
                      path="/audit-logs"
                      element={
                        <ProtectedRoute user={user} allow={(u) => u.roles.some((r) => ['ROLE_ADMIN', 'ROLE_SUPER_ADMIN'].includes(r))}>
                          <AuditLogsPage />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/staff"
                      element={
                        <ProtectedRoute
                          user={user}
                          allow={(u) =>
                            u.roles.some((r) => ['ROLE_ADMIN', 'ROLE_DEPT_MANAGER', 'ROLE_SUPER_ADMIN'].includes(r)) &&
                            (u.roles.includes('ROLE_SUPER_ADMIN') || Boolean(u.municipality))
                          }
                        >
                          <UsersPage />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/departments"
                      element={
                        <ProtectedRoute
                          user={user}
                          allow={(u) =>
                            u.roles.some((r) => ['ROLE_ADMIN', 'ROLE_DEPT_MANAGER', 'ROLE_SUPER_ADMIN'].includes(r)) &&
                            (u.roles.includes('ROLE_SUPER_ADMIN') || Boolean(u.municipality))
                          }
                        >
                          <DepartmentsPage />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/municipality-settings"
                      element={
                        <ProtectedRoute user={user} allow={(u) => u.roles.includes('ROLE_ADMIN') && Boolean(u.municipality)}>
                          <MunicipalitySettingsPage />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/municipality-settings/notifications"
                      element={
                        <ProtectedRoute user={user} allow={(u) => u.roles.includes('ROLE_ADMIN') && Boolean(u.municipality)}>
                          <MunicipalityNotificationTemplatesPage />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/system-feedback"
                      element={
                        <ProtectedRoute user={user} allow={(u) => u.roles.includes('ROLE_SUPER_ADMIN')}>
                          <SystemFeedbackPage />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/admin/municipalities"
                      element={
                        <ProtectedRoute user={user} allow={(u) => u.roles.includes('ROLE_SUPER_ADMIN')}>
                          <SuperAdminMunicipalitiesPage />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/admin/municipalities/:municipalityId/branding"
                      element={
                        <ProtectedRoute user={user} allow={(u) => u.roles.includes('ROLE_SUPER_ADMIN')}>
                          <SuperAdminMunicipalityBrandingPage />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/admin/municipalities/:municipalityId/notifications"
                      element={
                        <ProtectedRoute user={user} allow={(u) => u.roles.includes('ROLE_SUPER_ADMIN')}>
                          <MunicipalityNotificationTemplatesPage />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/admin/recent-reports"
                      element={
                        <ProtectedRoute user={user} allow={(u) => u.roles.includes('ROLE_SUPER_ADMIN')}>
                          <SuperAdminRecentReportsPage />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/admin/onboarding"
                      element={
                        <ProtectedRoute user={user} allow={(u) => u.roles.includes('ROLE_SUPER_ADMIN')}>
                          <MunicipalityOnboardingPage />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/admin/api-tracker"
                      element={
                        <ProtectedRoute user={user} allow={(u) => u.roles.includes('ROLE_SUPER_ADMIN')}>
                          <SuperAdminApiTrackerPage />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/rewards"
                      element={
                        <ProtectedRoute user={user} allow={(u) => u.roles.includes('ROLE_ADMIN') && Boolean(u.municipality)}>
                          <RewardsPage />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/scheduled-exports"
                      element={
                        <ProtectedRoute user={user} allow={(u) => u.roles.includes('ROLE_ADMIN') && Boolean(u.municipality)}>
                          <ScheduledExportsPage />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/marketing-kit"
                      element={
                        <ProtectedRoute user={user} allow={(u) => u.roles.includes('ROLE_ADMIN') && Boolean(u.municipality)}>
                          <MarketingKitPage />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/pricing"
                      element={
                        <ProtectedRoute user={user} allow={(u) => u.roles.includes('ROLE_ADMIN') && Boolean(u.municipality)}>
                          <PricingPage />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/executive"
                      element={
                        <ProtectedRoute user={user} allow={(u) => u.roles.some((r) => ['ROLE_ADMIN', 'ROLE_DEPT_MANAGER'].includes(r)) && Boolean(u.municipality)}>
                          <ExecutiveDashboardPage />
                        </ProtectedRoute>
                      }
                    />
                  </Routes>
                  </Suspense>
                </main>
              </div>

              {/* Mobile Sidebar Overlay */}
              <AnimatePresence>
                {sidebarOpen && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setSidebarOpen(false)}
                    className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm lg:hidden"
                  ></motion.div>
                )}
              </AnimatePresence>
            </div>
            </ReportLiveProvider>
          )
        } />
      </Routes>
      </ErrorBoundary>
    </Router>
    </LanguageProvider>
  );
};

export default App;
