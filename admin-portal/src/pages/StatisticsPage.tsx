import { useEffect, useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { AlertTriangle, Sparkles, TrendingUp } from 'lucide-react';
import axios from 'axios';
import api, { type PredictiveInsight, type ReportListItem, type SpringPage, type Stats } from '../api';
import { REPORT_STATUS_CHART_COLORS, themeHex } from '../lib/ui';

function riskCardClass(risk: PredictiveInsight['riskLevel']) {
  if (risk === 'HIGH') return 'border-red-200/80 bg-red-50/80 dark:border-red-900/50 dark:bg-red-950/30';
  if (risk === 'MEDIUM') return 'border-amber-200/80 bg-amber-50/80 dark:border-amber-900/50 dark:bg-amber-950/30';
  return 'border-slate-200/80 bg-slate-50/80 dark:border-slate-700 dark:bg-slate-800/40';
}

function riskBadgeClass(risk: PredictiveInsight['riskLevel']) {
  if (risk === 'HIGH') return 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200';
  if (risk === 'MEDIUM') return 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200';
  return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
}

function riskLabel(risk: PredictiveInsight['riskLevel']) {
  if (risk === 'HIGH') return 'Yüksek';
  if (risk === 'MEDIUM') return 'Orta';
  return 'Düşük';
}

export default function StatisticsPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [categoryRows, setCategoryRows] = useState<{ name: string; value: number }[]>([]);
  const [insights, setInsights] = useState<PredictiveInsight[]>([]);
  const [insightsNote, setInsightsNote] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setError(null);
        const [statsRes, reportsRes, insightsRes] = await Promise.all([
          api.get('/dashboard/stats'),
          api.get('/reports', { params: { page: 0, size: 500, sort: 'createdAt,desc' } }),
          api.get('/dashboard/predictive-insights').catch((err) => ({ error: err })),
        ]);
        if (cancelled) return;
        setStats(statsRes.data.data as Stats);
        if ('error' in insightsRes) {
          const err = insightsRes.error;
          if (axios.isAxiosError(err)) {
            const code = (err.response?.data as { errorCode?: string } | undefined)?.errorCode;
            const msg = (err.response?.data as { message?: string } | undefined)?.message;
            if (code === 'MUNICIPALITY_REQUIRED') {
              setInsightsNote(msg ?? 'Tahminsel analiz yalnızca belediye hesapları için kullanılabilir.');
            }
          }
          setInsights([]);
        } else {
          setInsights((insightsRes.data.data as PredictiveInsight[]) ?? []);
          setInsightsNote(null);
        }
        const page = reportsRes.data.data as SpringPage<ReportListItem>;
        const map = new Map<string, number>();
        for (const r of page.content ?? []) {
          const key = r.categoryName || 'Diğer';
          map.set(key, (map.get(key) ?? 0) + 1);
        }
        setCategoryRows(
          [...map.entries()]
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 8)
        );
      } catch {
        if (!cancelled) setError('İstatistikler yüklenemedi. Lütfen sayfayı yenileyin.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const statusPie = useMemo(() => {
    if (!stats) return [];
    return [
      { name: 'Bekleyen', key: 'PENDING', value: stats.pendingReports },
      { name: 'Yönlendirilen', key: 'FORWARDED', value: stats.forwardedReports ?? 0 },
      { name: 'İşleniyor', key: 'PROCESSING', value: stats.processingReports },
      { name: 'Çözülen', key: 'RESOLVED', value: stats.resolvedReports },
      { name: 'Red', key: 'REJECTED', value: stats.rejectedReports },
    ].filter((d) => d.value > 0);
  }, [stats]);

  if (error) {
    return (
      <div className="p-6">
        <p className="text-sm font-medium text-red-600 dark:text-red-400">{error}</p>
      </div>
    );
  }

  if (loading || !stats) {
    return (
      <div className="p-6">
        <p className="text-slate-500">İstatistikler yükleniyor…</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-6">
      <div>
        <p className="kentiva-eyebrow">Analitik</p>
        <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">İstatistikler</h2>
        <p className="mt-1 text-sm font-medium text-slate-600 dark:text-slate-400">Özet KPI, tahminsel uyarılar ve kategori dağılımı.</p>
      </div>

      <section className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <InsightsHeader />
        {insightsNote ? (
          <p className="text-sm text-amber-800 dark:text-amber-200">{insightsNote}</p>
        ) : insights.length === 0 ? (
          <p className="text-sm text-slate-500">Şu an öne çıkan yoğunluk veya trend uyarısı yok.</p>
        ) : (
          <ul className="space-y-3">
            {insights.map((item, idx) => (
              <li
                key={`${item.categoryName}-${item.district}-${idx}`}
                className={`rounded-xl border p-4 ${riskCardClass(item.riskLevel)}`}
              >
                <InsightRow item={item} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Toplam rapor', value: stats.totalReports },
          { label: 'Kullanıcı', value: stats.totalUsers },
          { label: 'Departman', value: stats.totalDepartments },
          { label: 'Kategori', value: stats.totalCategories },
        ].map((c) => (
          <div key={c.label} className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{c.label}</p>
            <p className="mt-2 text-2xl font-extrabold tabular-nums text-slate-900 dark:text-white">{c.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h3 className="mb-4 border-b border-slate-100 pb-3 text-base font-bold text-slate-900 dark:border-slate-800 dark:text-white">Durum dağılımı</h3>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={statusPie} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                  {statusPie.map((entry) => (
                    <Cell key={entry.key} fill={REPORT_STATUS_CHART_COLORS[entry.key] ?? themeHex.muted} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [`${value ?? 0}`, 'Adet']} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h3 className="mb-4 border-b border-slate-100 pb-3 text-base font-bold text-slate-900 dark:border-slate-800 dark:text-white">Kategori (son 500 rapor)</h3>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryRows} layout="vertical" margin={{ left: 8, right: 16 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-700" />
                <XAxis type="number" />
                <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(value) => [`${value ?? 0}`, 'Rapor']} />
                <Bar dataKey="value" fill={themeHex.primary} radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

function InsightRow({ item }: { item: PredictiveInsight }) {
  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-bold text-slate-900 dark:text-white">{item.categoryName}</p>
          <p className="text-xs font-medium text-slate-500">{item.district || 'Genel'}</p>
        </div>
        <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${riskBadgeClass(item.riskLevel)}`}>
          {riskLabel(item.riskLevel)}
        </span>
      </div>
      <div className="mt-3 flex flex-wrap gap-4 text-xs font-medium text-slate-600 dark:text-slate-400">
        <span>Son 30 gün: {item.recentCount}</span>
        <span>Önceki: {item.previousCount}</span>
        <span>Açık: {item.openCount}</span>
        <span>Trend: ×{item.trendRatio}</span>
      </div>
      <p className="mt-3 flex gap-2 text-sm text-slate-700 dark:text-slate-300">
        <AlertTriangle size={16} className="mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" />
        {item.recommendation}
      </p>
    </>
  );
}

function InsightsHeader() {
  return (
    <div className="mb-4 flex items-center gap-2 border-b border-slate-100 pb-3 dark:border-slate-800">
      <TrendingUp size={18} className="text-primary" />
      <h3 className="text-base font-bold text-slate-900 dark:text-white">Tahminsel bakım uyarıları</h3>
      <Sparkles size={16} className="text-sky-500" />
    </div>
  );
}
