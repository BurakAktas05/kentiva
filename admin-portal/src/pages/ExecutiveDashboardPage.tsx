import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  BarChart3,
  CheckCircle2,
  Clock,
  Copy,
  FileText,
  RefreshCw,
  Share2,
  Sparkles,
  TrendingUp,
  Users,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from 'recharts';
import api, { type Stats } from '../api';

/* ───── Types ───── */
type TimeRange = '24h' | '7d' | '30d';

type PilotSummary = {
  citizenUsers: number;
  totalReports: number;
  openReports: number;
  resolvedReports: number;
  reportsLast7Days: number;
  reportsLast30Days: number;
  resolutionRate: number;
  averageResolutionHours?: number | null;
  topCategories: { label: string; count: number }[];
  topDistricts: { label: string; count: number }[];
  executiveSummary: string;
  municipalityName: string;
  trialDay?: number | null;
  trialTotalDays?: number | null;
};

type Toast = { type: 'success' | 'error'; message: string } | null;

const numberFormat = new Intl.NumberFormat('tr-TR');
function fmt(n: number) {
  return numberFormat.format(n ?? 0);
}

const CHART_COLORS = ['#0ea5e9', '#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6'];

export default function ExecutiveDashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [pilot, setPilot] = useState<PilotSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<TimeRange>('7d');
  const [toast, setToast] = useState<Toast>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [statsRes, pilotRes] = await Promise.allSettled([
        api.get('/dashboard/stats'),
        api.get('/pilot/summary'),
      ]);
      if (statsRes.status === 'fulfilled') setStats(statsRes.value.data.data);
      if (pilotRes.status === 'fulfilled') setPilot(pilotRes.value.data.data);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 3500);
    return () => window.clearTimeout(timer);
  }, [toast]);

  /* ───── Derived KPIs ───── */
  const kpis = useMemo(() => {
    if (!stats && !pilot) return null;
    return {
      totalReports: stats?.totalReports ?? pilot?.totalReports ?? 0,
      openReports: (stats?.pendingReports ?? 0) + (stats?.processingReports ?? 0),
      resolvedReports: stats?.resolvedReports ?? pilot?.resolvedReports ?? 0,
      citizenUsers: pilot?.citizenUsers ?? 0,
      resolutionRate: pilot?.resolutionRate ?? (stats && stats.totalReports > 0
        ? Math.round((stats.resolvedReports / stats.totalReports) * 100)
        : 0),
      avgResolutionHours: pilot?.averageResolutionHours ?? null,
      satisfaction: stats?.averageSatisfaction ?? null,
      reportsLast7Days: pilot?.reportsLast7Days ?? 0,
      reportsLast30Days: pilot?.reportsLast30Days ?? 0,
    };
  }, [stats, pilot]);

  /* ───── Category chart data ───── */
  const categoryData = useMemo(() => {
    if (!pilot?.topCategories) return [];
    return pilot.topCategories.slice(0, 6).map((c) => ({
      name: c.label.length > 14 ? c.label.substring(0, 12) + '…' : c.label,
      value: c.count,
    }));
  }, [pilot]);

  /* ───── Share text ───── */
  const shareText = useMemo(() => {
    if (!kpis || !pilot) return '';
    const municipalityName = pilot.municipalityName || 'Belediye';
    const lines = [
      `📊 ${municipalityName} — Kentiva Özet Rapor`,
      `📅 ${new Date().toLocaleDateString('tr-TR')}`,
      '',
      `👥 Vatandaş kullanıcısı: ${fmt(kpis.citizenUsers)}`,
      `📋 Toplam ihbar: ${fmt(kpis.totalReports)}`,
      `⏳ Açık iş yükü: ${fmt(kpis.openReports)}`,
      `✅ Çözülen: ${fmt(kpis.resolvedReports)}`,
      `📈 Çözüm oranı: %${kpis.resolutionRate}`,
    ];
    if (kpis.avgResolutionHours != null) {
      lines.push(`⏱️ Ort. çözüm süresi: ${kpis.avgResolutionHours} saat`);
    }
    if (kpis.satisfaction != null) {
      lines.push(`⭐ Memnuniyet: ${Number(kpis.satisfaction).toFixed(1)} / 5.0`);
    }
    lines.push('', `Son 7 gün: ${fmt(kpis.reportsLast7Days)} ihbar`);
    lines.push(`Son 30 gün: ${fmt(kpis.reportsLast30Days)} ihbar`);
    lines.push('', '— Kentiva Akıllı Belediyecilik Platformu');
    return lines.join('\n');
  }, [kpis, pilot]);

  const copyShareText = async () => {
    try {
      await navigator.clipboard.writeText(shareText);
      setToast({ type: 'success', message: 'Özet kopyalandı — WhatsApp veya mesaj ile paylaşabilirsiniz.' });
    } catch {
      setToast({ type: 'error', message: 'Kopyalama yapılamadı.' });
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-6">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">Başkan özeti hazırlanıyor…</p>
        </div>
      </div>
    );
  }

  if (!kpis) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center p-6 text-sm font-semibold text-slate-500 dark:text-slate-400">
        Veriler yüklenemedi. Lütfen sayfayı yenileyin.
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* Toast */}
      {toast && (
        <div
          role="status"
          className={`fixed right-4 top-20 z-50 rounded-xl border px-4 py-3 text-sm font-bold shadow-lg ${
            toast.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-100'
              : 'border-red-200 bg-red-50 text-red-900 dark:border-red-800 dark:bg-red-950 dark:text-red-100'
          }`}
        >
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="kentiva-eyebrow">Yönetici özeti</p>
          <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
            {pilot?.municipalityName || 'Belediye'} Başkan Ekranı
          </h2>
          <p className="mt-1 text-sm font-medium text-slate-600 dark:text-slate-400">
            Tek bakışta operasyon durumu
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void load()}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Yenile
          </button>
          <button
            type="button"
            onClick={copyShareText}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-primary-hover"
          >
            <Share2 className="h-4 w-4" />
            Paylaş
          </button>
        </div>
      </div>

      {/* Time range selector */}
      <div className="flex gap-1 rounded-2xl border border-slate-200/90 bg-white p-1.5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        {(['24h', '7d', '30d'] as TimeRange[]).map((range) => {
          const labels: Record<TimeRange, string> = { '24h': 'Son 24 Saat', '7d': 'Son 7 Gün', '30d': 'Son 30 Gün' };
          return (
            <button
              key={range}
              type="button"
              onClick={() => setTimeRange(range)}
              className={`flex-1 rounded-xl py-2.5 text-xs font-bold transition-all ${
                timeRange === range
                  ? 'bg-primary text-white shadow-md'
                  : 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800'
              }`}
            >
              {labels[range]}
            </button>
          );
        })}
      </div>

      {/* KPI Cards — 2x3 grid, large numbers */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <KpiCard
          icon={Users}
          label="Vatandaş Kullanıcısı"
          value={fmt(kpis.citizenUsers)}
          color="bg-sky-50 text-sky-700 ring-sky-600/15 dark:bg-sky-950/40 dark:text-sky-200"
        />
        <KpiCard
          icon={FileText}
          label="Toplam İhbar"
          value={fmt(kpis.totalReports)}
          color="bg-indigo-50 text-indigo-700 ring-indigo-600/15 dark:bg-indigo-950/40 dark:text-indigo-200"
          sub={`Son 7g: ${fmt(kpis.reportsLast7Days)}`}
        />
        <KpiCard
          icon={AlertCircle}
          label="Açık İş Yükü"
          value={fmt(kpis.openReports)}
          color="bg-amber-50 text-amber-700 ring-amber-600/15 dark:bg-amber-950/40 dark:text-amber-200"
        />
        <KpiCard
          icon={CheckCircle2}
          label="Çözülen İhbar"
          value={fmt(kpis.resolvedReports)}
          color="bg-emerald-50 text-emerald-700 ring-emerald-600/15 dark:bg-emerald-950/40 dark:text-emerald-200"
        />
        <KpiCard
          icon={TrendingUp}
          label="Çözüm Oranı"
          value={`%${kpis.resolutionRate}`}
          color="bg-violet-50 text-violet-700 ring-violet-600/15 dark:bg-violet-950/40 dark:text-violet-200"
        />
        <KpiCard
          icon={Clock}
          label="Ort. Çözüm Süresi"
          value={kpis.avgResolutionHours != null ? `${kpis.avgResolutionHours}s` : '—'}
          color="bg-rose-50 text-rose-700 ring-rose-600/15 dark:bg-rose-950/40 dark:text-rose-200"
          sub={kpis.satisfaction != null ? `⭐ ${Number(kpis.satisfaction).toFixed(1)}` : undefined}
        />
      </div>

      {/* Category Chart + AI Summary */}
      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        {/* Chart */}
        <section className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-4 flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">En Yoğun Kategoriler</h3>
          </div>
          {categoryData.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-500">Henüz yeterli veri yok.</p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={categoryData} layout="vertical" margin={{ left: 0, right: 20, top: 5, bottom: 5 }}>
                <XAxis type="number" hide />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={110}
                  tick={{ fontSize: 12, fontWeight: 600, fill: '#64748b' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    background: '#0f172a',
                    border: 'none',
                    borderRadius: '12px',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: '#fff',
                  }}
                />
                <Bar dataKey="value" radius={[0, 8, 8, 0]} barSize={28}>
                  {categoryData.map((_entry, idx) => (
                    <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </section>

        {/* AI Summary */}
        <section className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-4 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">AI Özet</h3>
          </div>
          {pilot?.executiveSummary ? (
            <p className="text-sm font-semibold leading-7 text-slate-700 dark:text-slate-300">
              {pilot.executiveSummary}
            </p>
          ) : (
            <p className="text-sm text-slate-500">AI özeti henüz mevcut değil.</p>
          )}

          {/* Pilot day info */}
          {pilot?.trialDay != null && pilot?.trialTotalDays != null && (
            <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950/40">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Pilot ilerlemesi</span>
                <span className="text-xs font-extrabold text-primary">
                  {pilot.trialDay} / {pilot.trialTotalDays} gün
                </span>
              </div>
              <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-primary to-sky-400 transition-all"
                  style={{
                    width: `${Math.min(100, (pilot.trialDay / pilot.trialTotalDays) * 100)}%`,
                  }}
                />
              </div>
            </div>
          )}

          {/* Share section */}
          <div className="mt-5 border-t border-slate-200 pt-4 dark:border-slate-700">
            <button
              type="button"
              onClick={copyShareText}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 py-3 text-xs font-bold text-slate-700 transition-all hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              <Copy className="h-3.5 w-3.5" />
              Özeti kopyala — WhatsApp ile paylaşın
            </button>
          </div>
        </section>
      </div>

      {/* Top Districts */}
      {pilot?.topDistricts && pilot.topDistricts.length > 0 && (
        <section className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h3 className="mb-4 text-lg font-extrabold text-slate-900 dark:text-white">Bölge Yoğunluğu</h3>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {pilot.topDistricts.slice(0, 6).map((d, idx) => {
              const max = Math.max(1, ...pilot.topDistricts.map((r) => r.count));
              return (
                <div key={d.label} className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-bold text-slate-900 dark:text-white">{d.label}</span>
                    <span className="text-xs font-bold text-slate-500">{fmt(d.count)}</span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${Math.max(8, (d.count / max) * 100)}%`,
                        backgroundColor: CHART_COLORS[idx % CHART_COLORS.length],
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}

/* ───── KPI Card Component ───── */
function KpiCard({
  icon: Icon,
  label,
  value,
  color,
  sub,
}: {
  icon: typeof Users;
  label: string;
  value: string;
  color: string;
  sub?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm transition-all hover:shadow-md dark:border-slate-800 dark:bg-slate-900 sm:p-5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 sm:text-xs">
            {label}
          </p>
          <p className="mt-2 text-2xl font-extrabold tabular-nums text-slate-900 dark:text-white sm:text-3xl">
            {value}
          </p>
          {sub && (
            <p className="mt-1 text-[10px] font-semibold text-slate-500 dark:text-slate-400 sm:text-xs">{sub}</p>
          )}
        </div>
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1 ${color}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}
