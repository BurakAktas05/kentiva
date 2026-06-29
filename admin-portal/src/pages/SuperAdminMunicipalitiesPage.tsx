import { useCallback, useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Palette, ArrowLeft, Sparkles, Map as MapIcon, AlertTriangle } from 'lucide-react';
import { MapContainer, TileLayer, Popup, GeoJSON } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import api from '../api';

type MunicipalityRow = {
  id: string;
  name: string;
  slug: string;
  displayName: string | null;
  active: boolean | null;
  onboarded: boolean | null;
  publicStatsEnabled: boolean | null;
  subscriptionPlan?: string;
  subscriptionEndsAt?: string | null;
  daysRemaining?: number | null;
  membershipStatus?: string;
  parentId?: string | null;
  type?: string;
  centerLat?: number | null;
  centerLng?: number | null;
  plateCode?: string | null;
  provinceName?: string | null;
  memberId?: string | null;
  primaryColor?: string | null;
};

type MunicipalityBoundaryDto = {
  id: string;
  displayName: string | null;
  name: string;
  geoJson: string | null;
};

// Curated, vibrant color palette for map boundaries
const BOUNDARY_COLORS = [
  '#0ea5e9', '#8b5cf6', '#f59e0b', '#10b981', '#ef4444',
  '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1',
  '#14b8a6', '#e11d48', '#a855f7', '#0284c7', '#65a30d',
];

function colorForIndex(index: number): string {
  return BOUNDARY_COLORS[index % BOUNDARY_COLORS.length];
}


export default function SuperAdminMunicipalitiesPage() {
  const [rows, setRows] = useState<MunicipalityRow[]>([]);
  const [boundaries, setBoundaries] = useState<MunicipalityBoundaryDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');
  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      api.get('/admin/municipalities'),
      api.get('/admin/municipalities/boundaries')
    ])
      .then(([muniRes, boundaryRes]) => {
        setRows((muniRes.data.data?.content ?? []) as MunicipalityRow[]);
        setBoundaries((boundaryRes.data.data ?? []) as MunicipalityBoundaryDto[]);
      })
      .catch(() => setMsg('Liste veya harita verileri yüklenemedi.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      void load();
    });
  }, [load]);

  // Build a color map: municipality id → color
  const colorMap = useMemo(() => {
    const map = new Map<string, string>();
    rows.forEach((r, i) => {
      // Use municipality's own primaryColor if available, otherwise use palette
      const color = r.primaryColor && r.primaryColor.startsWith('#') ? r.primaryColor : colorForIndex(i);
      map.set(r.id, color);
    });
    return map;
  }, [rows]);

  // Municipalities without boundary data
  const noBoundaryRows = useMemo(() => {
    const boundaryIds = new Set(boundaries.filter(b => b.geoJson).map(b => b.id));
    return rows.filter(r => !boundaryIds.has(r.id));
  }, [rows, boundaries]);

  // Active boundaries with valid GeoJSON for the legend
  const legendItems = useMemo(() => {
    return boundaries
      .filter(b => b.geoJson)
      .map(b => {
        const row = rows.find(r => r.id === b.id);
        return {
          id: b.id,
          name: b.displayName || b.name,
          color: colorMap.get(b.id) || '#94a3b8',
          active: row?.active ?? true,
        };
      });
  }, [boundaries, rows, colorMap]);

  return (
    <div className="space-y-8 p-6">
      <div>
        <Link to="/" className="mb-3 inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
          <ArrowLeft size={14} /> Platform dashboard
        </Link>
        <p className="kentiva-eyebrow">Süper admin</p>
        <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">Belediyeler</h2>
        <p className="mt-1 text-sm font-medium text-slate-600 dark:text-slate-400">Onboarding ve çok kiracılı yönetim.</p>
        <Link
          to="/admin/onboarding"
          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary-hover"
        >
          <Sparkles size={16} />
          Kurulum sihirbazını aç
        </Link>
      </div>

      {/* Boundary missing warning */}
      {noBoundaryRows.length > 0 && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50/80 px-5 py-4 dark:border-amber-900/50 dark:bg-amber-950/30">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
          <div>
            <p className="text-sm font-bold text-amber-900 dark:text-amber-200">Coğrafi sınırı eksik belediyeler</p>
            <p className="mt-1 text-xs text-amber-800 dark:text-amber-300">
              Aşağıdaki belediyelerin GeoJSON sınır verisi bulunmamaktadır. Kurulum sihirbazından sınır verisi ekleyebilirsiniz.
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {noBoundaryRows.map(r => (
                <span key={r.id} className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-bold text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">
                  {r.displayName || r.name}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Member Municipalities Map Card */}
      <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <MapIcon className="h-5 w-5 text-primary" />
              <h3 className="font-extrabold text-slate-800 dark:text-white">Üye Belediyeler Haritası</h3>
            </div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Sisteme üye olan belediyelerin coğrafi sınırları. ({boundaries.filter(b => b.geoJson).length} belediye haritada)
            </p>
          </div>
        </div>

        <div className="h-[500px] w-full rounded-2xl overflow-hidden border border-slate-200/90 dark:border-slate-800 shadow-sm z-[10]">
          <MapContainer center={[38.9637, 35.2433]} zoom={6} className="h-full w-full grayscale-map">
            <TileLayer
              url="https://mt1.google.com/vt/lyrs=m&hl=tr&x={x}&y={y}&z={z}"
              attribution='&copy; Google Maps'
            />

            {boundaries.map((b) => {
              try {
                if (!b.geoJson) return null;
                const data = JSON.parse(b.geoJson);
                const row = rows.find(r => r.id === b.id);
                const isActive = row?.active ?? true;
                const baseColor = isActive ? (colorMap.get(b.id) || '#0ea5e9') : '#94a3b8';
                return (
                  <GeoJSON
                    key={b.id}
                    data={data}
                    style={{
                      color: baseColor,
                      weight: 2.5,
                      fillColor: baseColor,
                      fillOpacity: 0.18,
                    }}
                    eventHandlers={{
                      mouseover: (e) => {
                        e.target.setStyle({
                          fillOpacity: 0.45,
                          weight: 3.5,
                        });
                      },
                      mouseout: (e) => {
                        e.target.setStyle({
                          fillOpacity: 0.18,
                          weight: 2.5,
                        });
                      },
                    }}
                  >
                    <Popup>
                      <div className="min-w-[180px] p-1 text-slate-900 dark:text-white">
                        <h4 className="font-bold text-sm" style={{ color: baseColor }}>{b.displayName || b.name}</h4>
                        {row && (
                          <>
                            <p className="text-xs text-slate-500 mt-0.5">
                              Tür: {row.type === 'METROPOLITAN' ? 'Büyükşehir' : row.type === 'PROVINCE' ? 'İl' : 'İlçe'}
                            </p>
                            <p className="text-xs text-slate-500">Slug: {row.slug}</p>
                            <div className="mt-2 border-t border-slate-100 dark:border-slate-800 pt-2 flex items-center justify-between">
                              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${row.active ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                                }`}>
                                {row.active ? 'Aktif' : 'Pasif'}
                              </span>
                              <span className="text-[10px] text-slate-400 font-semibold">{row.subscriptionPlan}</span>
                            </div>
                          </>
                        )}
                      </div>
                    </Popup>
                  </GeoJSON>
                );
              } catch (e) {
                console.error('Failed to parse geoJson for', b.id, e);
                return null;
              }
            })}
          </MapContainer>
        </div>

        {/* Map Legend */}
        {legendItems.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Sınırlar:</span>
            {legendItems.map((item) => (
              <div key={item.id} className="flex items-center gap-1.5">
                <span
                  className="inline-block h-3 w-3 rounded-sm border border-slate-200/50 dark:border-slate-700"
                  style={{ backgroundColor: item.color, opacity: item.active ? 1 : 0.4 }}
                />
                <span className={`text-[11px] font-semibold ${item.active ? 'text-slate-700 dark:text-slate-300' : 'text-slate-400 line-through dark:text-slate-500'}`}>
                  {item.name}
                </span>
              </div>
            ))}
            <div className="flex items-center gap-1.5 ml-2 pl-2 border-l border-slate-200 dark:border-slate-700">
              <span className="inline-block h-3 w-3 rounded-sm bg-slate-300 dark:bg-slate-600" />
              <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500">Pasif</span>
            </div>
          </div>
        )}
      </div>

      {msg ? <p className="text-sm text-slate-600 dark:text-slate-400">{msg}</p> : null}

      <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        {loading ? (
          <div className="p-6 text-slate-500">Yükleniyor…</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/80 text-left">
              <tr>
                <th className="p-3">Ad</th>
                <th className="p-3">Slug</th>
                <th className="p-3">Üyelik</th>
                <th className="p-3">Plan</th>
                <th className="p-3">Kalan gün</th>
                <th className="p-3">Bitiş</th>
                <th className="p-3">Aktif</th>
                <th className="p-3">Onboarding</th>
                <th className="p-3">Sınır</th>
                <th className="p-3">Marka</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const hasBoundary = boundaries.some(b => b.id === r.id && b.geoJson);
                return (
                  <tr key={r.id} className="border-t border-slate-100 dark:border-slate-800">
                    <td className="p-3 font-medium">
                      <div className="flex items-center gap-2">
                        <span
                          className="inline-block h-3 w-3 shrink-0 rounded-sm"
                          style={{ backgroundColor: colorMap.get(r.id) || '#94a3b8' }}
                        />
                        {r.displayName || r.name}
                      </div>
                    </td>
                    <td className="p-3 text-slate-500">{r.slug}</td>
                    <td className="p-3 text-xs font-semibold uppercase">{r.membershipStatus ?? '—'}</td>
                    <td className="p-3">{r.subscriptionPlan ?? '—'}</td>
                    <td className="p-3 tabular-nums">{r.daysRemaining ?? '—'}</td>
                    <td className="p-3 text-slate-500">
                      {r.subscriptionEndsAt ? new Date(r.subscriptionEndsAt).toLocaleDateString('tr-TR') : '—'}
                    </td>
                    <td className="p-3">{r.active ? 'Evet' : 'Hayır'}</td>
                    <td className="p-3">{r.onboarded ? 'Evet' : 'Hayır'}</td>
                    <td className="p-3">
                      {hasBoundary ? (
                        <span className="text-emerald-600 text-xs font-semibold">✓</span>
                      ) : (
                        <span className="text-amber-500 text-xs font-semibold" title="GeoJSON sınır verisi eksik">✗</span>
                      )}
                    </td>
                    <td className="p-3">
                      <Link
                        to={`/admin/municipalities/${r.id}/branding`}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                      >
                        <Palette size={14} />
                        Özelleştir
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
