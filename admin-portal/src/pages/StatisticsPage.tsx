import { useEffect, useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import api, { type ReportListItem, type SpringPage, type Stats } from '../api';

const STATUS_COLORS: Record<string, string> = {
  PENDING: '#d97706',
  PROCESSING: '#0ea5e9',
  RESOLVED: '#059669',
  REJECTED: '#dc2626',
};

export default function StatisticsPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [categoryRows, setCategoryRows] = useState<{ name: string; value: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [statsRes, reportsRes] = await Promise.all([
          api.get('/dashboard/stats'),
          api.get('/reports', { params: { page: 0, size: 500, sort: 'createdAt,desc' } }),
        ]);
        if (cancelled) return;
        setStats(statsRes.data.data as Stats);
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
      { name: 'İşleniyor', key: 'PROCESSING', value: stats.processingReports },
      { name: 'Çözülen', key: 'RESOLVED', value: stats.resolvedReports },
      { name: 'Red', key: 'REJECTED', value: stats.rejectedReports },
    ].filter((d) => d.value > 0);
  }, [stats]);

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
        <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">Analitik</p>
        <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">İstatistikler</h2>
        <p className="mt-1 text-sm font-medium text-slate-600 dark:text-slate-400">Özet KPI ve kategori dağılımı.</p>
      </div>

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
                    <Cell key={entry.key} fill={STATUS_COLORS[entry.key] ?? '#94a3b8'} />
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
                <Bar dataKey="value" fill="#0b4f9c" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
