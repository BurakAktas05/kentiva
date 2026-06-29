import { useEffect, useMemo, useState } from 'react';
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import { Crosshair, MapPinned, Save } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import api from '../api';

delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

type Props = {
  municipalityName: string;
  centerLat?: number | null;
  centerLng?: number | null;
  defaultZoom?: number | null;
  onSaved: (next: { centerLat: number; centerLng: number; defaultZoom: number }) => void;
};

function RecenterMap({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();

  useEffect(() => {
    map.setView(center, zoom);
  }, [center, map, zoom]);

  return null;
}

function PickableMarker({
  center,
  onChange,
}: {
  center: [number, number];
  onChange: (next: [number, number]) => void;
}) {
  useMapEvents({
    click(event) {
      onChange([event.latlng.lat, event.latlng.lng]);
    },
  });

  return (
    <Marker
      position={center}
      draggable
      eventHandlers={{
        dragend(event) {
          const marker = event.target as L.Marker;
          const next = marker.getLatLng();
          onChange([next.lat, next.lng]);
        },
      }}
    />
  );
}

function formatCoord(value: number) {
  return value.toFixed(6);
}

export default function MunicipalityLocationPanel({
  municipalityName,
  centerLat,
  centerLng,
  defaultZoom,
  onSaved,
}: Props) {
  const initialCenter = useMemo<[number, number]>(
    () => [centerLat ?? 41.0082, centerLng ?? 28.9784],
    [centerLat, centerLng],
  );
  const [position, setPosition] = useState<[number, number]>(initialCenter);
  const [zoom, setZoom] = useState(defaultZoom ?? 12);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  useEffect(() => {
    setPosition(initialCenter);
  }, [initialCenter]);

  useEffect(() => {
    setZoom(defaultZoom ?? 12);
  }, [defaultZoom]);

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);

    try {
      await api.patch('/municipalities/me/branding', {
        centerLat: Number(position[0].toFixed(6)),
        centerLng: Number(position[1].toFixed(6)),
        defaultZoom: zoom,
      });
      const next = {
        centerLat: Number(position[0].toFixed(6)),
        centerLng: Number(position[1].toFixed(6)),
        defaultZoom: zoom,
      };
      onSaved(next);
      setMessage({ type: 'ok', text: 'Merkez konum ve harita seviyesi kaydedildi.' });
    } catch (err: unknown) {
      const next = err as { response?: { data?: { message?: string } } };
      setMessage({ type: 'err', text: next.response?.data?.message || 'Konum kaydedilemedi.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="rounded-3xl border border-slate-200/90 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-primary">
            <MapPinned className="h-5 w-5" />
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Harita merkez noktasi</h3>
          </div>
          <p className="mt-2 max-w-2xl text-sm text-slate-600 dark:text-slate-400">
            {municipalityName} icin vatandas uygulamasi ve kamu sayfasinda acilacak varsayilan odak noktasini haritadan
            secin. Marker'i surukleyebilir veya haritada istediginiz noktaya tiklayabilirsiniz.
          </p>
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary-hover disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          {saving ? 'Kaydediliyor…' : 'Konumu kaydet'}
        </button>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700">
          <MapContainer center={position} zoom={zoom} className="h-[360px] w-full grayscale-map">
            <TileLayer
              url="https://mt1.google.com/vt/lyrs=m&hl=tr&x={x}&y={y}&z={z}"
              attribution='&copy; Google Maps'
            />
            <PickableMarker center={position} onChange={setPosition} />
            <RecenterMap center={position} zoom={zoom} />
          </MapContainer>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-700 dark:bg-slate-800/50">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
              <Crosshair className="h-4 w-4 text-primary" />
              Secilen koordinat
            </div>
            <div className="mt-3 space-y-3 text-sm">
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Enlem</span>
                <input
                  value={formatCoord(position[0])}
                  onChange={(e) => {
                    const next = Number(e.target.value);
                    if (Number.isFinite(next)) setPosition([next, position[1]]);
                  }}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 dark:border-slate-700 dark:bg-slate-900"
                />
              </label>
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Boylam</span>
                <input
                  value={formatCoord(position[1])}
                  onChange={(e) => {
                    const next = Number(e.target.value);
                    if (Number.isFinite(next)) setPosition([position[0], next]);
                  }}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 dark:border-slate-700 dark:bg-slate-900"
                />
              </label>
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Varsayilan zoom</span>
                <input
                  type="number"
                  min={8}
                  max={18}
                  value={zoom}
                  onChange={(e) => setZoom(Number(e.target.value))}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 dark:border-slate-700 dark:bg-slate-900"
                />
              </label>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900/60">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Nerede kullanilir?</p>
            <ul className="mt-3 space-y-2 text-sm text-slate-600 dark:text-slate-300">
              <li>Vatandas uygulamasinda varsayilan belediye odagi</li>
              <li>Yonetim paneli canli harita ilk acilis noktasi</li>
              <li>Hava durumu ve konum tabanli kartlar icin guvenli fallback</li>
            </ul>
          </div>
        </div>
      </div>

      {message ? (
        <p
          className={`mt-4 rounded-2xl px-4 py-3 text-sm ${
            message.type === 'ok'
              ? 'border border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200'
              : 'border border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200'
          }`}
        >
          {message.text}
        </p>
      ) : null}
    </section>
  );
}
