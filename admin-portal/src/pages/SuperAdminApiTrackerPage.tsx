import { useEffect, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Cpu,
  Database,
  DollarSign,
  Key,
  RefreshCw,
  Server,
} from 'lucide-react';
import api from '../api';

export interface ApiMetric {
  apiName: string;
  serviceProvider: string;
  usageCount: number;
  usageLimit: number;
  latencyMs: number;
  costUSD: number;
  budgetUSD: number;
  status: 'HEALTHY' | 'WARNING' | 'CRITICAL';
  expiryDate: string;
  cacheHitRate: number;
  errorRate: number;
}

export default function SuperAdminApiTrackerPage() {
  const [metrics, setMetrics] = useState<ApiMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchMetrics = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const res = await api.get('/admin/platform/api-metrics');
      setMetrics(res.data.data as ApiMetric[]);
    } catch (err) {
      setError('Dış API metrikleri yüklenemedi. Lütfen daha sonra tekrar deneyin.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void fetchMetrics();
  }, []);

  const getStatusBadge = (status: ApiMetric['status']) => {
    switch (status) {
      case 'HEALTHY':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Aktif / Sağlıklı
          </span>
        );
      case 'WARNING':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
            <AlertTriangle className="h-3.5 w-3.5" />
            Limit Aşımı / Uyarı
          </span>
        );
      case 'CRITICAL':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-1 text-xs font-bold text-rose-800 dark:bg-rose-950/40 dark:text-rose-300">
            <AlertTriangle className="h-3.5 w-3.5" />
            Kritik / Hata
          </span>
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center p-6 text-sm font-semibold text-slate-500 dark:text-slate-400">
        <div className="text-center">
          <RefreshCw className="mx-auto mb-3 h-8 w-8 animate-spin text-primary" />
          <p>Dış API Metrikleri Yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="kentiva-eyebrow">Platform Altyapısı</p>
          <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Dış API Servis Takibi
          </h2>
          <p className="mt-1 max-w-3xl text-sm font-medium text-slate-600 dark:text-slate-400">
            Google Maps, SMS OTP, Nöbetçi Eczane ve AI entegrasyonlarının limit, maliyet, gecikme ve sağlık durumunu anlık izleyin.
          </p>
        </div>
        <button
          type="button"
          disabled={refreshing}
          onClick={() => void fetchMetrics(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-primary-hover disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Yenileniyor...' : 'Bağlantıları Test Et'}
        </button>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
          {error}
        </div>
      )}

      {/* API Cards Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {metrics.map((apiItem) => {
          const usagePercent = Math.min(100, Math.round((apiItem.usageCount / apiItem.usageLimit) * 100));
          return (
            <div
              key={apiItem.apiName}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
            >
              {/* Card Title & Provider */}
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                    {apiItem.apiName}
                  </h3>
                  <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
                    {apiItem.serviceProvider}
                  </p>
                </div>
                {getStatusBadge(apiItem.status)}
              </div>

              {/* Grid Metrics */}
              <div className="mt-5 grid grid-cols-2 gap-4">
                {/* Latency */}
                <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-950/40">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
                    <Clock className="h-3.5 w-3.5 text-primary" />
                    Ort. Yanıt Süresi
                  </div>
                  <p className="mt-1 text-lg font-extrabold text-slate-900 dark:text-white">
                    {apiItem.latencyMs} ms
                  </p>
                </div>

                {/* Error Rate */}
                <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-950/40">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
                    <Activity className="h-3.5 w-3.5 text-rose-500" />
                    Hata Oranı
                  </div>
                  <p className="mt-1 text-lg font-extrabold text-slate-900 dark:text-white">
                    %{apiItem.errorRate}
                  </p>
                </div>
              </div>

              {/* Usage Progress Bar */}
              <div className="mt-5">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="flex items-center gap-1 text-slate-500">
                    <Cpu className="h-3.5 w-3.5 text-primary" />
                    Günlük/Aylık Kullanım
                  </span>
                  <span className="text-slate-800 dark:text-slate-200">
                    {apiItem.usageCount.toLocaleString('tr-TR')} / {apiItem.usageLimit.toLocaleString('tr-TR')}
                  </span>
                </div>
                <div className="mt-2 h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      usagePercent > 85 ? 'bg-rose-500' : usagePercent > 60 ? 'bg-amber-500' : 'bg-primary'
                    }`}
                    style={{ width: `${usagePercent}%` }}
                  />
                </div>
              </div>

              {/* Cache Hit Rate & Cost Info if applicable */}
              <div className="mt-5 border-t border-slate-100 pt-4 dark:border-slate-800">
                <div className="grid grid-cols-2 gap-4">
                  {/* Cache hit rate */}
                  {apiItem.cacheHitRate > 0 && (
                    <div>
                      <div className="flex items-center gap-1 text-xs font-bold text-slate-500">
                        <Database className="h-3.5 w-3.5 text-emerald-500" />
                        Redis Cache Oranı
                      </div>
                      <p className="mt-0.5 text-sm font-extrabold text-slate-800 dark:text-slate-200">
                        %{apiItem.cacheHitRate}
                      </p>
                    </div>
                  )}

                  {/* Monthly Cost */}
                  {apiItem.budgetUSD > 0 && (
                    <div>
                      <div className="flex items-center gap-1 text-xs font-bold text-slate-500">
                        <DollarSign className="h-3.5 w-3.5 text-amber-500" />
                        Aylık Harcama / Bütçe
                      </div>
                      <p className="mt-0.5 text-sm font-extrabold text-slate-800 dark:text-slate-200">
                        ${apiItem.costUSD.toFixed(2)} / ${apiItem.budgetUSD.toFixed(0)}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Expiry info */}
              <div className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-slate-400 dark:text-slate-500">
                <Key className="h-3.5 w-3.5" />
                Anahtar Durumu / Geçerlilik: {apiItem.expiryDate}
              </div>
            </div>
          );
        })}
      </div>

      {/* System info warning block */}
      <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950/40">
        <div className="flex gap-3">
          <Server className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          <div className="text-sm font-medium text-blue-900 dark:text-blue-200">
            <h4 className="font-extrabold">Önemli Altyapı Notu</h4>
            <p className="mt-1">
              Google Maps API harcamaları 200$ ücretsiz kredi aşımında faturalandırılır. Sms OTP servislerinde Netgsm kredi seviyesi 4,250 SMS'e ulaştığında sistem otomatik olarak uyarı vermektedir. Nöbetçi Eczane servis sorguları Redis cache ile korunduğundan günlük dış API çağrı sayısı minimize edilmiştir.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
