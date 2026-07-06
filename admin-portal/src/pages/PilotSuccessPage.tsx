import { useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  CheckCircle2,
  Clipboard,
  Copy,
  Download,
  FileText,
  Megaphone,
  Printer,
  RefreshCw,
  TrendingUp,
  Users,
} from 'lucide-react';
import api from '../api';

type MetricRow = {
  label: string;
  count: number;
};

type DepartmentRow = {
  departmentName: string;
  totalReports: number;
  resolvedReports: number;
  openReports: number;
};

type PilotSummary = {
  municipalityId: string;
  municipalityName: string;
  municipalitySlug: string;
  subscriptionPlan?: string | null;
  subscriptionEndsAt?: string | null;
  daysRemaining?: number | null;
  trialDay?: number | null;
  trialTotalDays?: number | null;
  citizenUsers: number;
  totalReports: number;
  openReports: number;
  pendingReports: number;
  processingReports: number;
  forwardedReports: number;
  resolvedReports: number;
  rejectedReports: number;
  outOfJurisdictionReports: number;
  reportsLast7Days: number;
  reportsLast30Days: number;
  resolvedLast30Days: number;
  resolutionRate: number;
  averageResolutionHours?: number | null;
  topCategories: MetricRow[];
  topDistricts: MetricRow[];
  departmentPerformance: DepartmentRow[];
  executiveSummary: string;
};

type Toast = { type: 'success' | 'error'; message: string } | null;

const numberFormat = new Intl.NumberFormat('tr-TR');

function formatNumber(value: number) {
  return numberFormat.format(value ?? 0);
}

function formatDate(value?: string | null) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('tr-TR');
}

function getCitizenBaseUrl() {
  const env = import.meta.env as Record<string, string | undefined>;
  return env.VITE_CITIZEN_APP_URL || env.VITE_PUBLIC_APP_URL || window.location.origin;
}

function buildCitizenLink(summary: PilotSummary | null) {
  if (!summary) return '';
  try {
    const url = new URL('/', getCitizenBaseUrl());
    url.searchParams.set('municipality', summary.municipalitySlug);
    return url.toString();
  } catch {
    return `${getCitizenBaseUrl()}?municipality=${summary.municipalitySlug}`;
  }
}

export default function PilotSuccessPage() {
  const [summary, setSummary] = useState<PilotSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<Toast>(null);

  const citizenLink = useMemo(() => buildCitizenLink(summary), [summary]);
  const embedCode = useMemo(() => {
    if (!summary || !citizenLink) return '';
    return `<a href="${citizenLink}" target="_blank" rel="noopener">Kentiva ile ${summary.municipalityName} ihbar hattına bildir</a>`;
  }, [citizenLink, summary]);

  const announcementText = useMemo(() => {
    if (!summary) return '';
    return `${summary.municipalityName} olarak Kentiva dijital ihbar hattını kullanıma açtık. Yol, çevre, park, temizlik ve benzeri taleplerinizi konum bilgisiyle hızlıca iletebilirsiniz: ${citizenLink}`;
  }, [citizenLink, summary]);

  const weeklySummary = useMemo(() => {
    if (!summary) return '';
    return [
      `${summary.municipalityName} haftalık Kentiva özeti`,
      `Yeni ihbar: ${formatNumber(summary.reportsLast7Days)}`,
      `Toplam vatandaş kullanıcısı: ${formatNumber(summary.citizenUsers)}`,
      `Toplam ihbar: ${formatNumber(summary.totalReports)}`,
      `Çözülen ihbar: ${formatNumber(summary.resolvedReports)}`,
      `Açık iş yükü: ${formatNumber(summary.openReports)}`,
      `Çözüm oranı: %${summary.resolutionRate}`,
      summary.averageResolutionHours != null ? `Ortalama çözüm süresi: ${summary.averageResolutionHours} saat` : null,
      summary.topCategories?.[0] ? `En yoğun kategori: ${summary.topCategories[0].label}` : null,
    ]
      .filter(Boolean)
      .join('\n');
  }, [summary]);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/pilot/summary');
      setSummary(res.data.data as PilotSummary);
    } catch {
      setError('Pilot özeti yüklenemedi.');
      setSummary(null);
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

  const copyText = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setToast({ type: 'success', message: `${label} kopyalandı.` });
    } catch {
      setToast({ type: 'error', message: 'Kopyalama yapılamadı.' });
    }
  };

  const downloadSummary = () => {
    if (!summary) return;
    const content = [
      summary.executiveSummary,
      '',
      weeklySummary,
      '',
      'Vatandaş linki:',
      citizenLink,
      '',
      'Duyuru metni:',
      announcementText,
    ].join('\n');
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `kentiva-pilot-ozet-${new Date().toISOString().slice(0, 10)}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (loading && !summary) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center p-6 text-sm font-semibold text-slate-500 dark:text-slate-400">
        Pilot özeti yükleniyor...
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {toast && (
        <div
          role="status"
          className={`fixed right-6 top-20 z-50 rounded-xl border px-4 py-3 text-sm font-bold shadow-lg ${
            toast.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-100'
              : 'border-red-200 bg-red-50 text-red-900 dark:border-red-800 dark:bg-red-950 dark:text-red-100'
          }`}
        >
          {toast.message}
        </div>
      )}

      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="kentiva-eyebrow">Pilot başarı paketi</p>
          <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            {summary?.municipalityName ?? 'Pilot'} özeti
          </h2>
          <p className="mt-1 max-w-3xl text-sm font-medium text-slate-600 dark:text-slate-400">
            Belediye görüşmelerinde gösterilecek kullanım, çözüm ve vatandaş büyümesi göstergeleri.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void load()}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-800 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Yenile
          </button>
          <button
            type="button"
            onClick={downloadSummary}
            disabled={!summary}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-800 shadow-sm hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          >
            <Download className="h-4 w-4" />
            Özeti indir
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            disabled={!summary}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-primary-hover disabled:opacity-50"
          >
            <Printer className="h-4 w-4" />
            PDF/Yazdır
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
          {error}
        </div>
      )}

      {summary && (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard icon={Users} label="Vatandaş kullanıcısı" value={formatNumber(summary.citizenUsers)} helper="Pilot büyümesinin ana göstergesi" />
            <MetricCard icon={FileText} label="Toplam ihbar" value={formatNumber(summary.totalReports)} helper={`Son 30 gün: ${formatNumber(summary.reportsLast30Days)}`} />
            <MetricCard icon={CheckCircle2} label="Çözülen ihbar" value={formatNumber(summary.resolvedReports)} helper={`Çözüm oranı: %${summary.resolutionRate}`} />
            <MetricCard icon={TrendingUp} label="Pilot günü" value={`${summary.trialDay ?? '-'} / ${summary.trialTotalDays ?? '-'}`} helper={`Bitiş: ${formatDate(summary.subscriptionEndsAt)}`} />
          </div>

          <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
            <section className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="kentiva-eyebrow">Başkan / müdür özeti</p>
                  <h3 className="mt-1 text-lg font-extrabold text-slate-900 dark:text-white">Haftalık yönetici notu</h3>
                </div>
                <button
                  type="button"
                  onClick={() => void copyText(weeklySummary, 'Haftalık özet')}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
                >
                  <Copy className="h-3.5 w-3.5" />
                  Kopyala
                </button>
              </div>
              <pre className="mt-4 whitespace-pre-wrap rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm font-semibold leading-6 text-slate-700 dark:border-slate-700 dark:bg-slate-950/40 dark:text-slate-200">
                {weeklySummary}
              </pre>
            </section>

            <section className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <p className="kentiva-eyebrow">Pilot dönüşüm</p>
              <h3 className="mt-1 text-lg font-extrabold text-slate-900 dark:text-white">Satış konuşması için kısa sonuç</h3>
              <p className="mt-4 text-sm font-semibold leading-6 text-slate-700 dark:text-slate-300">
                {summary.executiveSummary}
              </p>
              <div className="mt-5 grid grid-cols-3 gap-2 text-center">
                <MiniStat label="Açık" value={summary.openReports} />
                <MiniStat label="Bu hafta" value={summary.reportsLast7Days} />
                <MiniStat label="30 gün çözüm" value={summary.resolvedLast30Days} />
              </div>
            </section>
          </div>

          <div className="grid gap-4 xl:grid-cols-3">
            <RankedList title="En yoğun kategoriler" icon={BarChart3} rows={summary.topCategories} />
            <RankedList title="Bölge yoğunluğu" icon={TrendingUp} rows={summary.topDistricts} />
            <section className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <p className="kentiva-eyebrow">Birim performansı</p>
              <h3 className="mt-1 text-lg font-extrabold text-slate-900 dark:text-white">Departman kırılımı</h3>
              <div className="mt-4 space-y-3">
                {summary.departmentPerformance.length === 0 ? (
                  <p className="text-sm text-slate-500">Henüz departman verisi yok.</p>
                ) : (
                  summary.departmentPerformance.map((row) => (
                    <div key={row.departmentName} className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm font-bold text-slate-900 dark:text-white">{row.departmentName}</span>
                        <span className="text-xs font-bold text-slate-500">{formatNumber(row.totalReports)} ihbar</span>
                      </div>
                      <div className="mt-2 flex gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
                        <span>Çözülen: {formatNumber(row.resolvedReports)}</span>
                        <span>Açık: {formatNumber(row.openReports)}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>

          <section className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="kentiva-eyebrow">Vatandaş büyütme araçları</p>
                <h3 className="mt-1 text-lg font-extrabold text-slate-900 dark:text-white">Link, duyuru ve site butonu</h3>
              </div>
              <Megaphone className="h-6 w-6 text-primary" />
            </div>

            <div className="mt-5 grid gap-4 xl:grid-cols-3">
              <CopyBox title="Vatandaş linki" text={citizenLink} onCopy={copyText} />
              <CopyBox title="Web sitesi butonu" text={embedCode} onCopy={copyText} />
              <CopyBox title="İlk duyuru metni" text={announcementText} onCopy={copyText} />
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  helper,
}: {
  icon: typeof Users;
  label: string;
  value: string;
  helper: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</p>
          <p className="mt-2 text-2xl font-extrabold text-slate-900 dark:text-white">{value}</p>
        </div>
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </span>
      </div>
      <p className="mt-3 text-xs font-semibold text-slate-500 dark:text-slate-400">{helper}</p>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-slate-50 px-3 py-3 dark:bg-slate-800/60">
      <p className="text-lg font-extrabold text-slate-900 dark:text-white">{formatNumber(value)}</p>
      <p className="mt-1 text-[11px] font-bold uppercase tracking-wide text-slate-500">{label}</p>
    </div>
  );
}

function RankedList({ title, icon: Icon, rows }: { title: string; icon: typeof BarChart3; rows: MetricRow[] }) {
  const max = Math.max(1, ...rows.map((r) => r.count));
  return (
    <section className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="kentiva-eyebrow">Kırılım</p>
          <h3 className="mt-1 text-lg font-extrabold text-slate-900 dark:text-white">{title}</h3>
        </div>
        <Icon className="h-5 w-5 text-primary" />
      </div>
      <div className="mt-4 space-y-3">
        {rows.length === 0 ? (
          <p className="text-sm text-slate-500">Henüz veri yok.</p>
        ) : (
          rows.map((row) => (
            <div key={row.label}>
              <div className="mb-1 flex items-center justify-between gap-3 text-sm">
                <span className="font-bold text-slate-800 dark:text-slate-100">{row.label}</span>
                <span className="font-semibold text-slate-500">{formatNumber(row.count)}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(8, (row.count / max) * 100)}%` }} />
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

function CopyBox({
  title,
  text,
  onCopy,
}: {
  title: string;
  text: string;
  onCopy: (text: string, label: string) => Promise<void>;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950/40">
      <div className="flex items-center justify-between gap-3">
        <h4 className="text-sm font-extrabold text-slate-900 dark:text-white">{title}</h4>
        <button
          type="button"
          onClick={() => void onCopy(text, title)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-white px-2.5 py-1.5 text-xs font-bold text-slate-700 shadow-sm ring-1 ring-slate-200 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-100 dark:ring-slate-700"
        >
          <Clipboard className="h-3.5 w-3.5" />
          Kopyala
        </button>
      </div>
      <p className="mt-3 line-clamp-6 whitespace-pre-wrap break-words text-xs font-semibold leading-5 text-slate-600 dark:text-slate-300">
        {text}
      </p>
    </div>
  );
}
