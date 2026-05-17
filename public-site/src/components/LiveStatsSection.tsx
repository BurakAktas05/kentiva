import { Link } from 'react-router-dom';
import {
  Activity,
  BarChart3,
  CheckCircle2,
  Map,
  RefreshCw,
  Radio,
  Building2,
  ChevronRight,
} from 'lucide-react';
import { useLivePublicStats } from '../hooks/useLivePublicStats';
import { StatCard } from './StatCard';

function formatTime(d: Date | null) {
  if (!d) return null;
  return d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function formatMonthLabel(month: string) {
  const [y, m] = month.split('-');
  if (!y || !m) return month;
  const date = new Date(Number(y), Number(m) - 1, 1);
  return date.toLocaleDateString('tr-TR', { month: 'short', year: 'numeric' });
}

export function LiveStatsSection() {
  const stats = useLivePublicStats();
  const { overview, municipalities, categories, monthly, loading, refreshing, error, lastUpdated, refresh } =
    stats;

  const maxCategory = Math.max(1, ...categories.map((c) => c.count));
  const recentMonthly = [...monthly].slice(-6);

  return (
    <section
      id="istatistikler"
      className="border-b border-slate-200/90 bg-slate-50 py-16 sm:py-20"
      aria-labelledby="stats-heading"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <p className="inline-flex items-center gap-2 rounded-full border border-emerald-200/80 bg-emerald-50 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-emerald-800">
              <Radio className="h-3.5 w-3.5" aria-hidden />
              Canlı veri
            </p>
            <h2
              id="stats-heading"
              className="mt-3 font-sans text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl"
            >
              Platform özet verileri
            </h2>
            <p className="mt-3 text-base font-medium text-slate-600">
              Aşağıdaki değerler, kamu istatistiği paylaşımına açık belediyeler için birleştirilmiş ve kişisel
              veri içermeyen toplu istatistiklerdir. Veriler yaklaşık 45 saniyede bir yenilenir.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {lastUpdated && (
              <p className="text-xs font-medium text-slate-500" aria-live="polite">
                Son güncelleme: {formatTime(lastUpdated)}
                {refreshing && (
                  <span className="ml-2 inline-flex items-center gap-1 text-primary">
                    <RefreshCw className="h-3 w-3 animate-spin" aria-hidden />
                    yenileniyor
                  </span>
                )}
              </p>
            )}
            <button
              type="button"
              onClick={refresh}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} aria-hidden />
              Yenile
            </button>
          </div>
        </div>

        {error && (
          <div
            className="mt-8 max-w-xl rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800"
            role="alert"
          >
            {error}
            <button
              type="button"
              onClick={refresh}
              className="ml-2 font-bold underline underline-offset-2"
            >
              Tekrar dene
            </button>
          </div>
        )}

        <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            icon={<Map className="h-5 w-5 text-primary" aria-hidden />}
            label="Kayıtlı belediye sayısı"
            value={loading && !overview ? '-' : (overview?.onboardedMunicipalityCount ?? 0)}
          />
          <StatCard
            icon={<Activity className="h-5 w-5 text-primary" aria-hidden />}
            label="Toplam bildirim"
            value={loading && !overview ? '-' : (overview?.totalReports ?? 0)}
          />
          <StatCard
            icon={<CheckCircle2 className="h-5 w-5 text-primary" aria-hidden />}
            label="Çözülen bildirim"
            value={loading && !overview ? '-' : (overview?.resolvedReports ?? 0)}
          />
          <StatCard
            icon={<BarChart3 className="h-5 w-5 text-primary" aria-hidden />}
            label="Çözüm oranı"
            value={loading && !overview ? '-' : (overview?.resolutionRatePercent ?? 0)}
            suffix="%"
          />
        </div>

        <div className="mt-12 grid gap-8 lg:grid-cols-2">
          <article className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm">
            <h3 className="font-sans text-lg font-bold text-slate-900">Kategori dağılımı</h3>
            <p className="mt-1 text-sm font-medium text-slate-500">En sık bildirilen konu başlıkları</p>
            {categories.length === 0 && !loading ? (
              <p className="mt-6 text-sm text-slate-500">Henüz veri yok.</p>
            ) : (
              <ul className="mt-6 space-y-3" aria-label="Kategori istatistikleri">
                {categories.slice(0, 8).map((c) => (
                  <li key={c.categoryName}>
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className="font-semibold text-slate-800">{c.categoryName}</span>
                      <span className="tabular-nums font-bold text-slate-600">{c.count}</span>
                    </div>
                    <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-primary to-secondary transition-all duration-500"
                        style={{ width: `${Math.round((c.count / maxCategory) * 100)}%` }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </article>

          <article className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm">
            <h3 className="font-sans text-lg font-bold text-slate-900">Aylık trend</h3>
            <p className="mt-1 text-sm font-medium text-slate-500">Açılan ve çözülen bildirimler</p>
            {recentMonthly.length === 0 && !loading ? (
              <p className="mt-6 text-sm text-slate-500">Henüz veri yok.</p>
            ) : (
              <div className="mt-6 overflow-x-auto">
                <table className="w-full min-w-[280px] text-left text-sm">
                  <caption className="sr-only">Aylık açılan ve çözülen bildirim sayıları</caption>
                  <thead>
                    <tr className="border-b border-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      <th scope="col" className="pb-2 pr-4">
                        Ay
                      </th>
                      <th scope="col" className="pb-2 pr-4 text-right">
                        Açılan
                      </th>
                      <th scope="col" className="pb-2 text-right">
                        Çözülen
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentMonthly.map((row) => (
                      <tr key={row.month} className="border-b border-slate-50 last:border-0">
                        <th scope="row" className="py-2.5 pr-4 font-semibold text-slate-800">
                          {formatMonthLabel(row.month)}
                        </th>
                        <td className="py-2.5 pr-4 text-right tabular-nums text-slate-600">{row.opened}</td>
                        <td className="py-2.5 text-right tabular-nums font-semibold text-emerald-700">
                          {row.resolved}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </article>
        </div>

        {municipalities.length > 0 && (
          <article className="mt-10 rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h3 className="font-sans text-lg font-bold text-slate-900">Belediye bazlı özet</h3>
                <p className="mt-1 text-sm font-medium text-slate-500">
                  Kamu istatistiği paylaşımına açık belediyeler
                </p>
              </div>
              <Link
                to="/#istatistikler"
                className="text-sm font-bold text-primary hover:underline underline-offset-4"
              >
                Tüm belediyeler
              </Link>
            </div>
            <ul className="mt-6 divide-y divide-slate-100" aria-label="Belediye istatistik listesi">
              {municipalities.slice(0, 12).map((m) => {
                const rate =
                  m.totalReports > 0 ? Math.round((m.resolvedReports / m.totalReports) * 100) : 0;
                return (
                  <li key={m.slug}>
                    <Link
                      to={`/belediye/${m.slug}`}
                      className="group flex flex-wrap items-center justify-between gap-3 py-3 transition-colors hover:bg-slate-50/80 -mx-2 px-2 rounded-xl"
                    >
                      <span className="inline-flex items-center gap-2 font-semibold text-slate-900 group-hover:text-primary">
                        <Building2 className="h-4 w-4 text-slate-400 group-hover:text-primary" aria-hidden />
                        {m.displayName}
                      </span>
                      <span className="flex items-center gap-4 text-sm tabular-nums text-slate-600">
                        <span>
                          <span className="font-bold text-slate-900">{m.totalReports}</span> bildirim
                        </span>
                        <span className="text-emerald-700 font-semibold">%{rate} çözüm</span>
                        <ChevronRight
                          className="h-4 w-4 text-slate-400 group-hover:text-primary"
                          aria-hidden
                        />
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </article>
        )}
      </div>
    </section>
  );
}
