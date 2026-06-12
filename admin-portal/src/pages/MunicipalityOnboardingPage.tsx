import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  Layers3,
  MapPinned,
  Shield,
  Sparkles,
  Palette,
  Upload,
  Plus,
  Trash2,
  Settings,
  Globe,
  MessageSquare,
  Search,
  Loader2
} from 'lucide-react';
import { MapContainer, TileLayer, Polygon as LeafletPolygon, Polyline, CircleMarker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import api from '../api';
import { municipalityPublicUrl } from '../lib/branding';

type CategoryRow = {
  id: string;
  name: string;
  description: string;
  iconCode: string;
  enabled: boolean;
};

type DepartmentRow = {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
};

const DEFAULT_CATEGORIES: Omit<CategoryRow, 'id'>[] = [
  { name: 'Çukur', description: 'Yol ve kaldırım çukurları', iconCode: 'road_crack', enabled: true },
  { name: 'Aydınlatma', description: 'Sokak aydınlatma arızaları', iconCode: 'streetlight', enabled: true },
  { name: 'Çöp', description: 'Çöp ve atık bildirimleri', iconCode: 'trash', enabled: true },
  { name: 'Park', description: 'Park ve yeşil alan talepleri', iconCode: 'park', enabled: true },
];

const DEFAULT_DEPARTMENTS: Omit<DepartmentRow, 'id'>[] = [
  { name: 'Fen İşleri', description: 'Yol, kaldırım ve saha onarım operasyonları', enabled: true },
  { name: 'Park ve Bahçeler', description: 'Yeşil alan, park ve peyzaj işleri', enabled: true },
  { name: 'Temizlik İşleri', description: 'Atık, temizlik ve konteyner süreçleri', enabled: true },
  { name: 'Zabıta', description: 'Denetim, güvenlik ve saha yönlendirmeleri', enabled: true },
];

const inputClass =
  'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary dark:border-slate-700 dark:bg-slate-950 dark:focus:border-primary';

const stepLabels = {
  municipality: 'Markalama',
  boundaries: 'Sınırlar',
  admin: 'Hesaplar',
  operational: 'Departmanlar',
  transit: 'Ulaşım',
  integrations: 'Entegrasyon',
  review: 'Özet',
} as const;

type StepId = keyof typeof stepLabels;

function parseOptNumber(s: string): number | null {
  const trimmed = s.trim();
  if (!trimmed) return null;
  const next = Number(trimmed);
  return Number.isFinite(next) ? next : null;
}

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/ı/g, 'i')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function newCategoryRows(): CategoryRow[] {
  return DEFAULT_CATEGORIES.map((item, index) => ({ id: `cat-${index}`, ...item }));
}

function newDepartmentRows(): DepartmentRow[] {
  return DEFAULT_DEPARTMENTS.map((item, index) => ({ id: `dept-${index}`, ...item }));
}

function MapClickEvent({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng.lat, e.latlng.lng);
    }
  });
  return null;
}

function MapRefCapture({ onMap }: { onMap: (map: L.Map) => void }) {
  const map = useMap();
  useEffect(() => { onMap(map); }, [map, onMap]);
  return null;
}

export default function MunicipalityOnboardingPage() {
  const navigate = useNavigate();
  const [stepIndex, setStepIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Step 1: Branding
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [slogan, setSlogan] = useState('');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [primaryColor, setPrimaryColor] = useState('#2563EB');
  const [secondaryColor, setSecondaryColor] = useState('#4F46E5');
  const [accentColor, setAccentColor] = useState('#F59E0B');
  const [workflowMode, setWorkflowMode] = useState<'SIMPLE' | 'DEPARTMENTAL'>('SIMPLE');

  // Step 2: Boundaries & Coordinates
  const [centerLatStr, setCenterLatStr] = useState('41.0082');
  const [centerLngStr, setCenterLngStr] = useState('28.9784');
  const [defaultZoomStr, setDefaultZoomStr] = useState('12');
  const [coordinates, setCoordinates] = useState<[number, number][]>([]);

  // OSM boundary fetch
  const [osmQuery, setOsmQuery] = useState('');
  const [osmCityQuery, setOsmCityQuery] = useState('');
  const [osmFetching, setOsmFetching] = useState(false);
  const [osmError, setOsmError] = useState('');
  const mapRef = useRef<L.Map | null>(null);

  // Step 3: Admin & Staff Accounts
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminFullName, setAdminFullName] = useState('');
  const [adminPhone, setAdminPhone] = useState('');

  const [whiteDeskEmail, setWhiteDeskEmail] = useState('');
  const [whiteDeskPassword, setWhiteDeskPassword] = useState('');
  const [whiteDeskFullName, setWhiteDeskFullName] = useState('');
  const [whiteDeskPhone, setWhiteDeskPhone] = useState('');

  // Step 4: Departments & Categories
  const [categories, setCategories] = useState<CategoryRow[]>(newCategoryRows);
  const [departments, setDepartments] = useState<DepartmentRow[]>(newDepartmentRows);

  // Step 5: Transit
  const [transitFiles, setTransitFiles] = useState<File[]>([]);

  // Step 6: Integrations
  const [smsSenderHeader, setSmsSenderHeader] = useState('');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [webhookEnabled, setWebhookEnabled] = useState(false);
  const [webhookSecret, setWebhookSecret] = useState('');
  const [misType, setMisType] = useState('NONE');
  const [misUrl, setMisUrl] = useState('');
  const [misApiKey, setMisApiKey] = useState('');
  const [widgetCitySlug, setWidgetCitySlug] = useState('');
  const [widgetDistrictSlug, setWidgetDistrictSlug] = useState('');

  useEffect(() => {
    if (workflowMode !== 'DEPARTMENTAL') {
      setWhiteDeskEmail('');
      setWhiteDeskPassword('');
      setWhiteDeskFullName('');
      setWhiteDeskPhone('');
    }
  }, [workflowMode]);

  const steps = useMemo<StepId[]>(
    () =>
      workflowMode === 'DEPARTMENTAL'
        ? ['municipality', 'boundaries', 'admin', 'operational', 'transit', 'integrations', 'review']
        : ['municipality', 'boundaries', 'admin', 'operational', 'transit', 'integrations', 'review'],
    [workflowMode],
  );

  const currentStep = steps[Math.min(stepIndex, steps.length - 1)];
  const municipalitySlug = slug.trim() || slugify(name) || 'belediye';
  const municipalityPublicEntry = municipalityPublicUrl(municipalitySlug);

  const enabledCategories = useMemo(
    () => categories.filter((item) => item.enabled && item.name.trim()),
    [categories],
  );
  const enabledDepartments = useMemo(
    () => departments.filter((item) => item.enabled && item.name.trim()),
    [departments],
  );

  const currentStepValid = useMemo(() => {
    const lat = parseOptNumber(centerLatStr);
    const lng = parseOptNumber(centerLngStr);
    const zoom = parseOptNumber(defaultZoomStr);

    switch (currentStep) {
      case 'municipality':
        return (
          name.trim().length >= 2 &&
          (!slug.trim() || /^[a-z0-9-]+$/.test(slug.trim()))
        );
      case 'boundaries':
        return lat != null && lng != null && zoom != null;
      case 'admin':
        const adminValid = adminEmail.trim().includes('@') && adminPassword.length >= 8 && adminFullName.trim().length >= 2;
        if (workflowMode === 'DEPARTMENTAL') {
          return adminValid && whiteDeskEmail.trim().includes('@') && whiteDeskPassword.length >= 8 && whiteDeskFullName.trim().length >= 2;
        }
        return adminValid;
      case 'operational':
        const catValid = enabledCategories.length > 0;
        if (workflowMode === 'DEPARTMENTAL') {
          return catValid && enabledDepartments.length > 0;
        }
        return catValid;
      case 'transit':
      case 'integrations':
      case 'review':
      default:
        return true;
    }
  }, [
    adminEmail,
    adminFullName,
    adminPassword,
    centerLatStr,
    centerLngStr,
    currentStep,
    defaultZoomStr,
    enabledCategories.length,
    enabledDepartments.length,
    name,
    slug,
    workflowMode,
    whiteDeskEmail,
    whiteDeskFullName,
    whiteDeskPassword,
  ]);

  const updateCategory = (id: string, patch: Partial<CategoryRow>) => {
    setCategories((rows) => rows.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  };

  const updateDepartment = (id: string, patch: Partial<DepartmentRow>) => {
    setDepartments((rows) => rows.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  };

  const addCategory = () => {
    setCategories((rows) => [
      ...rows,
      {
        id: `cat-${Date.now()}`,
        name: '',
        description: '',
        iconCode: 'other',
        enabled: true,
      },
    ]);
  };

  const addDepartment = () => {
    setDepartments((rows) => [
      ...rows,
      {
        id: `dept-${Date.now()}`,
        name: '',
        description: '',
        enabled: true,
      },
    ]);
  };

  const removeDepartment = (id: string) => {
    setDepartments((rows) => rows.filter((row) => row.id !== id));
  };

  const handleGeoJsonUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const geojson = JSON.parse(event.target?.result as string);
        let geometry = geojson.geometry || geojson;
        if (geojson.type === 'FeatureCollection' && geojson.features?.length > 0) {
          geometry = geojson.features[0].geometry;
        }
        if (geometry.type === 'Polygon' && geometry.coordinates?.length > 0) {
          const coords = geometry.coordinates[0].map((c: any) => [c[1], c[0]]);
          setCoordinates(coords);
          setError('');
        } else {
          setError('Geçersiz GeoJSON. Lütfen geçerli bir Polygon geometrisi içeren GeoJSON yükleyin.');
        }
      } catch (err) {
        setError('GeoJSON dosyası okunurken hata oluştu.');
      }
    };
    reader.readAsText(file);
  };

  const handleMapClick = (lat: number, lng: number) => {
    setCoordinates((prev) => [...prev, [lat, lng]]);
  };

  const clearCoordinates = () => {
    setCoordinates([]);
  };

  const handleOsmFetch = async () => {
    const q = osmQuery.trim() || name.trim();
    if (!q) { setOsmError('Lütfen bir ilçe/bölge adı girin.'); return; }
    setOsmFetching(true);
    setOsmError('');
    try {
      const params: Record<string, string> = { districtName: q };
      const city = osmCityQuery.trim();
      if (city) params.cityName = city;
      const res = await api.get('/admin/onboarding/osm-boundary', { params });
      const geoJsonStr = res.data?.data;
      if (!geoJsonStr) { setOsmError('Sınır verisi bulunamadı.'); return; }
      const geometry = JSON.parse(geoJsonStr);
      let rings: number[][][] = [];
      if (geometry.type === 'Polygon') {
        rings = [geometry.coordinates[0]];
      } else if (geometry.type === 'MultiPolygon') {
        rings = geometry.coordinates.map((poly: number[][][]) => poly[0]);
      }
      if (rings.length === 0) { setOsmError('Geçerli poligon bulunamadı.'); return; }
      // Use the largest ring (most points)
      const largestRing = rings.reduce((a, b) => (a.length >= b.length ? a : b));
      // GeoJSON is [lng, lat] — convert to [lat, lng]
      const coords: [number, number][] = largestRing.map((c: number[]) => [c[1], c[0]]);
      setCoordinates(coords);
      // Compute center and fit bounds
      if (coords.length > 0) {
        const latSum = coords.reduce((s, c) => s + c[0], 0);
        const lngSum = coords.reduce((s, c) => s + c[1], 0);
        setCenterLatStr((latSum / coords.length).toFixed(6));
        setCenterLngStr((lngSum / coords.length).toFixed(6));
        if (mapRef.current) {
          const bounds = L.latLngBounds(coords.map(c => L.latLng(c[0], c[1])));
          mapRef.current.fitBounds(bounds, { padding: [20, 20] });
        }
      }
      setError('');
    } catch (err: any) {
      const msg = err.response?.data?.message || 'OSM sınır verisi alınırken bir hata oluştu.';
      setOsmError(msg);
    } finally {
      setOsmFetching(false);
    }
  };

  const submit = async () => {
    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const centerLat = parseOptNumber(centerLatStr);
      const centerLng = parseOptNumber(centerLngStr);
      const zoomRaw = parseOptNumber(defaultZoomStr);

      // 1. Core Onboarding post (Municipality, Admin, WhiteDesk, Departments, Categories)
      const res = await api.post('/admin/onboarding', {
        municipality: {
          name: name.trim(),
          slug: municipalitySlug,
          displayName: displayName.trim() || null,
          centerLat,
          centerLng,
          defaultZoom: zoomRaw != null ? Math.round(zoomRaw) : null,
          slogan: slogan.trim() || null,
          parentMunicipalityId: null,
          workflowMode,
        },
        admin: {
          email: adminEmail.trim(),
          password: adminPassword,
          fullName: adminFullName.trim(),
          phone: adminPhone.trim() || null,
        },
        whiteDesk:
          workflowMode === 'DEPARTMENTAL'
            ? {
                email: whiteDeskEmail.trim(),
                password: whiteDeskPassword,
                fullName: whiteDeskFullName.trim(),
                phone: whiteDeskPhone.trim() || null,
              }
            : null,
        departments:
          workflowMode === 'DEPARTMENTAL'
            ? enabledDepartments.map((item) => ({
                name: item.name.trim(),
                slug: slugify(item.name),
                description: item.description.trim() || null,
              }))
            : [],
        categories: enabledCategories.map((item) => ({
          name: item.name.trim(),
          description: item.description.trim() || null,
          iconCode: item.iconCode.trim() || null,
        })),
      });

      const data = res.data.data as {
        municipality: { id: string; displayName: string | null; name: string };
        categoriesSkipped?: string[];
      };

      const municipalityId = data.municipality.id;

      // 2. Upload logo if provided
      if (logoFile) {
        const logoFormData = new FormData();
        logoFormData.append('file', logoFile);
        await api.post(`/admin/municipalities/${municipalityId}/branding/logo`, logoFormData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }

      // 3. Patch colors & other integration configurations
      await api.patch(`/admin/municipalities/${municipalityId}`, {
        primaryColor: primaryColor || null,
        secondaryColor: secondaryColor || null,
        accentColor: accentColor || null,
        smsSenderHeader: smsSenderHeader.trim() || null,
        webhookUrl: webhookUrl.trim() || null,
        webhookEnabled: webhookUrl.trim() ? webhookEnabled : false,
        webhookSecret: webhookSecret.trim() || null,
        misType: misType || 'NONE',
        misUrl: misUrl.trim() || null,
        misApiKey: misApiKey.trim() || null,
        widgetCitySlug: widgetCitySlug.trim() || null,
        widgetDistrictSlug: widgetDistrictSlug.trim() || null,
      });

      // 4. Update boundaries if coordinates drawn
      if (coordinates.length >= 3) {
        const closedCoords = [...coordinates];
        if (
          closedCoords[0][0] !== closedCoords[closedCoords.length - 1][0] ||
          closedCoords[0][1] !== closedCoords[closedCoords.length - 1][1]
        ) {
          closedCoords.push(closedCoords[0]);
        }

        const geoJsonPolygon = {
          type: 'Polygon',
          coordinates: [closedCoords.map((c) => [c[1], c[0]])], // GeoJSON order: [lng, lat]
        };

        await api.put(`/admin/municipalities/${municipalityId}/boundaries`, geoJsonPolygon);
      }

      // 5. Upload bus routes / transit files if provided
      if (transitFiles.length > 0) {
        const formData = new FormData();
        transitFiles.forEach((file) => {
          formData.append('files', file);
        });
        await api.post(`/admin/municipalities/${municipalityId}/bus-routes/import`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }

      const label = data.municipality.displayName || data.municipality.name;
      setSuccess(`${label} kurulumu başarıyla tamamlandı. Yönlendiriliyorsunuz...`);
      setTimeout(() => navigate('/admin/municipalities'), 1800);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Kurulum sırasında bir hata oluştu. Lütfen bilgileri kontrol edin.');
    } finally {
      setSubmitting(false);
    }
  };

  const centerCoordinates = useMemo<[number, number]>(() => {
    const lat = parseOptNumber(centerLatStr);
    const lng = parseOptNumber(centerLngStr);
    return [lat != null ? lat : 41.0082, lng != null ? lng : 28.9784];
  }, [centerLatStr, centerLngStr]);

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-primary">Süper Admin</p>
          <h2 className="mt-1 flex items-center gap-2 text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            <Sparkles size={22} className="text-primary animate-pulse" />
            Belediye Kurulum Sihirbazı
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Platformumuza katılacak belediyelerin kurumsal marka kimliğini, operasyonel sınırlarını, departmanlarını ve entegrasyon ayarlarını tek bir akışta oluşturun.
          </p>
        </div>
        <Link
          to="/admin/municipalities"
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          <ArrowLeft size={16} />
          Belediye Listesi
        </Link>
      </div>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        {/* Wizard Card */}
        <div className="rounded-3xl border border-slate-200/90 bg-white/70 p-6 shadow-md backdrop-blur-md dark:border-slate-800/80 dark:bg-slate-900/40">
          {/* Stepper indicators */}
          <ol className="flex flex-wrap gap-2 pb-6 border-b border-slate-100 dark:border-slate-800">
            {steps.map((step, index) => (
              <li
                key={step}
                className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider ${
                  index === stepIndex
                    ? 'bg-primary text-white shadow-sm shadow-primary/30'
                    : index < stepIndex
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200'
                      : 'bg-slate-100 text-slate-500 dark:bg-slate-800/80 dark:text-slate-400'
                }`}
              >
                {index < stepIndex ? <Check size={12} /> : <span>{index + 1}.</span>}
                {stepLabels[step]}
              </li>
            ))}
          </ol>

          <div className="mt-6">
            {/* STEP 1: Municipality branding */}
            {currentStep === 'municipality' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-base font-bold text-slate-950 dark:text-white flex items-center gap-1.5">
                    <Palette size={18} className="text-primary" />
                    Kurumsal Kimlik ve Operasyon Modu
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">Belediyenin SaaS kimlik bilgileri ve marka renkleri.</p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block text-xs font-bold text-slate-500 sm:col-span-2">
                    Resmi Belediye Adı *
                    <input
                      required
                      className={`mt-1.5 ${inputClass}`}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Kadıköy Belediyesi"
                    />
                  </label>
                  <label className="block text-xs font-bold text-slate-500">
                    Sistem Slug'ı
                    <input
                      className={`mt-1.5 ${inputClass}`}
                      placeholder="kadikoy"
                      value={slug}
                      onChange={(e) => setSlug(slugify(e.target.value))}
                    />
                  </label>
                  <label className="block text-xs font-bold text-slate-500">
                    Görünen Ad
                    <input
                      className={`mt-1.5 ${inputClass}`}
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Kadıköy"
                    />
                  </label>
                  <label className="block text-xs font-bold text-slate-500 sm:col-span-2">
                    Slogan / Tanıtıcı Metin
                    <input
                      className={`mt-1.5 ${inputClass}`}
                      value={slogan}
                      onChange={(e) => setSlogan(e.target.value)}
                      placeholder="Geleceğe Güvenle Bakan Kadıköy"
                    />
                  </label>

                  <div className="block sm:col-span-2">
                    <span className="text-xs font-bold text-slate-500">Logo Dosyası</span>
                    <div className="mt-1.5 flex items-center gap-3">
                      <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-350 dark:hover:bg-slate-800">
                        <Upload size={14} />
                        Logo Yükle
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => setLogoFile(e.target.files?.[0] || null)}
                        />
                      </label>
                      {logoFile && (
                        <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                          {logoFile.name} ({(logoFile.size / 1024).toFixed(0)} KB)
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="block sm:col-span-2">
                    <span className="text-xs font-bold text-slate-500">Kurumsal Marka Renkleri</span>
                    <div className="mt-2 grid grid-cols-3 gap-3">
                      <div className="flex flex-col items-center gap-1.5 rounded-xl border border-slate-200/60 p-2 dark:border-slate-800 bg-slate-50/20 dark:bg-slate-950/20">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Birincil (Primary)</span>
                        <input
                          type="color"
                          value={primaryColor}
                          onChange={(e) => setPrimaryColor(e.target.value)}
                          className="h-8 w-12 cursor-pointer border-0 outline-none"
                        />
                      </div>
                      <div className="flex flex-col items-center gap-1.5 rounded-xl border border-slate-200/60 p-2 dark:border-slate-800 bg-slate-50/20 dark:bg-slate-950/20">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">İkincil (Secondary)</span>
                        <input
                          type="color"
                          value={secondaryColor}
                          onChange={(e) => setSecondaryColor(e.target.value)}
                          className="h-8 w-12 cursor-pointer border-0 outline-none"
                        />
                      </div>
                      <div className="flex flex-col items-center gap-1.5 rounded-xl border border-slate-200/60 p-2 dark:border-slate-800 bg-slate-50/20 dark:bg-slate-950/20">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Vurgu (Accent)</span>
                        <input
                          type="color"
                          value={accentColor}
                          onChange={(e) => setAccentColor(e.target.value)}
                          className="h-8 w-12 cursor-pointer border-0 outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  <label className="block text-xs font-bold text-slate-500 sm:col-span-2">
                    İş Akışı (Workflow) Modu
                    <select
                      className={`mt-1.5 ${inputClass}`}
                      value={workflowMode}
                      onChange={(e) => setWorkflowMode(e.target.value as 'SIMPLE' | 'DEPARTMENTAL')}
                    >
                      <option value="SIMPLE">Basit Mod: Doğrudan admin veya müdür yetkilisi saha görevi atar</option>
                      <option value="DEPARTMENTAL">Departmanlı Mod: Beyaz Masa üzerinden koordineli departman & saha akışı</option>
                    </select>
                  </label>
                </div>
              </div>
            )}

            {/* STEP 2: Boundaries & coordinates */}
            {currentStep === 'boundaries' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-base font-bold text-slate-950 dark:text-white flex items-center gap-1.5">
                    <MapPinned size={18} className="text-primary" />
                    Hizmet Sınırları ve Coğrafi Çit (Geofencing)
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Belediye sınırlarını OpenStreetMap'ten otomatik çekin, haritada tıklayarak çizin veya GeoJSON yükleyin.
                  </p>
                </div>

                <div className="space-y-3">
                  {/* OSM Boundary Fetch */}
                  <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/30 p-4 dark:border-emerald-900/50 dark:bg-emerald-950/20 space-y-3">
                    <h4 className="text-xs font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
                      <Globe size={14} />
                      OpenStreetMap'ten Otomatik Sınır Çekimi
                    </h4>
                    <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
                      <input
                        className={inputClass}
                        value={osmQuery}
                        onChange={(e) => setOsmQuery(e.target.value)}
                        placeholder={name.trim() || 'İlçe adı (ör: Kadıköy)'}
                      />
                      <input
                        className={inputClass}
                        value={osmCityQuery}
                        onChange={(e) => setOsmCityQuery(e.target.value)}
                        placeholder="İl adı (ör: İstanbul)"
                      />
                      <button
                        type="button"
                        disabled={osmFetching}
                        onClick={() => void handleOsmFetch()}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50 whitespace-nowrap"
                      >
                        {osmFetching ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
                        {osmFetching ? 'Aranıyor…' : "Sınırları Getir"}
                      </button>
                    </div>
                    {osmError && <p className="text-[11px] font-semibold text-red-500">{osmError}</p>}
                  </div>

                  <div className="flex flex-wrap gap-2 items-center justify-between">
                    <label className="flex cursor-pointer items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-800">
                      <Upload size={12} />
                      GeoJSON Yükle (.geojson)
                      <input
                        type="file"
                        accept=".geojson,application/json"
                        className="hidden"
                        onChange={handleGeoJsonUpload}
                      />
                    </label>

                    {coordinates.length > 0 && (
                      <button
                        type="button"
                        onClick={clearCoordinates}
                        className="text-xs font-bold text-red-500 hover:underline flex items-center gap-1"
                      >
                        <Trash2 size={12} />
                        Çizimi Temizle ({coordinates.length} nokta)
                      </button>
                    )}
                  </div>

                  <div className="h-80 w-full rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800">
                    <MapContainer center={centerCoordinates} zoom={parseOptNumber(defaultZoomStr) || 12} className="h-full w-full">
                      <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      />
                      <MapRefCapture onMap={(m) => { mapRef.current = m; }} />
                      <MapClickEvent onMapClick={handleMapClick} />
                      {coordinates.length > 0 && (
                        <>
                          {coordinates.map((coord, idx) => (
                            <CircleMarker
                              key={idx}
                              center={coord}
                              radius={6}
                              pathOptions={{ color: primaryColor, fillColor: primaryColor, fillOpacity: 0.8 }}
                            />
                          ))}
                          {coordinates.length >= 3 ? (
                            <LeafletPolygon
                              positions={coordinates}
                              pathOptions={{ color: primaryColor, fillColor: primaryColor, fillOpacity: 0.2 }}
                            />
                          ) : (
                            coordinates.length === 2 && (
                              <Polyline
                                positions={coordinates}
                                pathOptions={{ color: primaryColor }}
                              />
                            )
                          )}
                        </>
                      )}
                    </MapContainer>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3">
                    <label className="block text-xs font-bold text-slate-500">
                      Harita Merkez Enlemi
                      <input
                        type="text"
                        className={`mt-1.5 ${inputClass}`}
                        value={centerLatStr}
                        onChange={(e) => setCenterLatStr(e.target.value)}
                      />
                    </label>
                    <label className="block text-xs font-bold text-slate-500">
                      Harita Merkez Boylamı
                      <input
                        type="text"
                        className={`mt-1.5 ${inputClass}`}
                        value={centerLngStr}
                        onChange={(e) => setCenterLngStr(e.target.value)}
                      />
                    </label>
                    <label className="block text-xs font-bold text-slate-500">
                      Başlangıç Zoom
                      <input
                        type="text"
                        className={`mt-1.5 ${inputClass}`}
                        value={defaultZoomStr}
                        onChange={(e) => setDefaultZoomStr(e.target.value)}
                      />
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 3: Admin & staff accounts */}
            {currentStep === 'admin' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-base font-bold text-slate-950 dark:text-white flex items-center gap-1.5">
                    <Shield size={18} className="text-primary" />
                    Erişim ve Yetkilendirme Hesapları
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">Sistem yönetim yetkilisi ve Beyaz Masa sorumlusu bilgileri.</p>
                </div>

                <div className="space-y-4">
                  {/* First Administrator */}
                  <div className="rounded-2xl border border-slate-200/80 p-4 dark:border-slate-800 bg-slate-50/20 dark:bg-slate-950/20 space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">1. Sistem Yöneticisi (Admin)</h4>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="block text-xs font-semibold text-slate-500 sm:col-span-2">
                        Ad Soyad *
                        <input className={`mt-1.5 ${inputClass}`} value={adminFullName} onChange={(e) => setAdminFullName(e.target.value)} />
                      </label>
                      <label className="block text-xs font-semibold text-slate-500">
                        E-posta Adresi *
                        <input type="email" className={`mt-1.5 ${inputClass}`} value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} />
                      </label>
                      <label className="block text-xs font-semibold text-slate-500">
                        Telefon Numarası
                        <input className={`mt-1.5 ${inputClass}`} value={adminPhone} onChange={(e) => setAdminPhone(e.target.value)} />
                      </label>
                      <label className="block text-xs font-semibold text-slate-500 sm:col-span-2">
                        Şifre *
                        <input type="password" className={`mt-1.5 ${inputClass}`} value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} />
                      </label>
                    </div>
                  </div>

                  {/* White Desk (Only for departmental mode) */}
                  {workflowMode === 'DEPARTMENTAL' && (
                    <div className="rounded-2xl border border-slate-200/80 p-4 dark:border-slate-800 bg-slate-50/20 dark:bg-slate-950/20 space-y-3">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-violet-500">2. Beyaz Masa Operatörü</h4>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <label className="block text-xs font-semibold text-slate-500 sm:col-span-2">
                          Ad Soyad *
                          <input className={`mt-1.5 ${inputClass}`} value={whiteDeskFullName} onChange={(e) => setWhiteDeskFullName(e.target.value)} />
                        </label>
                        <label className="block text-xs font-semibold text-slate-500">
                          E-posta Adresi *
                          <input type="email" className={`mt-1.5 ${inputClass}`} value={whiteDeskEmail} onChange={(e) => setWhiteDeskEmail(e.target.value)} />
                        </label>
                        <label className="block text-xs font-semibold text-slate-500">
                          Telefon Numarası
                          <input className={`mt-1.5 ${inputClass}`} value={whiteDeskPhone} onChange={(e) => setWhiteDeskPhone(e.target.value)} />
                        </label>
                        <label className="block text-xs font-semibold text-slate-500 sm:col-span-2">
                          Şifre *
                          <input type="password" className={`mt-1.5 ${inputClass}`} value={whiteDeskPassword} onChange={(e) => setWhiteDeskPassword(e.target.value)} />
                        </label>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* STEP 4: Departments & categories */}
            {currentStep === 'operational' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-base font-bold text-slate-950 dark:text-white flex items-center gap-1.5">
                    <Layers3 size={18} className="text-primary" />
                    Departmanlar ve İhbar Kategorileri
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">Uygulama açılışında tohumlanacak (seed) varsayılan veriler.</p>
                </div>

                {/* Departments list (only if departmental mode) */}
                {workflowMode === 'DEPARTMENTAL' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2 dark:border-slate-800">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Aktif Departmanlar</h4>
                      <button
                        type="button"
                        onClick={addDepartment}
                        className="text-xs font-bold text-primary hover:underline flex items-center gap-0.5"
                      >
                        <Plus size={12} />
                        Departman Ekle
                      </button>
                    </div>
                    <div className="space-y-3">
                      {departments.map((item) => (
                        <div key={item.id} className="rounded-2xl border border-slate-200/80 p-4 dark:border-slate-800/80 bg-slate-50/10 dark:bg-slate-950/10">
                          <div className="flex items-center justify-between">
                            <label className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-400">
                              <input
                                type="checkbox"
                                checked={item.enabled}
                                onChange={(e) => updateDepartment(item.id, { enabled: e.target.checked })}
                                className="rounded"
                              />
                              Dahil Et
                            </label>
                            {departments.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeDepartment(item.id)}
                                className="text-xs font-bold text-red-500 hover:text-red-600 flex items-center gap-0.5"
                              >
                                <Trash2 size={12} />
                                Kaldır
                              </button>
                            )}
                          </div>
                          <div className="mt-3 grid gap-3 sm:grid-cols-2">
                            <input
                              placeholder="Departman Adı (ör: Fen İşleri)"
                              className={inputClass}
                              value={item.name}
                              disabled={!item.enabled}
                              onChange={(e) => updateDepartment(item.id, { name: e.target.value })}
                            />
                            <input
                              placeholder="Açıklama"
                              className={inputClass}
                              value={item.description}
                              disabled={!item.enabled}
                              onChange={(e) => updateDepartment(item.id, { description: e.target.value })}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Categories list */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2 dark:border-slate-800">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Vatandaş İhbar Kategorileri</h4>
                    <button
                      type="button"
                      onClick={addCategory}
                      className="text-xs font-bold text-primary hover:underline flex items-center gap-0.5"
                    >
                      <Plus size={12} />
                      Kategori Ekle
                    </button>
                  </div>
                  <div className="space-y-3">
                    {categories.map((item) => (
                      <div key={item.id} className="rounded-2xl border border-slate-200/80 p-4 dark:border-slate-800/80 bg-slate-50/10 dark:bg-slate-950/10">
                        <div className="flex items-center justify-between">
                          <label className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-400">
                            <input
                              type="checkbox"
                              checked={item.enabled}
                              onChange={(e) => updateCategory(item.id, { enabled: e.target.checked })}
                              className="rounded"
                            />
                            Dahil Et
                          </label>
                          {categories.length > 1 && (
                            <button
                              type="button"
                              onClick={() => setCategories((rows) => rows.filter((row) => row.id !== item.id))}
                              className="text-xs font-bold text-red-500 hover:text-red-600 flex items-center gap-0.5"
                            >
                              <Trash2 size={12} />
                              Kaldır
                            </button>
                          )}
                        </div>
                        <div className="mt-3 grid gap-3 sm:grid-cols-3">
                          <input
                            placeholder="Kategori Adı"
                            className={inputClass}
                            value={item.name}
                            disabled={!item.enabled}
                            onChange={(e) => updateCategory(item.id, { name: e.target.value })}
                          />
                          <input
                            placeholder="İkon Kodu"
                            className={inputClass}
                            value={item.iconCode}
                            disabled={!item.enabled}
                            onChange={(e) => updateCategory(item.id, { iconCode: e.target.value })}
                          />
                          <input
                            placeholder="Açıklama"
                            className={inputClass}
                            value={item.description}
                            disabled={!item.enabled}
                            onChange={(e) => updateCategory(item.id, { description: e.target.value })}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* STEP 5: Transit */}
            {currentStep === 'transit' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-base font-bold text-slate-950 dark:text-white flex items-center gap-1.5">
                    <Sparkles size={18} className="text-primary" />
                    Otobüs Hatları ve Sefer Saatleri (İsteğe Bağlı)
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Otobüs durak, hat ve saat bilgilerini içeren PDF veya Excel dosyalarını yükleyin. Gemini AI bu belgeleri otomatik okuyarak hat verilerini işleyecektir.
                  </p>
                </div>

                <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200/80 p-8 text-center dark:border-slate-800/80 bg-slate-50/30 dark:bg-slate-950/10">
                  <Upload size={36} className="text-slate-400 mb-2" />
                  <label className="cursor-pointer text-xs font-bold text-primary hover:underline">
                    Dosya Seçin (PDF, Excel, TXT, CSV)
                    <input
                      type="file"
                      multiple
                      accept=".pdf,.xlsx,.xls,.txt,.csv"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files) {
                          setTransitFiles(Array.from(e.target.files));
                        }
                      }}
                    />
                  </label>
                  <p className="mt-1 text-[10px] text-slate-400">Birden fazla dosya seçebilirsiniz.</p>

                  {transitFiles.length > 0 && (
                    <div className="mt-4 w-full max-w-xs space-y-1.5 text-left border-t border-slate-100 pt-3 dark:border-slate-800">
                      <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Seçilen Dosyalar:</p>
                      {transitFiles.map((file, i) => (
                        <div key={i} className="text-xs text-slate-600 dark:text-slate-400 truncate font-medium">
                          • {file.name} ({(file.size / 1024).toFixed(0)} KB)
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* STEP 6: Integrations */}
            {currentStep === 'integrations' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-base font-bold text-slate-950 dark:text-white flex items-center gap-1.5">
                    <Settings size={18} className="text-primary" />
                    Entegrasyon ve API Ayarları
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Harici sistem (CRM/EBYS), SMS, Webhook ve Belediye Web Widget parametrelerini kurun.
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block text-xs font-bold text-slate-500">
                    SMS Alıcı Başlığı (Sender Header)
                    <input
                      className={`mt-1.5 ${inputClass}`}
                      value={smsSenderHeader}
                      onChange={(e) => setSmsSenderHeader(e.target.value)}
                      placeholder="KENTIVA"
                    />
                  </label>

                  <div className="border-t border-slate-100 pt-3 dark:border-slate-800 sm:col-span-2 space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                      <Globe size={14} />
                      CRM / MIS Sistem Entegrasyonu (EBYS)
                    </h4>
                    <div className="grid gap-3 sm:grid-cols-3">
                      <label className="block text-xs font-semibold text-slate-500">
                        Entegrasyon Tipi
                        <select
                          className={`mt-1.5 ${inputClass}`}
                          value={misType}
                          onChange={(e) => setMisType(e.target.value)}
                        >
                          <option value="NONE">Bağlantı Yok</option>
                          <option value="NETCAD">Netcad Kent Bilgi Sistemi</option>
                          <option value="KENTBILGI">KentBilgi ERP</option>
                          <option value="MOCK">Simülasyon (Mock API)</option>
                        </select>
                      </label>
                      <label className="block text-xs font-semibold text-slate-500 sm:col-span-2">
                        Entegrasyon Web Servis URL'i
                        <input
                          className={`mt-1.5 ${inputClass}`}
                          value={misUrl}
                          disabled={misType === 'NONE'}
                          onChange={(e) => setMisUrl(e.target.value)}
                          placeholder="https://crm.belediye.bel.tr/api/v1"
                        />
                      </label>
                      <label className="block text-xs font-semibold text-slate-500 sm:col-span-3">
                        Entegrasyon API Anahtarı (Key / Secret)
                        <input
                          type="password"
                          className={`mt-1.5 ${inputClass}`}
                          value={misApiKey}
                          disabled={misType === 'NONE'}
                          onChange={(e) => setMisApiKey(e.target.value)}
                          placeholder="••••••••••••••••"
                        />
                      </label>
                    </div>
                  </div>

                  <div className="border-t border-slate-100 pt-3 dark:border-slate-800 sm:col-span-2 space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                      <MessageSquare size={14} />
                      Dışarı Giden Webhook Bildirimleri
                    </h4>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="block text-xs font-semibold text-slate-500 sm:col-span-2">
                        Webhook Hedef URL (CRM/ERP tetikleyici)
                        <input
                          className={`mt-1.5 ${inputClass}`}
                          value={webhookUrl}
                          onChange={(e) => setWebhookUrl(e.target.value)}
                          placeholder="https://webhook.site/your-uuid"
                        />
                      </label>
                      <label className="block text-xs font-semibold text-slate-500">
                        HMAC Signature Secret Key
                        <input
                          type="password"
                          className={`mt-1.5 ${inputClass}`}
                          value={webhookSecret}
                          onChange={(e) => setWebhookSecret(e.target.value)}
                          placeholder="webhook-hmac-secret-key"
                        />
                      </label>
                      <div className="flex items-center gap-2 mt-6">
                        <input
                          type="checkbox"
                          id="webhookEnabled"
                          checked={webhookEnabled}
                          onChange={(e) => setWebhookEnabled(e.target.checked)}
                          className="rounded"
                        />
                        <label htmlFor="webhookEnabled" className="text-xs font-bold text-slate-600 dark:text-slate-400 cursor-pointer">
                          Webhook Gönderimini Aktif Et
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-slate-100 pt-3 dark:border-slate-800 sm:col-span-2 space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Nöbetçi Eczane Widget Slug Değerleri
                    </h4>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="block text-xs font-semibold text-slate-500">
                        İl Slug (ör: istanbul)
                        <input
                          className={`mt-1.5 ${inputClass}`}
                          value={widgetCitySlug}
                          onChange={(e) => setWidgetCitySlug(e.target.value)}
                          placeholder="istanbul"
                        />
                      </label>
                      <label className="block text-xs font-semibold text-slate-500">
                        İlçe Slug (ör: kadikoy)
                        <input
                          className={`mt-1.5 ${inputClass}`}
                          value={widgetDistrictSlug}
                          onChange={(e) => setWidgetDistrictSlug(e.target.value)}
                          placeholder="kadikoy"
                        />
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 7: Review & confirm */}
            {currentStep === 'review' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-base font-bold text-slate-950 dark:text-white flex items-center gap-1.5">
                    <Check size={18} className="text-emerald-500" />
                    Kurulum Özeti ve Onay
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">Yeni belediye sistemini açmadan önce girilen verileri son kez doğrulayın.</p>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-2xl border border-slate-200/60 bg-slate-50/10 p-4 dark:border-slate-800/80 dark:bg-slate-950/20 space-y-2">
                    <h4 className="text-xs font-bold text-primary uppercase tracking-wide flex items-center gap-1">
                      <Building2 size={12} />
                      Belediye & Markalama
                    </h4>
                    <ul className="text-xs space-y-1 text-slate-600 dark:text-slate-400 font-medium">
                      <li>• Resmi Adı: {name}</li>
                      <li>• Görünen Ad: {displayName || name}</li>
                      <li>• Slug: {municipalitySlug}</li>
                      <li>• Slogan: {slogan || 'Yok'}</li>
                      <li>
                        • Renk Paleti:
                        <span className="inline-block h-3 w-3 rounded-full mx-1" style={{ backgroundColor: primaryColor }} />
                        <span className="inline-block h-3 w-3 rounded-full mx-1" style={{ backgroundColor: secondaryColor }} />
                        <span className="inline-block h-3 w-3 rounded-full mx-1" style={{ backgroundColor: accentColor }} />
                      </li>
                      <li>• İş Akışı Modu: {workflowMode === 'DEPARTMENTAL' ? 'Departmanlı Mod' : 'Basit Mod'}</li>
                    </ul>
                  </div>

                  <div className="rounded-2xl border border-slate-200/60 bg-slate-50/10 p-4 dark:border-slate-800/80 dark:bg-slate-950/20 space-y-2">
                    <h4 className="text-xs font-bold text-primary uppercase tracking-wide flex items-center gap-1">
                      <MapPinned size={12} />
                      Coğrafi Tanımlar
                    </h4>
                    <ul className="text-xs space-y-1 text-slate-600 dark:text-slate-400 font-medium">
                      <li>• Merkez Konum: {centerLatStr}, {centerLngStr}</li>
                      <li>• Başlangıç Zoom: {defaultZoomStr}</li>
                      <li>• Çizilen Sınır: {coordinates.length >= 3 ? `${coordinates.length} nokta ile poligon tanımlandı` : 'Sınır poligonu çizilmedi (OSM otomatik senkronize edilecek)'}</li>
                    </ul>
                  </div>

                  <div className="rounded-2xl border border-slate-200/60 bg-slate-50/10 p-4 dark:border-slate-800/80 dark:bg-slate-950/20 space-y-2">
                    <h4 className="text-xs font-bold text-primary uppercase tracking-wide flex items-center gap-1">
                      <Shield size={12} />
                      Erişim Yetkilileri
                    </h4>
                    <ul className="text-xs space-y-1 text-slate-600 dark:text-slate-400 font-medium">
                      <li>• Yönetici (Admin): {adminFullName} ({adminEmail})</li>
                      {workflowMode === 'DEPARTMENTAL' && (
                        <li>• Beyaz Masa Sorumlusu: {whiteDeskFullName} ({whiteDeskEmail})</li>
                      )}
                    </ul>
                  </div>

                  <div className="rounded-2xl border border-slate-200/60 bg-slate-50/10 p-4 dark:border-slate-800/80 dark:bg-slate-950/20 space-y-2">
                    <h4 className="text-xs font-bold text-primary uppercase tracking-wide flex items-center gap-1">
                      <Settings size={12} />
                      Entegrasyonlar & API
                    </h4>
                    <ul className="text-xs space-y-1 text-slate-600 dark:text-slate-400 font-medium">
                      <li>• SMS Başlığı: {smsSenderHeader || 'KENTIVA (Varsayılan)'}</li>
                      <li>• EBYS / CRM Tipi: {misType}</li>
                      <li>• Webhook Aktif mi: {webhookUrl ? (webhookEnabled ? 'Evet' : 'Hayır') : 'Kurulu Değil'}</li>
                      <li>• Eczane Arama Bölgesi: {widgetCitySlug && widgetDistrictSlug ? `${widgetCitySlug}/${widgetDistrictSlug}` : 'Belirlenmedi'}</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>

          {error ? <p className="mt-5 text-xs font-bold text-red-500">{error}</p> : null}
          {success ? <p className="mt-5 text-xs font-bold text-emerald-500">{success}</p> : null}

          {/* Stepper buttons */}
          <div className="mt-6 flex flex-wrap gap-2 border-t border-slate-100 pt-4 dark:border-slate-850">
            {stepIndex > 0 ? (
              <button
                type="button"
                onClick={() => setStepIndex((current) => current - 1)}
                className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-350 dark:hover:bg-slate-800"
              >
                <ArrowLeft size={14} />
                Geri
              </button>
            ) : null}
            <div className="flex-1" />
            {stepIndex < steps.length - 1 ? (
              <button
                type="button"
                disabled={!currentStepValid}
                onClick={() => setStepIndex((current) => current + 1)}
                className="inline-flex items-center gap-1 rounded-xl bg-primary px-4.5 py-2 text-xs font-bold text-white shadow-sm shadow-primary/20 hover:bg-blue-700 disabled:opacity-40"
              >
                İleri
                <ArrowRight size={14} />
              </button>
            ) : (
              <button
                type="button"
                disabled={submitting || !currentStepValid}
                onClick={() => void submit()}
                className="rounded-xl bg-emerald-500 px-5 py-2 text-xs font-bold text-white shadow-sm shadow-emerald-500/20 hover:bg-emerald-600 disabled:opacity-40"
              >
                {submitting ? 'Kurulum Başlatılıyor…' : 'Kurulumu Tamamla'}
              </button>
            )}
          </div>
        </div>

        {/* Info Sidebar */}
        <aside className="space-y-4">
          <div className="rounded-3xl border border-slate-200/90 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-2 text-primary">
              <Building2 className="h-4 w-4" />
              <p className="text-xs font-bold uppercase tracking-wider">Çok Kiracılı SaaS Tanımı</p>
            </div>
            <div className="mt-4 space-y-4 text-xs font-medium text-slate-600 dark:text-slate-400 leading-relaxed">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Canlı Önizleme Adresi</p>
                <p className="mt-1 font-bold text-slate-900 dark:text-white truncate">{municipalityPublicEntry}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">İş Akışı Yapısı</p>
                <p className="mt-1 font-bold text-slate-900 dark:text-white">
                  {workflowMode === 'DEPARTMENTAL' ? 'Beyaz Masa > Departmanlar > Saha' : 'Yöneticiler > Saha Personelleri'}
                </p>
              </div>
              <p>
                Sisteme onboarding olan belediye, diğer tüm verilerden veritabanı şeması bazında tamamen izole bir şekilde çalışmaya başlar. Sınır çizimi (coğrafi çit) sayesinde, bu sınırların dışından gelen ihbarlar otomatik engellenir.
              </p>
            </div>
          </div>
        </aside>
      </section>
    </div>
  );
}
