import React, { useState, useEffect, lazy, Suspense } from 'react';
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
  Moon,
  Sun,
  Settings as SettingsIcon,
  MapPinned,
  ArrowRight,
  Shield,
  Sparkles,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import api, { clearAuthStorage, REFRESH_KEY, TOKEN_KEY, type PredictiveInsight, type Stats } from './api';
import DashboardLoadingSkeleton from './components/DashboardLoadingSkeleton';
import { reportStatusBadgeClass } from './lib/ui';

const LiveMap = lazy(() => import('./LiveMap'));
const ReportsPage = lazy(() => import('./pages/ReportsPage'));
const ReportDetailPage = lazy(() => import('./pages/ReportDetailPage'));
const StatisticsPage = lazy(() => import('./pages/StatisticsPage'));
const ScheduledExportsPage = lazy(() => import('./pages/ScheduledExportsPage'));
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

const ProtectedRoute = ({
  user,
  allow,
  children,
}: {
  user: User;
  allow: (u: User) => boolean;
  children: React.ReactNode;
}) => (allow(user) ? <>{children}</> : <Navigate to="/" replace />);

// --- Types ---
interface User {
  fullName: string;
  email: string;
  roles: string[];
  district?: string;
  municipality?: {
    id: string;
    name: string;
    slug?: string;
    displayName?: string | null;
    centerLat: number;
    centerLng: number;
    defaultZoom: number;
  } | null;
}

// --- Components ---
const Sidebar = ({ isOpen, setOpen, user }: { isOpen: boolean, setOpen: (o: boolean) => void, user: User }) => {
  const location = useLocation();
  const isPlatformSuperAdmin =
    user.roles.includes('ROLE_SUPER_ADMIN') && !user.municipality;

  type MenuItem = { name: string; icon: typeof LayoutDashboard; path: string };

  const menuItems: MenuItem[] = isPlatformSuperAdmin
    ? [
        { name: 'Platform', icon: LayoutDashboard, path: '/' },
        { name: 'Kurulum sihirbazı', icon: Sparkles, path: '/admin/onboarding' },
        { name: 'Belediyeler', icon: MapPinned, path: '/admin/municipalities' },
        { name: 'Denetim raporu', icon: Shield, path: '/audit-logs' },
      ]
    : (() => {
        const baseItems: MenuItem[] = [
          { name: 'Dashboard', icon: LayoutDashboard, path: '/' },
          { name: 'Raporlar', icon: FileText, path: '/reports' },
          { name: 'Personeller', icon: Users, path: '/staff' },
          { name: 'Departmanlar', icon: Building2, path: '/departments' },
          { name: 'İstatistikler', icon: PieChart, path: '/stats' },
        ];
        const extra: MenuItem[] = [];
        if (user.roles.some((r) => ['ROLE_ADMIN', 'ROLE_SUPER_ADMIN'].includes(r))) {
          extra.push({ name: 'Denetim raporu', icon: Shield, path: '/audit-logs' });
        }
        if (user.roles.some((r) => ['ROLE_ADMIN', 'ROLE_DEPT_MANAGER', 'ROLE_SUPER_ADMIN'].includes(r))) {
          extra.push({ name: 'Planlı dışa aktarma', icon: CalendarClock, path: '/scheduled-exports' });
        }
        if (user.roles.includes('ROLE_ADMIN') && user.municipality) {
          extra.push({ name: 'Belediye ayarları', icon: SettingsIcon, path: '/municipality-settings' });
        }
        if (user.roles.includes('ROLE_SUPER_ADMIN')) {
          extra.push({ name: 'Belediyeler', icon: MapPinned, path: '/admin/municipalities' });
          extra.push({ name: 'Kurulum sihirbazı', icon: Sparkles, path: '/admin/onboarding' });
        }
        return [...baseItems, ...extra];
      })();

  return (
    <aside className={`fixed inset-y-0 left-0 z-50 w-72 border-r border-slate-200/90 bg-white transition-transform duration-200 dark:border-slate-800 dark:bg-slate-900 transform ${isOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}>
      <div className="flex flex-col h-full">
        <div className="flex items-center gap-3 border-b border-slate-200/80 px-5 py-5 dark:border-slate-800">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary text-white shadow-sm ring-1 ring-slate-900/5 dark:ring-white/10">
            <Building2 size={20} strokeWidth={2} />
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-base font-bold tracking-tight text-slate-900 dark:text-white">Kentiva</h1>
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">Yönetim portalı</p>
          </div>
        </div>

        <nav className="flex-1 space-y-0.5 px-3 py-4">
          {menuItems.map((item) => {
            const isActive =
              item.path === '/'
                ? location.pathname === '/'
                : location.pathname === item.path || location.pathname.startsWith(`${item.path}/`);
            return (
              <Link
                key={item.name}
                to={item.path}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${
                  isActive
                    ? 'bg-slate-100 text-primary dark:bg-slate-800 dark:text-sky-300'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/60 dark:hover:text-slate-100'
                }`}
              >
                <item.icon size={18} strokeWidth={isActive ? 2.25 : 2} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-slate-200/80 p-4 dark:border-slate-800">
          <div className="flex items-center gap-3 rounded-xl border border-slate-200/90 bg-slate-50/80 px-3 py-3 dark:border-slate-700 dark:bg-slate-800/40">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-sm font-bold text-primary shadow-sm ring-1 ring-slate-200/80 dark:bg-slate-700 dark:ring-slate-600 dark:text-sky-200">
              {user.fullName[0]}
            </div>
            <div className="min-w-0 flex-1 overflow-hidden">
              <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{user.fullName}</p>
              <p className="truncate text-xs font-medium text-slate-500 dark:text-slate-400">{user.municipality?.name || user.district || 'Süper Admin'}</p>
            </div>
          </div>
          <button 
            onClick={async () => {
              try { await api.post('/auth/logout'); } catch { /* ignore */ }
              clearAuthStorage();
              window.location.href = '/login';
            }}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-red-50 hover:text-red-700 dark:text-slate-400 dark:hover:bg-red-950/30 dark:hover:text-red-300"
          >
            <LogOut size={18} />
            Çıkış Yap
          </button>
        </div>
      </div>
    </aside>
  );
};

const Header = ({
  setSidebarOpen,
  darkMode,
  onToggleDark,
}: {
  setSidebarOpen: (o: boolean) => void;
  darkMode: boolean;
  onToggleDark: () => void;
}) => {
  const navigate = useNavigate();
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    api
      .get('/dashboard/stats')
      .then((res) => setPendingCount(Number(res.data.data?.pendingReports ?? 0)))
      .catch(() => setPendingCount(0));
  }, []);

  return (
    <header className="sticky top-0 z-40 flex h-[4.25rem] items-center justify-between border-b border-slate-200/90 bg-white/95 px-4 backdrop-blur-md sm:px-6 dark:border-slate-800 dark:bg-slate-900/95">
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
        className="hidden w-full max-w-md items-center gap-2 rounded-xl border border-slate-200/90 bg-slate-50/90 px-3 py-2 dark:border-slate-700 dark:bg-slate-800/50 md:flex"
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
        <button
          type="button"
          onClick={onToggleDark}
          className="kentiva-btn-icon"
          title={darkMode ? 'Açık tema' : 'Koyu tema'}
          aria-label={darkMode ? 'Açık tema' : 'Koyu tema'}
        >
          {darkMode ? <Sun size={19} /> : <Moon size={19} />}
        </button>
        <Link to="/reports?status=PENDING" className="kentiva-btn-icon relative" title="Bekleyen raporlar" aria-label="Bekleyen raporlar">
          <Bell size={19} />
          {pendingCount > 0 ? (
            <span className="absolute right-0.5 top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white ring-2 ring-white dark:ring-slate-900">
              {pendingCount > 99 ? '99+' : pendingCount}
            </span>
          ) : null}
        </Link>
        <div className="mx-1 hidden h-7 w-px bg-slate-200 sm:block dark:bg-slate-700" />
        <div className="hidden items-center gap-2 rounded-lg border border-transparent px-2 py-1 sm:flex dark:hover:border-slate-700">
          <div className="h-8 w-8 shrink-0 rounded-lg bg-primary/15 ring-1 ring-primary/10 dark:bg-primary/25" />
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Yönetici</span>
        </div>
      </div>
    </header>
  );
};

const isSuperAdminOnly = (user: User) =>
  user.roles.includes('ROLE_SUPER_ADMIN') && !user.municipality;

const Dashboard = ({ user }: { user: User }) => {
  if (isSuperAdminOnly(user)) {
    return <SuperAdminHomePage />;
  }
  const [stats, setStats] = useState<Stats | null>(null);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [recentReports, setRecentReports] = useState<{ id: string; title: string; status: string; categoryName: string; createdAt: string; district: string }[]>([]);
  const [insights, setInsights] = useState<PredictiveInsight[]>([]);
  const [exporting, setExporting] = useState<'excel' | 'pdf' | null>(null);

  useEffect(() => {
    api
      .get('/dashboard/stats')
      .then((res) => setStats(res.data.data))
      .catch(() => setStatsError('İstatistikler alınamadı.'));

    api
      .get('/reports', { params: { page: 0, size: 5, sort: 'createdAt,desc' } })
      .then((res) => setRecentReports(res.data.data?.content ?? []))
      .catch(() => {});

    api
      .get('/dashboard/predictive-insights')
      .then((res) => setInsights(((res.data.data as PredictiveInsight[]) ?? []).slice(0, 3)))
      .catch(() => setInsights([]));
  }, []);

  const handleExport = async (format: 'excel' | 'pdf') => {
    setExporting(format);
    try {
      const path = format === 'excel' ? '/export/reports/excel' : '/export/reports/pdf';
      const res = await api.get(path, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `kentiva-raporlar-${new Date().toISOString().slice(0, 10)}.${format === 'excel' ? 'xlsx' : 'pdf'}`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      alert('Dışa aktarma başarısız oldu.');
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

  const statCards = [
    {
      name: 'Toplam Rapor',
      value: stats.totalReports,
      icon: FileText,
      iconWrap: 'bg-primary/10 text-primary ring-1 ring-primary/15',
    },
    {
      name: 'Bekleyen',
      value: stats.pendingReports,
      icon: Clock,
      iconWrap: 'bg-amber-50 text-amber-700 ring-1 ring-amber-600/15 dark:bg-amber-950/30 dark:text-amber-200',
    },
    {
      name: 'İşleniyor',
      value: stats.processingReports,
      icon: AlertCircle,
      iconWrap: 'bg-sky-50 text-sky-700 ring-1 ring-sky-600/15 dark:bg-sky-950/40 dark:text-sky-200',
    },
    {
      name: 'Çözülen',
      value: stats.resolvedReports,
      icon: CheckCircle2,
      iconWrap: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/15 dark:bg-emerald-950/30 dark:text-emerald-200',
    },
    {
      name: 'Reddedilen',
      value: stats.rejectedReports,
      icon: AlertCircle,
      iconWrap: 'bg-red-50 text-red-700 ring-1 ring-red-600/15 dark:bg-red-950/30 dark:text-red-200',
    },
  ];

  return (
    <div className="space-y-8 p-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="kentiva-eyebrow">Özet</p>
          <h2 className="kentiva-page-title">Hoş geldiniz</h2>
          <p className="kentiva-page-subtitle">Operasyon özeti ve canlı harita.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => handleExport('excel')}
            disabled={exporting !== null}
            className="kentiva-btn-secondary"
          >
            <Download size={17} />
            {exporting === 'excel' ? 'İndiriliyor…' : 'Excel'}
          </button>
          <button
            type="button"
            onClick={() => handleExport('pdf')}
            disabled={exporting !== null}
            className="kentiva-btn-secondary"
          >
            <Download size={17} />
            {exporting === 'pdf' ? 'İndiriliyor…' : 'PDF'}
          </button>
        </div>
      </div>

      {insights.length > 0 && (
        <section className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-4 flex items-center gap-2">
            <TrendingUp size={18} className="text-primary" />
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Tahminsel uyarılar</h3>
            <Sparkles size={16} className="text-sky-500" />
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {insights.map((item, idx) => (
              <div
                key={`${item.categoryName}-${item.district}-${idx}`}
                className={`rounded-xl border p-4 ${
                  item.riskLevel === 'HIGH'
                    ? 'border-red-200/80 bg-red-50/80 dark:border-red-900/50 dark:bg-red-950/30'
                    : item.riskLevel === 'MEDIUM'
                      ? 'border-amber-200/80 bg-amber-50/80 dark:border-amber-900/50 dark:bg-amber-950/30'
                      : 'border-slate-200/80 bg-slate-50/80 dark:border-slate-700 dark:bg-slate-800/40'
                }`}
              >
                <p className="font-bold text-slate-900 dark:text-white">{item.categoryName}</p>
                <p className="text-xs text-slate-500">{item.district || 'Genel'}</p>
                <p className="mt-2 flex gap-2 text-xs text-slate-600 dark:text-slate-400">
                  <span>Açık: {item.openCount}</span>
                  <span>Trend: ×{item.trendRatio}</span>
                </p>
                <p className="mt-2 flex gap-2 text-sm text-slate-700 dark:text-slate-300">
                  <AlertTriangle size={14} className="mt-0.5 shrink-0 text-amber-600" />
                  <span className="line-clamp-3">{item.recommendation}</span>
                </p>
              </div>
            ))}
          </div>
          <Link to="/stats" className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline">
            Tüm analizler <ArrowRight size={12} />
          </Link>
        </section>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {statCards.map((stat) => (
          <div
            key={stat.name}
            className="group rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm transition-all hover:border-primary/20 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-primary/25"
          >
            <div
              className={`mb-4 flex h-11 w-11 items-center justify-center rounded-xl ${stat.iconWrap}`}
            >
              <stat.icon size={22} strokeWidth={2} />
            </div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{stat.name}</p>
            <p className="mt-1 text-2xl font-extrabold tabular-nums text-slate-900 dark:text-white">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-8">
            <div className="mb-6 flex flex-wrap items-end justify-between gap-2 border-b border-slate-100 pb-4 dark:border-slate-800">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Canlı harita</h3>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Isı katmanı · işaretçi
              </span>
            </div>
            <Suspense fallback={<MapFallback />}>
              <LiveMap
                centerLat={user.municipality?.centerLat}
                centerLng={user.municipality?.centerLng}
                zoom={user.municipality?.defaultZoom}
                municipalityId={user.municipality?.id}
              />
            </Suspense>
          </div>
        </div>

        {/* Son Raporlar widget */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h3 className="mb-4 text-base font-bold text-slate-900 dark:text-white">Son Bildiriler</h3>
          {recentReports.length === 0 ? (
            <p className="text-sm text-slate-500">Henüz bildirim yok.</p>
          ) : (
            <div className="space-y-3">
              {recentReports.map((r) => (
                <a
                  key={r.id}
                  href={`/reports/${r.id}`}
                  className="flex items-start gap-3 rounded-xl border border-slate-100 p-3 transition-colors hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary dark:bg-primary/25 dark:text-sky-300">
                    <FileText size={14} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-900 dark:text-white">{r.title}</p>
                    <div className="mt-1 flex items-center gap-2">
                      <span className={`kentiva-status-badge ${reportStatusBadgeClass(r.status)}`}>{r.status}</span>
                      <span className="text-[10px] text-slate-400">{r.createdAt ? new Date(r.createdAt).toLocaleDateString('tr-TR') : ''}</span>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          )}
          <a href="/reports" className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline">
            Tümünü gör <ArrowRight size={12} />
          </a>
        </div>
      </div>
    </div>
  );
};

// --- Main App ---
const App = () => {
  const [user, setUser] = useState<User | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(() => Boolean(localStorage.getItem('token')));
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('kentiva_theme') === 'dark');

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      api.get('/auth/me').then(res => {
        const d = res.data.data;
        const fullName =
          d.fullName ||
          [d.firstName, d.lastName].filter(Boolean).join(' ').trim() ||
          d.email;
        setUser({
          fullName,
          email: d.email,
          roles: d.roles ? [...d.roles] : [],
          district: d.district,
          municipality: d.municipality,
        });
      }).catch(() => {
        clearAuthStorage();
      }).finally(() => setLoading(false));
    }
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
      localStorage.setItem('kentiva_theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('kentiva_theme', 'light');
    }
  }, [darkMode]);

  if (loading) return <div className="flex h-screen items-center justify-center bg-slate-100 text-sm font-medium text-slate-500 dark:bg-slate-950 dark:text-slate-400">Yükleniyor…</div>;

  return (
    <Router>
      <Routes>
        <Route
          path="/setup"
          element={
            <Suspense fallback={<PageFallback />}>
              <SetupPage />
            </Suspense>
          }
        />
        <Route path="/login" element={user ? <Navigate to="/" /> : <Login onLogin={setUser} />} />
        
        <Route path="/*" element={
          !user ? <Navigate to="/login" /> : (
            <div className="flex min-h-screen bg-slate-100 dark:bg-slate-950">
              <Sidebar isOpen={sidebarOpen} setOpen={setSidebarOpen} user={user} />
              
              <div className="flex flex-1 flex-col lg:ml-72">
                <Header
                  setSidebarOpen={setSidebarOpen}
                  darkMode={darkMode}
                  onToggleDark={() => setDarkMode((d) => !d)}
                />
                <main className="flex-1 overflow-x-hidden">
                  <Suspense fallback={<PageFallback />}>
                  <Routes>
                    <Route path="/" element={<Dashboard user={user} />} />
                    <Route path="/reports" element={<ReportsPage />} />
                    <Route path="/reports/:id" element={<ReportDetailPage />} />
                    <Route path="/stats" element={<StatisticsPage />} />
                    <Route
                      path="/audit-logs"
                      element={
                        <ProtectedRoute
                          user={user}
                          allow={(u) =>
                            u.roles.some((r) => ['ROLE_ADMIN', 'ROLE_SUPER_ADMIN'].includes(r))
                          }
                        >
                          <AuditLogsPage />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/scheduled-exports"
                      element={
                        <ProtectedRoute
                          user={user}
                          allow={(u) =>
                            u.roles.some((r) =>
                              ['ROLE_ADMIN', 'ROLE_DEPT_MANAGER', 'ROLE_SUPER_ADMIN'].includes(r),
                            )
                          }
                        >
                          <ScheduledExportsPage />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/staff"
                      element={<UsersPage />}
                    />
                    <Route path="/departments" element={<DepartmentsPage />} />
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
                      path="/admin/onboarding"
                      element={
                        <ProtectedRoute user={user} allow={(u) => u.roles.includes('ROLE_SUPER_ADMIN')}>
                          <MunicipalityOnboardingPage />
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
          )
        } />
      </Routes>
    </Router>
  );
};

const Login = ({ onLogin }: { onLogin: (u: User) => void }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  useEffect(() => {
    api
      .get('/setup/status')
      .then((res) => {
        if (res.data.data?.needsBootstrap) {
          window.location.href = '/setup';
        }
      })
      .catch(() => {});
  }, []);

  // Şifre sıfırlama
  const [forgotStep, setForgotStep] = useState<'off'|'phone'|'otp'|'newpass'>('off');
  const [resetPhone, setResetPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [newPass, setNewPass] = useState('');
  const [resetMsg, setResetMsg] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.post('/auth/login', { email, password });
      const data = res.data.data;
      localStorage.setItem(TOKEN_KEY, data.accessToken);
      if (data.refreshToken) {
        localStorage.setItem(REFRESH_KEY, data.refreshToken);
      }
      const fullName =
        data.fullName ||
        [data.firstName, data.lastName].filter(Boolean).join(' ').trim() ||
        data.email;
      onLogin({
        fullName,
        email: data.email,
        roles: data.roles ? [...data.roles] : [],
        district: data.district,
        municipality: data.municipality,
      });
    } catch (err: unknown) {
      setError(
        axios.isAxiosError(err)
          ? String((err.response?.data as { message?: string } | undefined)?.message ?? 'Giriş yapılamadı')
          : 'Giriş yapılamadı'
      );
    }
  };

  const handleReset = async () => {
    setResetLoading(true);
    setResetMsg('');
    try {
      if (forgotStep === 'phone') {
        await api.post('/auth/forgot-password', { phoneNumber: resetPhone });
        setForgotStep('otp');
        setResetMsg('Doğrulama kodu gönderildi.');
      } else if (forgotStep === 'otp') {
        setForgotStep('newpass');
      } else if (forgotStep === 'newpass') {
        await api.post('/auth/reset-password', { phoneNumber: resetPhone, otpCode: otp, newPassword: newPass });
        setResetMsg('Şifre başarıyla sıfırlandı!');
        setTimeout(() => { setForgotStep('off'); setResetMsg(''); }, 2000);
      }
    } catch (err: unknown) {
      setResetMsg(
        axios.isAxiosError(err)
          ? String((err.response?.data as { message?: string } | undefined)?.message ?? 'Hata')
          : 'Hata'
      );
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      <div className="flex-1 hidden lg:flex bg-gradient-to-br from-primary via-primary to-primary-dark relative overflow-hidden items-center justify-center text-white">
        <div className="relative z-10 p-20 max-w-2xl">
          <h1 className="text-6xl font-black mb-6 leading-tight">Yarınları Birlikte<br/>Yönetiyoruz.</h1>
          <p className="text-xl text-primary-100">Kentiva Yönetim Portalı ile şehrin nabzını tutun, sorunları anında çözüme kavuşturun.</p>
          
          <div className="mt-12 grid grid-cols-2 gap-8">
            <div className="p-6 bg-white/10 rounded-3xl border border-white/20 backdrop-blur-md">
              <p className="text-3xl font-bold">100%</p>
              <p className="text-primary-100 text-sm">Gerçek Zamanlı İzleme</p>
            </div>
            <div className="p-6 bg-white/10 rounded-3xl border border-white/20 backdrop-blur-md">
              <p className="text-3xl font-bold">24/7</p>
              <p className="text-primary-100 text-sm">Aktif Koordinasyon</p>
            </div>
          </div>
        </div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-accent/20 rounded-full -mr-48 -mt-48 blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-secondary/30 rounded-full -ml-48 -mb-48 blur-3xl"></div>
      </div>

      <div className="flex w-full items-center justify-center bg-white p-8 dark:bg-slate-900 lg:w-[500px]">
        <div className="w-full max-w-sm">
          <div className="mb-12">
            <div className="w-14 h-14 bg-gradient-to-br from-primary to-primary-dark rounded-2xl flex items-center justify-center text-white mb-6 shadow-xl shadow-primary/30 ring-1 ring-white/15">
              <Building2 size={30} />
            </div>
            <h2 className="mb-2 text-3xl font-bold text-slate-900 dark:text-white">Giriş Yapın</h2>
            <p className="text-slate-500 dark:text-slate-400">Yönetim yetkilerinizle devam edin.</p>
          </div>

          {forgotStep === 'off' ? (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="kentiva-label dark:text-slate-300">E-posta</label>
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="kentiva-input !rounded-2xl !py-3 dark:bg-slate-950"
                  placeholder="admin@belediye.gov.tr"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="kentiva-label dark:text-slate-300">Şifre</label>
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="kentiva-input !rounded-2xl !py-3 dark:bg-slate-950"
                  placeholder="••••••••"
                  required
                />
              </div>
              {error && <p className="kentiva-alert-error !rounded-xl">{error}</p>}
              <button type="submit" className="kentiva-btn-primary w-full !rounded-2xl !py-4">
                Devam Et
              </button>
              <button
                type="button"
                onClick={() => setForgotStep('phone')}
                className="w-full text-center text-sm font-semibold text-primary hover:underline mt-2"
              >
                Şifremi unuttum
              </button>
            </form>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center gap-2 text-primary">
                <Shield size={20} />
                <h3 className="text-lg font-bold">Şifre Sıfırlama</h3>
              </div>
              {forgotStep === 'phone' && (
                <div className="space-y-3">
                  <p className="text-sm text-slate-500">Hesabınıza kayıtlı telefon numarasını girin.</p>
                  <input
                    type="tel"
                    value={resetPhone}
                    onChange={(e) => setResetPhone(e.target.value)}
                    className="w-full bg-slate-50 border-slate-200 rounded-2xl py-3 px-4 focus:ring-2 focus:ring-primary outline-none"
                    placeholder="05XX XXX XX XX"
                  />
                </div>
              )}
              {forgotStep === 'otp' && (
                <div className="space-y-3">
                  <p className="text-sm text-slate-500">Telefonunuza gelen 6 haneli doğrulama kodunu girin.</p>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                    className="w-full bg-slate-50 border-slate-200 rounded-2xl py-3 px-4 text-center text-2xl tracking-[0.5em] font-bold focus:ring-2 focus:ring-primary outline-none"
                    placeholder="000000"
                  />
                </div>
              )}
              {forgotStep === 'newpass' && (
                <div className="space-y-3">
                  <p className="text-sm text-slate-500">Yeni şifrenizi belirleyin (en az 8 karakter).</p>
                  <input
                    type="password"
                    value={newPass}
                    onChange={(e) => setNewPass(e.target.value)}
                    className="w-full bg-slate-50 border-slate-200 rounded-2xl py-3 px-4 focus:ring-2 focus:ring-primary outline-none"
                    placeholder="Yeni şifre"
                    minLength={8}
                  />
                </div>
              )}
              {resetMsg && (
                <p className="text-sm font-semibold text-primary bg-primary/5 rounded-xl px-4 py-3">{resetMsg}</p>
              )}
              <div className="flex gap-3">
                <button
                  onClick={() => { setForgotStep('off'); setResetMsg(''); }}
                  className="flex-1 border border-slate-200 rounded-2xl py-3 font-semibold text-slate-600 hover:bg-slate-50 transition-all"
                >
                  İptal
                </button>
                <button
                  onClick={handleReset}
                  disabled={resetLoading}
                  className="flex-1 bg-primary text-white font-semibold rounded-2xl py-3 hover:bg-primary-hover shadow-lg shadow-primary/20 transition-all disabled:opacity-60"
                >
                  {resetLoading ? '...' :
                    forgotStep === 'phone' ? 'Kod Gönder' :
                    forgotStep === 'otp' ? 'Doğrula' :
                    'Şifreyi Değiştir'
                  }
                </button>
              </div>
            </div>
          )}

          <p className="mt-8 text-center text-sm text-slate-500">
            İlk kurulum mu?{' '}
            <Link to="/setup" className="font-semibold text-primary hover:underline">
              Süper admin oluştur
            </Link>
          </p>
          <p className="mt-12 text-center text-slate-400 text-sm font-medium">
            © 2026 Kentiva — Belediye Bildirim ve Takip Platformu
          </p>
        </div>
      </div>
    </div>
  );
};

export default App;
