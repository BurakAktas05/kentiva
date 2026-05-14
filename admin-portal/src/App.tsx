import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
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
  CheckCircle2,
  Clock,
  AlertCircle,
  Moon,
  Sun,
  Settings as SettingsIcon,
  MapPinned,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import api, { type Stats } from './api';
import LiveMap from './LiveMap';
import ReportsPage from './pages/ReportsPage';
import ReportDetailPage from './pages/ReportDetailPage';
import StatisticsPage from './pages/StatisticsPage';
import DepartmentsPage from './pages/DepartmentsPage';
import UsersPage from './pages/UsersPage';
import MunicipalitySettingsPage from './pages/MunicipalitySettingsPage';
import SuperAdminMunicipalitiesPage from './pages/SuperAdminMunicipalitiesPage';

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
  const baseItems = [
    { name: 'Dashboard', icon: LayoutDashboard, path: '/' },
    { name: 'Raporlar', icon: FileText, path: '/reports' },
    { name: 'Personeller', icon: Users, path: '/staff' },
    { name: 'Departmanlar', icon: Building2, path: '/departments' },
    { name: 'İstatistikler', icon: PieChart, path: '/stats' },
  ];
  const extra: { name: string; icon: typeof LayoutDashboard; path: string }[] = [];
  if (user.roles.includes('ROLE_ADMIN') && user.municipality) {
    extra.push({ name: 'Belediye ayarları', icon: SettingsIcon, path: '/municipality-settings' });
  }
  if (user.roles.includes('ROLE_SUPER_ADMIN')) {
    extra.push({ name: 'Belediyeler', icon: MapPinned, path: '/admin/municipalities' });
  }
  const menuItems = [...baseItems, ...extra];

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
            onClick={() => { localStorage.clear(); window.location.href = '/login'; }}
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
  return (
    <header className="sticky top-0 z-40 flex h-[4.25rem] items-center justify-between border-b border-slate-200/90 bg-white/95 px-4 backdrop-blur-md sm:px-6 dark:border-slate-800 dark:bg-slate-900/95">
      <button type="button" onClick={() => setSidebarOpen(true)} className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden dark:text-slate-300 dark:hover:bg-slate-800">
        <Menu />
      </button>

      <div className="hidden w-full max-w-md items-center gap-2 rounded-xl border border-slate-200/90 bg-slate-50/90 px-3 py-2 dark:border-slate-700 dark:bg-slate-800/50 md:flex">
        <Search size={17} className="shrink-0 text-slate-400" />
        <input
          type="search"
          placeholder="Rapor ara…"
          className="w-full border-0 bg-transparent text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:ring-0 dark:text-slate-100"
        />
      </div>

      <div className="flex items-center gap-1 sm:gap-2">
        <button
          type="button"
          onClick={onToggleDark}
          className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
          title={darkMode ? 'Açık tema' : 'Koyu tema'}
        >
          {darkMode ? <Sun size={19} /> : <Moon size={19} />}
        </button>
        <button type="button" className="relative rounded-lg p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800">
          <Bell size={19} />
          <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-red-500 ring-2 ring-white dark:ring-slate-900" />
        </button>
        <div className="mx-1 hidden h-7 w-px bg-slate-200 sm:block dark:bg-slate-700" />
        <div className="hidden items-center gap-2 rounded-lg border border-transparent px-2 py-1 sm:flex dark:hover:border-slate-700">
          <div className="h-8 w-8 shrink-0 rounded-lg bg-primary/15 ring-1 ring-primary/10 dark:bg-primary/25" />
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Yönetici</span>
        </div>
      </div>
    </header>
  );
};

const DashboardSkeleton = () => (
  <div className="space-y-8 p-6">
    <div className="h-9 w-56 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700" />
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="h-32 animate-pulse rounded-2xl border border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-900" />
      ))}
    </div>
    <div className="h-[420px] animate-pulse rounded-2xl border border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-900" />
  </div>
);

const Dashboard = ({ user }: { user: User }) => {
  const [stats, setStats] = useState<Stats | null>(null);
  const [statsError, setStatsError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get('/dashboard/stats')
      .then((res) => setStats(res.data.data))
      .catch(() => setStatsError('İstatistikler alınamadı.'));
  }, []);

  if (statsError) {
    return (
      <div className="p-6">
        <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">{statsError}</p>
      </div>
    );
  }

  if (!stats) return <DashboardSkeleton />;

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
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">Özet</p>
          <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">Hoş geldiniz</h2>
          <p className="mt-1 text-sm font-medium text-slate-600 dark:text-slate-400">Operasyon özeti ve canlı harita.</p>
        </div>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200/90 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 shadow-sm transition-colors hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
        >
          <Download size={17} />
          Dışa aktar
        </button>
      </div>

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
            <LiveMap centerLat={user.municipality?.centerLat} centerLng={user.municipality?.centerLng} zoom={user.municipality?.defaultZoom} />
          </div>
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary via-primary to-primary-dark p-6 text-white shadow-lg shadow-primary/15 sm:p-8">
          <div className="relative z-10">
            <h3 className="text-lg font-bold">Duyuru</h3>
            <p className="mt-1 text-sm font-medium text-primary-100">Personele metin duyurusu (yakında).</p>
            <textarea 
              className="mb-4 mt-5 h-32 w-full resize-none rounded-xl border border-white/20 bg-white/10 p-3 text-sm font-medium text-white placeholder:text-white/45 focus:outline-none focus:ring-2 focus:ring-white/25"
              placeholder="Mesajınızı yazın…"
            ></textarea>
            <button type="button" className="w-full rounded-xl bg-white py-2.5 text-sm font-bold text-primary transition-colors hover:bg-slate-50">
              Yayınla
            </button>
          </div>
          <div className="pointer-events-none absolute -right-16 top-0 h-40 w-40 rounded-full bg-white/10 blur-3xl" aria-hidden />
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
        localStorage.clear();
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
                  <Routes>
                    <Route path="/" element={<Dashboard user={user} />} />
                    <Route path="/reports" element={<ReportsPage />} />
                    <Route path="/reports/:id" element={<ReportDetailPage />} />
                    <Route path="/stats" element={<StatisticsPage />} />
                    <Route
                      path="/staff"
                      element={<UsersPage />}
                    />
                    <Route path="/departments" element={<DepartmentsPage />} />
                    <Route path="/municipality-settings" element={<MunicipalitySettingsPage />} />
                    <Route path="/admin/municipalities" element={<SuperAdminMunicipalitiesPage />} />
                  </Routes>
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.post('/auth/login', { email, password });
      localStorage.setItem('token', res.data.data.accessToken);
      onLogin(res.data.data);
    } catch (err: unknown) {
      setError(
        axios.isAxiosError(err)
          ? String((err.response?.data as { message?: string } | undefined)?.message ?? 'Giriş yapılamadı')
          : 'Giriş yapılamadı'
      );
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

      <div className="w-full lg:w-[500px] bg-white flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <div className="mb-12">
            <div className="w-14 h-14 bg-gradient-to-br from-primary to-primary-dark rounded-2xl flex items-center justify-center text-white mb-6 shadow-xl shadow-primary/30 ring-1 ring-white/15">
              <Building2 size={30} />
            </div>
            <h2 className="text-3xl font-bold mb-2">Giriş Yapın</h2>
            <p className="text-slate-500">Yönetim yetkilerinizle devam edin.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">E-posta</label>
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-50 border-slate-200 rounded-2xl py-3 px-4 focus:ring-2 focus:ring-primary focus:bg-white transition-all outline-none"
                placeholder="admin@ibb.gov.tr"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Şifre</label>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-50 border-slate-200 rounded-2xl py-3 px-4 focus:ring-2 focus:ring-primary focus:bg-white transition-all outline-none"
                placeholder="••••••••"
                required
              />
            </div>
            {error && <p className="text-red-500 text-sm font-medium">{error}</p>}
            <button className="w-full bg-primary text-white font-bold py-4 rounded-2xl hover:bg-primary-hover shadow-lg shadow-primary/20 transition-all hover:-translate-y-0.5 active:translate-y-0">
              Devam Et
            </button>
          </form>

          <p className="mt-12 text-center text-slate-400 text-sm font-medium">
            © 2026 Kentiva — Belediye Bildirim ve Takip Platformu
          </p>
        </div>
      </div>
    </div>
  );
};

export default App;
