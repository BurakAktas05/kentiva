import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Clock3, FileSearch, MapPin, XCircle } from 'lucide-react';
import { SeoHead } from '../components/SeoHead';
import { publicGet } from '../lib/api';

type TrackingDto = {
  trackingNumber: string;
  title: string;
  status: string;
  categoryName: string;
  municipalityName: string;
  createdAt: string;
  district: string | null;
};

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'Beklemede',
  PROCESSING: 'İşlemde',
  FORWARDED: 'Yönlendirildi',
  RESOLVED: 'Çözüldü',
  REJECTED: 'Reddedildi',
  OUT_OF_JURISDICTION: 'Yetki dışı',
};

function statusTone(status: string): string {
  switch (status) {
    case 'RESOLVED':
      return 'bg-emerald-50 text-emerald-800 border-emerald-200';
    case 'REJECTED':
    case 'OUT_OF_JURISDICTION':
      return 'bg-rose-50 text-rose-800 border-rose-200';
    case 'PROCESSING':
    case 'FORWARDED':
      return 'bg-sky-50 text-sky-800 border-sky-200';
    default:
      return 'bg-amber-50 text-amber-900 border-amber-200';
  }
}

function StatusIcon({ status }: { status: string }) {
  if (status === 'RESOLVED') return <CheckCircle2 className="h-5 w-5" aria-hidden />;
  if (status === 'REJECTED' || status === 'OUT_OF_JURISDICTION') {
    return <XCircle className="h-5 w-5" aria-hidden />;
  }
  return <Clock3 className="h-5 w-5" aria-hidden />;
}

export default function ReportTrackPage() {
  const { trackingNumber = '' } = useParams<{ trackingNumber: string }>();
  const [data, setData] = useState<TrackingDto | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!trackingNumber.trim()) {
      setLoading(false);
      setError('Takip numarası eksik.');
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    setError('');
    publicGet<TrackingDto>(`/public/reports/track/${encodeURIComponent(trackingNumber.trim())}`, controller.signal)
      .then(setData)
      .catch(() => {
        setData(null);
        setError('Bu takip numarasıyla ihbar bulunamadı. Numarayı kontrol edip tekrar deneyin.');
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [trackingNumber]);

  const statusLabel = data ? STATUS_LABEL[data.status] || data.status : '';

  return (
    <>
      <SeoHead
        title={data ? `İhbar takibi — ${data.trackingNumber}` : 'İhbar takibi'}
        description="Kentiva ihbar takip numarası ile durum sorgulama."
        canonicalPath={`/reports/track/${encodeURIComponent(trackingNumber)}`}
        noIndex
      />
      <main id="main-content" tabIndex={-1} className="mx-auto w-full max-w-2xl flex-1 px-4 py-10 sm:px-6 lg:px-8">
        <Link
          to="/"
          className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Ana sayfa
        </Link>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <FileSearch className="h-5 w-5" aria-hidden />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900">İhbar durumu</h1>
              <p className="mt-1 text-sm text-slate-500">
                Takip numarası ile belediyenizin kayıtlı ihbarının güncel durumunu görün.
              </p>
            </div>
          </div>

          {loading && (
            <p className="mt-8 text-sm font-medium text-slate-500" aria-live="polite">
              Sorgulanıyor…
            </p>
          )}

          {!loading && error && (
            <p className="mt-8 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800" role="alert">
              {error}
            </p>
          )}

          {!loading && data && (
            <div className="mt-8 space-y-5">
              <p className="font-mono text-sm font-semibold tracking-wide text-slate-700">
                {data.trackingNumber}
              </p>
              <h2 className="text-lg font-bold text-slate-900">{data.title}</h2>
              <div
                className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-semibold ${statusTone(data.status)}`}
              >
                <StatusIcon status={data.status} />
                {statusLabel}
              </div>
              <dl className="grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-slate-500">Belediye</dt>
                  <dd className="mt-0.5 font-semibold text-slate-800">{data.municipalityName}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Kategori</dt>
                  <dd className="mt-0.5 font-semibold text-slate-800">{data.categoryName}</dd>
                </div>
                {data.district && (
                  <div>
                    <dt className="text-slate-500">Mahalle / bölge</dt>
                    <dd className="mt-0.5 flex items-center gap-1.5 font-semibold text-slate-800">
                      <MapPin className="h-3.5 w-3.5 text-slate-400" aria-hidden />
                      {data.district}
                    </dd>
                  </div>
                )}
                <div>
                  <dt className="text-slate-500">Oluşturulma</dt>
                  <dd className="mt-0.5 font-semibold text-slate-800">
                    {new Date(data.createdAt).toLocaleString('tr-TR')}
                  </dd>
                </div>
              </dl>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
