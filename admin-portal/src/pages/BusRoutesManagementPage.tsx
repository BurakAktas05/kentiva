import { useCallback, useEffect, useState } from 'react';
import {
  Bus,
  Loader2,
  RefreshCw,
  Trash2,
  ChevronDown,
  ChevronUp,
  MapPin,
  Clock,
  AlertCircle,
} from 'lucide-react';
import api from '../api';
import BusRoutesPanel from '../components/BusRoutesPanel';

type RouteScheduleInfo = {
  departuresFromStart?: string[];
  departuresFromEnd?: string[];
};

type BusRoute = {
  id: string;
  name: string;
  code: string;
  stops: string[];
  color: string;
  icon: string;
  schedule: {
    weekday?: RouteScheduleInfo | null;
    weekend?: RouteScheduleInfo | null;
    saturday?: RouteScheduleInfo | null;
    sunday?: RouteScheduleInfo | null;
  };
};

interface BusRoutesManagementPageProps {
  municipalityId: string;
}

export default function BusRoutesManagementPage({ municipalityId }: BusRoutesManagementPageProps) {
  const [routes, setRoutes] = useState<BusRoute[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const loadRoutes = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/public/municipalities/${municipalityId}/bus-routes`);
      setRoutes((res.data.data as BusRoute[]) || []);
    } catch {
      setMsg({ type: 'err', text: 'Hatlar yüklenemedi.' });
    } finally {
      setLoading(false);
    }
  }, [municipalityId]);

  useEffect(() => {
    void loadRoutes();
  }, [loadRoutes]);

  const handleDelete = async (routeId: string, routeName: string) => {
    if (!window.confirm(`"${routeName}" hattını silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.`)) return;
    setDeletingId(routeId);
    try {
      await api.delete(`/municipalities/me/bus-routes/${routeId}`);
      setMsg({ type: 'ok', text: `"${routeName}" hattı başarıyla silindi.` });
      await loadRoutes();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setMsg({ type: 'err', text: e.response?.data?.message || 'Hat silinemedi.' });
    } finally {
      setDeletingId(null);
    }
  };

  const totalDepartures = (route: BusRoute) => {
    return (
      (route.schedule?.weekday?.departuresFromStart?.length || 0) +
      (route.schedule?.saturday?.departuresFromStart?.length || 0) +
      (route.schedule?.sunday?.departuresFromStart?.length || 0) +
      (route.schedule?.weekend?.departuresFromStart?.length || 0)
    );
  };

  return (
    <div className="space-y-8 p-6">
      {/* Page Header */}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="kentiva-eyebrow">Ulaşım Yönetimi</p>
          <h2 className="kentiva-page-title">Otobüs Hatları</h2>
          <p className="kentiva-page-subtitle">
            Belediyenizin otobüs hatlarını, güzergahlarını ve sefer saatlerini yönetin.
            PDF, Excel veya API URL üzerinden içe aktarın.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadRoutes()}
          disabled={loading}
          className="kentiva-btn-secondary"
        >
          <RefreshCw size={17} className={loading ? 'animate-spin' : ''} />
          Yenile
        </button>
      </div>

      {/* Message */}
      {msg && (
        <div
          className={`rounded-xl px-4 py-3 text-sm font-medium flex items-center gap-2 ${
            msg.type === 'ok'
              ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200'
              : 'bg-red-50 text-red-800 dark:bg-red-950/40 dark:text-red-200'
          }`}
        >
          <AlertCircle className="h-4 w-4 shrink-0" />
          {msg.text}
          <button onClick={() => setMsg(null)} className="ml-auto text-current opacity-60 hover:opacity-100">✕</button>
        </div>
      )}

      {/* Stats Row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-2 mb-1">
            <Bus className="h-4 w-4 text-primary" />
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Toplam Hat</p>
          </div>
          <p className="text-2xl font-extrabold text-slate-900 dark:text-white">{loading ? '—' : routes.length}</p>
        </div>
        <div className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-2 mb-1">
            <MapPin className="h-4 w-4 text-emerald-500" />
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Toplam Durak</p>
          </div>
          <p className="text-2xl font-extrabold text-slate-900 dark:text-white">
            {loading ? '—' : routes.reduce((sum, r) => sum + (r.stops?.length || 0), 0)}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="h-4 w-4 text-amber-500" />
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Toplam Sefer</p>
          </div>
          <p className="text-2xl font-extrabold text-slate-900 dark:text-white">
            {loading ? '—' : routes.reduce((sum, r) => sum + totalDepartures(r), 0)}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-2 mb-1">
            <Bus className="h-4 w-4 text-violet-500" />
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">HS Tarifeli</p>
          </div>
          <p className="text-2xl font-extrabold text-slate-900 dark:text-white">
            {loading ? '—' : routes.filter(r => r.schedule?.weekend || r.schedule?.saturday || r.schedule?.sunday).length}
          </p>
        </div>
      </div>

      {/* Import Panel */}
      <BusRoutesPanel municipalityId={municipalityId} />

      {/* Routes Detail Table */}
      <div className="rounded-2xl border border-slate-200/90 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-900 dark:text-white">Hat Detayları</h3>
          <span className="text-xs text-slate-500">{routes.length} hat</span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 gap-3 text-slate-500">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-sm">Hatlar yükleniyor...</span>
          </div>
        ) : routes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-500">
            <Bus className="h-12 w-12 text-slate-200 dark:text-slate-700" />
            <p className="text-sm font-medium">Henüz otobüs hattı yüklenmedi.</p>
            <p className="text-xs text-slate-400">Yukarıdaki "Ulaşım ve Otobüs Seferleri" bölümünden hat ekleyebilirsiniz.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {routes.map((route) => {
              const isExpanded = expandedId === route.id;
              return (
                <div key={route.id}>
                  {/* Row Header */}
                  <div
                    className="flex items-center justify-between px-6 py-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                    onClick={() => setExpandedId(isExpanded ? null : route.id)}
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-sm"
                        style={{ backgroundColor: route.color || '#3B82F6' }}
                      >
                        {route.code}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900 dark:text-white text-sm">{route.name}</p>
                        <p className="text-xs text-slate-500 mt-0.5 truncate">
                          {route.stops?.length} durak
                          {route.stops?.length > 0 && ` · ${route.stops[0]} ↔ ${route.stops[route.stops.length - 1]}`}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="hidden md:flex gap-1.5 text-[10px]">
                        <span className="px-2 py-1 rounded-md bg-slate-100 dark:bg-slate-800 font-semibold text-slate-600 dark:text-slate-400">
                          Hİ: {route.schedule?.weekday?.departuresFromStart?.length || 0} ↑ / {route.schedule?.weekday?.departuresFromEnd?.length || 0} ↓
                        </span>
                        {route.schedule?.weekend && (
                          <span className="px-2 py-1 rounded-md bg-amber-50 dark:bg-amber-950/30 font-semibold text-amber-700 dark:text-amber-400">
                            HS: {(route.schedule.weekend.departuresFromStart?.length || 0)}
                          </span>
                        )}
                        {route.schedule?.saturday && (
                          <span className="px-2 py-1 rounded-md bg-violet-50 dark:bg-violet-950/30 font-semibold text-violet-700 dark:text-violet-400">
                            Cmt: {route.schedule.saturday.departuresFromStart?.length || 0}
                          </span>
                        )}
                        {route.schedule?.sunday && (
                          <span className="px-2 py-1 rounded-md bg-emerald-50 dark:bg-emerald-950/30 font-semibold text-emerald-700 dark:text-emerald-400">
                            Pzr: {route.schedule.sunday.departuresFromStart?.length || 0}
                          </span>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); void handleDelete(route.id, route.name); }}
                        disabled={deletingId === route.id}
                        title="Hattı Sil"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors disabled:opacity-50"
                      >
                        {deletingId === route.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                      </button>

                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4 text-slate-400" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-slate-400" />
                      )}
                    </div>
                  </div>

                  {/* Expanded Detail */}
                  {isExpanded && (
                    <div className="px-6 pb-5 bg-slate-50/50 dark:bg-slate-950/20 border-t border-slate-100 dark:border-slate-800">
                      <div className="pt-4 grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Stops */}
                        <div>
                          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                            <MapPin className="h-3.5 w-3.5 text-primary" />
                            Güzergah ({route.stops?.length} Durak)
                          </h4>
                          <div className="relative pl-5 space-y-2">
                            <div className="absolute left-[7px] top-2 bottom-2 w-0.5 bg-slate-200 dark:bg-slate-700" />
                            {route.stops?.map((stop, i) => (
                              <div key={i} className="relative flex items-center gap-2">
                                <div className={`absolute -left-[21px] w-3.5 h-3.5 rounded-full border-2 bg-white dark:bg-slate-900 ${
                                  i === 0 || i === route.stops.length - 1
                                    ? 'border-primary'
                                    : 'border-slate-300 dark:border-slate-600'
                                }`} />
                                <span className={`text-xs ${
                                  i === 0 || i === route.stops.length - 1
                                    ? 'font-bold text-slate-900 dark:text-white'
                                    : 'text-slate-600 dark:text-slate-400'
                                }`}>
                                  {stop}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Schedule */}
                        <div>
                          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5 text-primary" />
                            Sefer Saatleri
                          </h4>
                          <div className="space-y-3">
                            {(['weekday', 'weekend', 'saturday', 'sunday'] as const).map((day) => {
                              const sched = route.schedule[day];
                              if (!sched || (!sched.departuresFromStart?.length && !sched.departuresFromEnd?.length)) return null;
                              const labels = { weekday: 'Hafta İçi', weekend: 'Hafta Sonu', saturday: 'Cumartesi', sunday: 'Pazar' };
                              return (
                                <div key={day}>
                                  <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">{labels[day]}</p>
                                  <div className="space-y-1">
                                    {sched.departuresFromStart?.length ? (
                                      <div className="flex flex-wrap gap-1">
                                        <span className="text-[10px] text-slate-400 w-full">↑ Başlangıçtan:</span>
                                        {sched.departuresFromStart.map((t) => (
                                          <span key={t} className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-1.5 py-0.5 rounded font-mono text-[10px] font-semibold">
                                            {t}
                                          </span>
                                        ))}
                                      </div>
                                    ) : null}
                                    {sched.departuresFromEnd?.length ? (
                                      <div className="flex flex-wrap gap-1">
                                        <span className="text-[10px] text-slate-400 w-full">↓ Bitiş noktasından:</span>
                                        {sched.departuresFromEnd.map((t) => (
                                          <span key={t} className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-1.5 py-0.5 rounded font-mono text-[10px] font-semibold">
                                            {t}
                                          </span>
                                        ))}
                                      </div>
                                    ) : null}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
