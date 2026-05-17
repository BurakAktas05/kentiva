import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  CalendarClock,
  CheckCircle2,
  FileText,
  Sparkles,
  Users,
  XCircle,
} from 'lucide-react';
import api from '../api';
import DashboardLoadingSkeleton from '../components/DashboardLoadingSkeleton';
import PlatformStatCard from '../components/PlatformStatCard';

type MembershipStatus =
  | 'ACTIVE'
  | 'TRIAL'
  | 'EXPIRING_SOON'
  | 'EXPIRED'
  | 'SUSPENDED';

type TenantRow = {
  id: string;
  name: string;
  displayName: string;
  slug: string;
  active: boolean;
  onboarded: boolean;
  subscriptionPlan: string;
  subscriptionEndsAt: string | null;
  daysRemaining: number | null;
  membershipStatus: MembershipStatus;
  userCount: number;
  reportCount: number;
  createdAt: string;
};

type PlatformDashboard = {
  summary: {
    totalMunicipalities: number;
    activeMunicipalities: number;
    trialMunicipalities: number;
    expiringWithin7Days: number;
    expiredMunicipalities: number;
    suspendedMunicipalities: number;
    totalStaffUsers: number;
    totalReports: number;
  };
  tenants: TenantRow[];
};

const statusLabel: Record<MembershipStatus, string> = {
  ACTIVE: 'Aktif',
  TRIAL: 'Deneme',
  EXPIRING_SOON: 'Yakında bitiyor',
  EXPIRED: 'Süresi doldu',
  SUSPENDED: 'Askıda',
};

function statusClass(status: MembershipStatus): string {
  switch (status) {
    case 'ACTIVE':
      return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200';
    case 'TRIAL':
      return 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-200';
    case 'EXPIRING_SOON':
      return 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200';
    case 'EXPIRED':
      return 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200';
    case 'SUSPENDED':
      return 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200';
    default:
      return 'bg-slate-100 text-slate-700';
  }
}

function formatDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('tr-TR');
}

export default function SuperAdminHomePage() {
  const [data, setData] = useState<PlatformDashboard | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    api
      .get('/admin/platform/dashboard')
      .then((res) => setData(res.data.data as PlatformDashboard))
      .catch(() => setError('Platform özeti yüklenemedi.'));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (error) {
    return (
      <div className="p-6">
        <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
          {error}
        </p>
      </div>
    );
  }

  if (!data) {
    return <DashboardLoadingSkeleton />;
  }

  const { summary, tenants } = data;

  const statCards = [
    {
      name: 'Belediye',
      value: summary.totalMunicipalities,
      sub: `${summary.activeMunicipalities} aktif`,
      icon: Building2,
      wrap: 'bg-primary/10 text-primary ring-primary/15',
    },
    {
      name: 'Deneme',
      value: summary.trialMunicipalities,
      sub: 'TRIAL plan',
      icon: CalendarClock,
      wrap: 'bg-sky-50 text-sky-700 ring-sky-600/15 dark:bg-sky-950/40 dark:text-sky-200',
    },
    {
      name: '7 gün içinde biten',
      value: summary.expiringWithin7Days,
      sub: 'yenileme gerekli',
      icon: AlertTriangle,
      wrap: 'bg-amber-50 text-amber-700 ring-amber-600/15 dark:bg-amber-950/40 dark:text-amber-200',
    },
    {
      name: 'Süresi dolan',
      value: summary.expiredMunicipalities,
      sub: `${summary.suspendedMunicipalities} askıda`,
      icon: XCircle,
      wrap: 'bg-red-50 text-red-700 ring-red-600/15 dark:bg-red-950/40 dark:text-red-200',
    },
    {
      name: 'Personel hesabı',
      value: summary.totalStaffUsers,
      sub: 'tüm tenant',
      icon: Users,
      wrap: 'bg-slate-100 text-slate-700 ring-slate-300/50 dark:bg-slate-800 dark:text-slate-200',
    },
    {
      name: 'Toplam ihbar',
      value: summary.totalReports,
      sub: 'platform geneli',
      icon: FileText,
      wrap: 'bg-slate-100 text-slate-700 ring-slate-300/50 dark:bg-slate-800 dark:text-slate-200',
    },
  ];

  return (
    <div className="space-y-8 p-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="kentiva-eyebrow">
            Platform yönetimi
          </p>
          <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Kentiva operatör dashboard
          </h2>
          <p className="mt-2 max-w-2xl text-sm font-medium text-slate-600 dark:text-slate-400">
            Kayıtlı belediyeler, üyelik planı ve kalan günler. Yeni tenant için kurulum sihirbazını kullanın.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            to="/admin/onboarding"
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary-hover"
          >
            <Sparkles size={17} />
            Kurulum sihirbazı
          </Link>
          <Link
            to="/admin/municipalities"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200/90 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 shadow-sm transition-colors hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
          >
            Belediye yönetimi
            <ArrowRight size={16} />
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {statCards.map((stat) => (
          <PlatformStatCard
            key={stat.name}
            name={stat.name}
            value={stat.value}
            sub={stat.sub}
            icon={stat.icon}
            iconWrap={stat.wrap}
          />
        ))}
      </div>

      <div className="rounded-2xl border border-slate-200/90 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-3 dark:border-slate-800">
          <h3 className="font-bold text-slate-900 dark:text-white">Belediye üyelikleri</h3>
          <p className="text-xs font-medium text-slate-500">Bitiş tarihine göre sıralı</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[880px] text-sm">
            <thead className="bg-slate-50 text-left dark:bg-slate-800/80">
              <tr>
                <th className="p-3 font-semibold">Belediye</th>
                <th className="p-3 font-semibold">Durum</th>
                <th className="p-3 font-semibold">Plan</th>
                <th className="p-3 font-semibold">Kalan gün</th>
                <th className="p-3 font-semibold">Bitiş</th>
                <th className="p-3 font-semibold">Kullanıcı</th>
                <th className="p-3 font-semibold">İhbar</th>
                <th className="p-3 font-semibold">Onboarding</th>
              </tr>
            </thead>
            <tbody>
              {tenants.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-500">
                    Henüz belediye yok.{' '}
                    <Link to="/admin/onboarding" className="font-semibold text-primary hover:underline">
                      İlk kurulumu başlatın
                    </Link>
                  </td>
                </tr>
              ) : (
                tenants.map((t) => (
                  <tr key={t.id} className="border-t border-slate-100 dark:border-slate-800">
                    <td className="p-3">
                      <p className="font-semibold text-slate-900 dark:text-white">{t.displayName || t.name}</p>
                      <p className="text-xs text-slate-500">{t.slug}</p>
                    </td>
                    <td className="p-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${statusClass(t.membershipStatus)}`}
                      >
                        {statusLabel[t.membershipStatus]}
                      </span>
                    </td>
                    <td className="p-3 font-medium">{t.subscriptionPlan}</td>
                    <td className="p-3 tabular-nums font-semibold">
                      {t.daysRemaining == null ? '—' : t.daysRemaining < 0 ? `${t.daysRemaining}` : t.daysRemaining}
                    </td>
                    <td className="p-3 text-slate-600 dark:text-slate-400">{formatDate(t.subscriptionEndsAt)}</td>
                    <td className="p-3 tabular-nums">{t.userCount}</td>
                    <td className="p-3 tabular-nums">{t.reportCount}</td>
                    <td className="p-3">
                      {t.onboarded ? (
                        <CheckCircle2 size={16} className="text-emerald-600" aria-label="Tamam" />
                      ) : (
                        <span className="text-amber-600 text-xs font-semibold">Bekliyor</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}


