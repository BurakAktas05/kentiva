import { useCallback, useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import 'leaflet.heat';
import SockJS from 'sockjs-client';
import Stomp from 'stompjs';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, Flame, MapPin, Layers } from 'lucide-react';
import api, { TOKEN_KEY, type Report, type ReportListItem } from './api';
import { getSockJsUrl } from './lib/env';
import { heatMapGradient, reportStatusBadgeClass } from './lib/ui';

// Leaflet default icon paths (bundler)
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

type LeafletWithHeat = typeof L & {
  heatLayer(points: [number, number, number][], options?: Record<string, unknown>): L.Layer;
};

const RecenterMap = ({ coords }: { coords: [number, number] }) => {
  const map = useMap();
  useEffect(() => {
    map.setView(coords, 13);
  }, [coords, map]);
  return null;
};

function listItemToReport(row: ReportListItem): Report {
  return {
    id: row.id,
    title: row.title,
    status: row.status as Report['status'],
    categoryName: row.categoryName,
    district: row.district ?? '',
    createdAt: row.createdAt,
    latitude: row.latitude ?? 0,
    longitude: row.longitude ?? 0,
  };
}

function HeatLayer({ points }: { points: [number, number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 0) return;
    const LH = L as LeafletWithHeat;
    const layer = LH.heatLayer(points, {
      radius: 28,
      blur: 22,
      maxZoom: 16,
      max: 0.85,
      gradient: { ...heatMapGradient },
    });
    map.addLayer(layer);
    return () => {
      map.removeLayer(layer);
    };
  }, [map, points]);
  return null;
}

export type MapLayerMode = 'markers' | 'heat' | 'both';

const LiveMap = ({
  centerLat,
  centerLng,
  zoom,
  municipalityId,
  onOpenReport,
}: {
  centerLat?: number;
  centerLng?: number;
  zoom?: number;
  municipalityId?: string;
  onOpenReport?: (reportId: string) => void;
}) => {
  const openReportDetail = useCallback(
    (reportId: string) => {
      if (onOpenReport) {
        onOpenReport(reportId);
      }
    },
    [onOpenReport],
  );

  const [reports, setReports] = useState<Report[]>([]);
  const [newReport, setNewReport] = useState<Report | null>(null);
  const [layerMode, setLayerMode] = useState<MapLayerMode>('both');
  const [wsConnected, setWsConnected] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'));

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains('dark'));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  const mergeReport = useCallback((incoming: Report) => {
    setReports((prev) => {
      const without = prev.filter((r) => r.id !== incoming.id);
      const next = [incoming, ...without];
      return next.slice(0, 500);
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get('/reports', { params: { page: 0, size: 500, sort: 'createdAt,desc' } });
        const rows = (res.data.data?.content ?? []) as ReportListItem[];
        if (cancelled) return;
        const mapped = rows
          .map(listItemToReport)
          .filter((r) => Number.isFinite(r.latitude) && Number.isFinite(r.longitude) && r.latitude !== 0 && r.longitude !== 0);
        setReports(mapped);
      } catch {
        if (!cancelled) setLoadError('Harita verisi yüklenemedi (yetki veya ağ).');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!municipalityId) {
      setWsConnected(false);
      return;
    }
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      setWsConnected(false);
      return;
    }
    const wsUrl = `${getSockJsUrl()}?token=${encodeURIComponent(token)}`;
    const socket = new SockJS(wsUrl);
    const stompClient = Stomp.over(socket);
    stompClient.debug = () => {};
    const topic = `/topic/municipality/${municipalityId}/reports`;
    const connectHeaders = { Authorization: `Bearer ${token}` };

    stompClient.connect(
      connectHeaders,
      () => {
        setWsConnected(true);
        stompClient.subscribe(topic, (msg) => {
          const report = JSON.parse(msg.body) as Report;
          if (Number.isFinite(report.latitude) && Number.isFinite(report.longitude)) {
            mergeReport(report);
            setNewReport(report);
            setTimeout(() => setNewReport(null), 5000);
          }
        });
      },
      () => setWsConnected(false),
    );

    return () => {
      try {
        stompClient.disconnect(() => {});
      } catch {
        /* ignore */
      }
      setWsConnected(false);
    };
  }, [mergeReport, municipalityId]);

  const heatPoints = useMemo(() => {
    const weight: Record<string, number> = {
      PENDING: 0.9,
      PROCESSING: 0.65,
      RESOLVED: 0.35,
      REJECTED: 0.5,
    };
    return reports
      .filter((r) => r.latitude && r.longitude)
      .map((r) => [r.latitude, r.longitude, weight[r.status] ?? 0.5] as [number, number, number]);
  }, [reports]);

  const showMarkers = layerMode === 'markers' || layerMode === 'both';
  const showHeat = layerMode === 'heat' || layerMode === 'both';

  return (
    <div className="relative h-[600px] overflow-hidden rounded-2xl border border-slate-200/90 shadow-sm dark:border-slate-700 dark:shadow-none">
      <div className="absolute top-3 left-3 z-[500] flex flex-wrap gap-2">
        {(
          [
            { id: 'markers' as const, label: 'İşaretçi', icon: MapPin },
            { id: 'heat' as const, label: 'Isı', icon: Flame },
            { id: 'both' as const, label: 'İkisi', icon: Layers },
          ] as const
        ).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setLayerMode(id)}
            className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold shadow-sm backdrop-blur-md transition-colors ${
              layerMode === id
                ? 'border-primary/30 bg-primary text-white'
                : 'border-slate-200/90 bg-white/95 text-slate-700 dark:border-slate-600 dark:bg-slate-900/95 dark:text-slate-200'
            }`}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      <div className="absolute top-3 right-3 z-[500] flex items-center gap-2 rounded-lg border border-slate-200/90 bg-white/95 px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-600 shadow-sm backdrop-blur-md dark:border-slate-600 dark:bg-slate-900/95 dark:text-slate-300">
        <span className={`h-2 w-2 rounded-full ${wsConnected ? 'animate-pulse bg-emerald-500' : 'bg-amber-500'}`} />
        {wsConnected ? 'Canlı' : 'WS kapalı'}
      </div>

      {loadError && (
        <div className="absolute bottom-3 left-3 right-3 z-[500] rounded-xl bg-amber-50 px-3 py-2 text-center text-xs font-medium text-amber-900 dark:bg-amber-950/80 dark:text-amber-100">
          {loadError}
        </div>
      )}

      <MapContainer center={[centerLat || 41.0082, centerLng || 28.9784]} zoom={zoom || 11} className="h-full w-full">
        <TileLayer
          url={isDark
            ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
            : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png'}
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          subdomains={['a', 'b', 'c']}
        />
        {showHeat && heatPoints.length > 0 && <HeatLayer points={heatPoints} />}
        {showMarkers &&
          reports.map((report) => (
            <Marker
              key={report.id}
              position={[report.latitude, report.longitude]}
              eventHandlers={{
                click: () => openReportDetail(report.id),
              }}
            >
              <Popup>
                <div className="min-w-[160px] p-2">
                  <h4 className="font-bold text-primary">{report.title}</h4>
                  <p className="mb-2 text-xs text-slate-500">
                    {report.categoryName} • {report.district}
                  </p>
                  <span className={`kentiva-status-badge ${reportStatusBadgeClass(report.status)}`}>
                    {report.status}
                  </span>
                  <button
                    type="button"
                    onClick={() => openReportDetail(report.id)}
                    className="mt-3 w-full rounded-lg bg-primary px-2 py-1.5 text-xs font-bold text-white hover:bg-primary/90"
                  >
                    Detay
                  </button>
                </div>
              </Popup>
            </Marker>
          ))}
        {newReport && <RecenterMap coords={[newReport.latitude, newReport.longitude]} />}
      </MapContainer>

      <AnimatePresence>
        {newReport && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.18 }}
            className="absolute top-14 right-3 z-[1000] w-72 rounded-xl border border-slate-200/90 bg-white/95 p-4 shadow-lg backdrop-blur-md dark:border-slate-600 dark:bg-slate-900/95"
          >
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <AlertCircle size={20} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-primary">Yeni ihbar</p>
                <p className="truncate text-sm font-bold text-slate-900 dark:text-white">{newReport.title}</p>
                <p className="text-xs text-slate-500">{newReport.district}</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default LiveMap;
