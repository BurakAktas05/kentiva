import { useCallback, useMemo, useState } from 'react';
import { MapContainer, TileLayer, GeoJSON } from 'react-leaflet';
import type { GeoJsonObject } from 'geojson';
import 'leaflet/dist/leaflet.css';
import { MapPinned, Upload } from 'lucide-react';
import api from '../api';

type Props = {
  centerLat?: number | null;
  centerLng?: number | null;
  defaultZoom?: number | null;
};

function parseGeoJson(text: string): GeoJsonObject | null {
  try {
    const parsed = JSON.parse(text) as GeoJsonObject;
    if (parsed && (parsed.type === 'Feature' || parsed.type === 'FeatureCollection' || parsed.type === 'Polygon')) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

export default function BoundaryGeoJsonPanel({ centerLat, centerLng, defaultZoom }: Props) {
  const [geoText, setGeoText] = useState('');
  const [preview, setPreview] = useState<GeoJsonObject | null>(null);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState('');

  const center: [number, number] = useMemo(
    () => [centerLat ?? 41.25, centerLng ?? 32.68],
    [centerLat, centerLng],
  );

  const onFile = useCallback((file: File) => {
    setMsg('');
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? '');
      setGeoText(text);
      const parsed = parseGeoJson(text);
      if (!parsed) {
        setPreview(null);
        setMsg('Geçerli bir GeoJSON dosyası seçin (Feature, FeatureCollection veya Polygon).');
        return;
      }
      setPreview(parsed);
    };
    reader.readAsText(file);
  }, []);

  const upload = async () => {
    if (!preview || !geoText.trim()) {
      setMsg('Önce GeoJSON yükleyin ve önizlemeyi doğrulayın.');
      return;
    }
    setUploading(true);
    setMsg('');
    try {
      await api.post('/municipalities/me/boundaries', geoText, {
        headers: { 'Content-Type': 'application/json' },
      });
      setMsg('Belediye sınırları kaydedildi.');
    } catch (err: unknown) {
      const m = err as { response?: { data?: { message?: string } } };
      setMsg(m.response?.data?.message || 'Sınır yüklemesi başarısız.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <section className="rounded-2xl border border-slate-200/90 bg-slate-50/80 p-4 dark:border-slate-700 dark:bg-slate-800/40">
      <div className="flex items-center gap-2">
        <MapPinned className="h-5 w-5 text-primary" />
        <p className="text-sm font-bold text-slate-800 dark:text-slate-100">Belediye sınırı (GeoJSON)</p>
      </div>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
        .geojson veya .json dosyasını sürükleyip bırakın. Vatandaş bildirimleri yalnızca bu poligon içinde kabul edilir.
      </p>

      <label
        className="mt-4 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-white px-4 py-8 text-center transition-colors hover:border-primary/50 dark:border-slate-600 dark:bg-slate-900"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const file = e.dataTransfer.files?.[0];
          if (file) onFile(file);
        }}
      >
        <input
          type="file"
          accept=".json,.geojson,application/geo+json,application/json"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onFile(file);
          }}
        />
        <Upload className="mb-2 h-8 w-8 text-slate-400" />
        <span className="text-sm font-medium text-slate-600 dark:text-slate-300">Dosyayı sürükleyin veya seçin</span>
      </label>

      {preview && (
        <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
          <MapContainer center={center} zoom={defaultZoom ?? 12} className="h-56 w-full" scrollWheelZoom={false}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <GeoJSON data={preview} />
          </MapContainer>
        </div>
      )}

      <button
        type="button"
        disabled={uploading || !preview}
        onClick={upload}
        className="mt-4 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover disabled:opacity-50"
      >
        {uploading ? 'Kaydediliyor…' : 'Sınırları sunucuya kaydet'}
      </button>
      {msg ? <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{msg}</p> : null}
    </section>
  );
}
