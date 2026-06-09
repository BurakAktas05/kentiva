import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  Layers3,
  Link2,
  MapPinned,
  Shield,
  Sparkles,
  Workflow,
} from 'lucide-react';
import api from '../api';
import { departmentPublicUrl, municipalityPublicUrl } from '../lib/branding';

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
  { name: 'Cukur', description: 'Yol ve kaldirim cukurlari', iconCode: 'road_crack', enabled: true },
  { name: 'Aydinlatma', description: 'Sokak aydinlatma arizalari', iconCode: 'streetlight', enabled: true },
  { name: 'Cop', description: 'Cop ve atik bildirimleri', iconCode: 'trash', enabled: true },
  { name: 'Park', description: 'Park ve yesil alan talepleri', iconCode: 'park', enabled: true },
];

const DEFAULT_DEPARTMENTS: Omit<DepartmentRow, 'id'>[] = [
  { name: 'Fen Isleri', description: 'Yol, kaldirim ve saha onarim operasyonlari', enabled: true },
  { name: 'Park ve Bahceler', description: 'Yesil alan, park ve peyzaj isleri', enabled: true },
  { name: 'Temizlik Isleri', description: 'Atik, temizlik ve konteyner surecleri', enabled: true },
  { name: 'Zabita', description: 'Denetim, guvenlik ve saha yonlendirmeleri', enabled: true },
];

const inputClass =
  'w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-950';

const stepLabels = {
  municipality: 'Belediye',
  admin: 'Yonetici',
  operations: 'Beyaz Masa',
  departments: 'Departmanlar',
  categories: 'Kategoriler',
  transit: 'Ulasim',
  review: 'Ozet',
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
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function newCategoryRows(): CategoryRow[] {
  return DEFAULT_CATEGORIES.map((item, index) => ({ id: `cat-${index}`, ...item }));
}

function newDepartmentRows(): DepartmentRow[] {
  return DEFAULT_DEPARTMENTS.map((item, index) => ({ id: `dept-${index}`, ...item }));
}

export default function MunicipalityOnboardingPage() {
  const navigate = useNavigate();
  const [stepIndex, setStepIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [centerLatStr, setCenterLatStr] = useState('41.0082');
  const [centerLngStr, setCenterLngStr] = useState('28.9784');
  const [defaultZoomStr, setDefaultZoomStr] = useState('12');
  const [slogan, setSlogan] = useState('');
  const [workflowMode, setWorkflowMode] = useState<'SIMPLE' | 'DEPARTMENTAL'>('SIMPLE');

  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminFullName, setAdminFullName] = useState('');
  const [adminPhone, setAdminPhone] = useState('');

  const [whiteDeskEmail, setWhiteDeskEmail] = useState('');
  const [whiteDeskPassword, setWhiteDeskPassword] = useState('');
  const [whiteDeskFullName, setWhiteDeskFullName] = useState('');
  const [whiteDeskPhone, setWhiteDeskPhone] = useState('');

  const [categories, setCategories] = useState<CategoryRow[]>(newCategoryRows);
  const [departments, setDepartments] = useState<DepartmentRow[]>(newDepartmentRows);
  const [transitFiles, setTransitFiles] = useState<File[]>([]);

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
        ? ['municipality', 'admin', 'operations', 'departments', 'categories', 'transit', 'review']
        : ['municipality', 'admin', 'categories', 'transit', 'review'],
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
  const firstDepartmentSlug = slugify(enabledDepartments[0]?.name || 'fen-isleri');
  const firstDepartmentPublicEntry = departmentPublicUrl(municipalitySlug, firstDepartmentSlug);

  const currentStepValid = useMemo(() => {
    const lat = parseOptNumber(centerLatStr);
    const lng = parseOptNumber(centerLngStr);
    const zoom = parseOptNumber(defaultZoomStr);

    switch (currentStep) {
      case 'municipality':
        return (
          name.trim().length >= 2 &&
          (!slug.trim() || /^[a-z0-9-]+$/.test(slug.trim())) &&
          lat != null &&
          lng != null &&
          zoom != null
        );
      case 'admin':
        return adminEmail.trim().includes('@') && adminPassword.length >= 8 && adminFullName.trim().length >= 2;
      case 'operations':
        return (
          whiteDeskEmail.trim().includes('@') &&
          whiteDeskPassword.length >= 8 &&
          whiteDeskFullName.trim().length >= 2
        );
      case 'departments':
        return enabledDepartments.length > 0;
      case 'categories':
        return enabledCategories.length > 0;
      case 'transit':
        return true;
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

  const submit = async () => {
    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const centerLat = parseOptNumber(centerLatStr);
      const centerLng = parseOptNumber(centerLngStr);
      const zoomRaw = parseOptNumber(defaultZoomStr);

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

      if (transitFiles.length > 0) {
        const formData = new FormData();
        transitFiles.forEach((file) => {
          formData.append('files', file);
        });
        await api.post(`/admin/municipalities/${data.municipality.id}/bus-routes/import`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }

      const label = data.municipality.displayName || data.municipality.name;
      const skipped = data.categoriesSkipped?.length ? ` ${data.categoriesSkipped.length} kategori zaten vardi.` : '';
      const deptInfo =
        workflowMode === 'DEPARTMENTAL' ? ` ${enabledDepartments.length} departman ve beyaz masa hesabi hazirlandi.` : '';

      setSuccess(`${label} kurulumu tamamlandi.${deptInfo}${skipped}`);
      setTimeout(() => navigate('/admin/municipalities'), 1800);
    } catch (err: unknown) {
      const next = err as { response?: { data?: { message?: string } } };
      setError(next.response?.data?.message || 'Kurulum basarisiz. Adimlari tekrar kontrol edin.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="kentiva-eyebrow">Super admin</p>
          <h2 className="mt-1 flex items-center gap-2 text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            <Sparkles size={22} className="text-primary" />
            Belediye kurulum sihirbazi
          </h2>
          <p className="mt-2 max-w-3xl text-sm font-medium text-slate-600 dark:text-slate-400">
            Belediye, ilk yonetici, workflow modeli ve gerekiyorsa beyaz masa ile departman kurgusu tek akista
            olusturulur. Hedefimiz karisik kurulum degil, uretime hazir tenant acilisi.
          </p>
        </div>
        <Link
          to="/admin/municipalities"
          className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          <ArrowLeft size={16} />
          Belediye listesi
        </Link>
      </div>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="rounded-3xl border border-slate-200/90 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <ol className="flex flex-wrap gap-2">
            {steps.map((step, index) => (
              <li
                key={step}
                className={`rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-wide ${
                  index === stepIndex
                    ? 'bg-primary text-white'
                    : index < stepIndex
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200'
                      : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                }`}
              >
                {index < stepIndex ? <Check size={12} className="mr-1 inline" /> : null}
                {index + 1}. {stepLabels[step]}
              </li>
            ))}
          </ol>

          <div className="mt-5 space-y-5">
            {currentStep === 'municipality' && (
              <div className="space-y-5">
                <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_280px]">
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white">Belediye kimligi ve operasyon modu</h3>
                      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                        Tenant slug, operasyon merkezi ve workflow tipi burada belirlenir.
                      </p>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="block text-xs font-semibold text-slate-500 sm:col-span-2">
                        Resmi ad *
                        <input
                          required
                          className={`mt-1 ${inputClass}`}
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="Kadikoy Belediyesi"
                        />
                      </label>
                      <label className="block text-xs font-semibold text-slate-500">
                        Slug
                        <input
                          className={`mt-1 ${inputClass}`}
                          placeholder="kadikoy"
                          value={slug}
                          onChange={(e) => setSlug(slugify(e.target.value))}
                        />
                      </label>
                      <label className="block text-xs font-semibold text-slate-500">
                        Gorunen ad
                        <input
                          className={`mt-1 ${inputClass}`}
                          value={displayName}
                          onChange={(e) => setDisplayName(e.target.value)}
                          placeholder="Kadikoy"
                        />
                      </label>
                      <label className="block text-xs font-semibold text-slate-500">
                        Merkez enlem
                        <input
                          type="text"
                          inputMode="decimal"
                          className={`mt-1 ${inputClass}`}
                          value={centerLatStr}
                          onChange={(e) => setCenterLatStr(e.target.value)}
                        />
                      </label>
                      <label className="block text-xs font-semibold text-slate-500">
                        Merkez boylam
                        <input
                          type="text"
                          inputMode="decimal"
                          className={`mt-1 ${inputClass}`}
                          value={centerLngStr}
                          onChange={(e) => setCenterLngStr(e.target.value)}
                        />
                      </label>
                      <label className="block text-xs font-semibold text-slate-500">
                        Varsayilan zoom
                        <input
                          type="text"
                          inputMode="numeric"
                          className={`mt-1 ${inputClass}`}
                          value={defaultZoomStr}
                          onChange={(e) => setDefaultZoomStr(e.target.value)}
                        />
                      </label>
                      <label className="block text-xs font-semibold text-slate-500 sm:col-span-2">
                        Slogan
                        <input
                          className={`mt-1 ${inputClass}`}
                          value={slogan}
                          onChange={(e) => setSlogan(e.target.value)}
                          placeholder="Mahallene daha hizli hizmet"
                        />
                      </label>
                      <label className="block text-xs font-semibold text-slate-500 sm:col-span-2">
                        Is akis modu
                        <select
                          className={`mt-1 ${inputClass}`}
                          value={workflowMode}
                          onChange={(e) => setWorkflowMode(e.target.value as 'SIMPLE' | 'DEPARTMENTAL')}
                        >
                          <option value="SIMPLE">Basit mod: admin veya mudur dogrudan gorev atar</option>
                          <option value="DEPARTMENTAL">
                            Departmanli mod: Beyaz Masa {'>'} Departman {'>'} Saha akisi
                          </option>
                        </select>
                      </label>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-primary/15 bg-primary/5 p-4 dark:border-primary/25 dark:bg-primary/10">
                    <div className="flex items-center gap-2 text-primary">
                      <Workflow className="h-4 w-4" />
                      <p className="text-sm font-bold">SaaS erisim modeli</p>
                    </div>
                    <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                      Onerilen model belediye bazli subdomain ve departman bazli path yapisi. Boylece tenant izolasyonu
                      net kalir, departmanlar ayni host altinda okunakli URL ile yonetilir.
                    </p>
                    <div className="mt-4 space-y-3 text-xs">
                      <div className="rounded-xl border border-white/70 bg-white/80 p-3 dark:border-slate-700 dark:bg-slate-900/70">
                        <p className="font-semibold text-slate-700 dark:text-slate-200">Kamu tenant hostu</p>
                        <p className="mt-1 font-mono text-primary">{municipalityPublicEntry}</p>
                      </div>
                      <div className="rounded-xl border border-white/70 bg-white/80 p-3 dark:border-slate-700 dark:bg-slate-900/70">
                        <p className="font-semibold text-slate-700 dark:text-slate-200">Admin giris akisi</p>
                        <p className="mt-1 font-mono text-primary">admin portal {'>'} municipality login {'>'} {municipalitySlug}</p>
                      </div>
                      {workflowMode === 'DEPARTMENTAL' && (
                        <div className="rounded-xl border border-white/70 bg-white/80 p-3 dark:border-slate-700 dark:bg-slate-900/70">
                          <p className="font-semibold text-slate-700 dark:text-slate-200">Departman URL ornegi</p>
                          <p className="mt-1 font-mono text-primary">{firstDepartmentPublicEntry}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {currentStep === 'admin' && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">Ilk belediye yoneticisi</h3>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    Bu hesap tenant seviyesinde ana sahibiniz olacak. Duyuru, anket, personel ve belediye ayarlari bu
                    hesapla yonetilir.
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block text-xs font-semibold text-slate-500 sm:col-span-2">
                    Ad soyad *
                    <input className={`mt-1 ${inputClass}`} value={adminFullName} onChange={(e) => setAdminFullName(e.target.value)} />
                  </label>
                  <label className="block text-xs font-semibold text-slate-500">
                    E-posta *
                    <input type="email" className={`mt-1 ${inputClass}`} value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} />
                  </label>
                  <label className="block text-xs font-semibold text-slate-500">
                    Telefon
                    <input className={`mt-1 ${inputClass}`} value={adminPhone} onChange={(e) => setAdminPhone(e.target.value)} />
                  </label>
                  <label className="block text-xs font-semibold text-slate-500 sm:col-span-2">
                    Sifre *
                    <input type="password" className={`mt-1 ${inputClass}`} value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} />
                  </label>
                </div>
              </div>
            )}

            {currentStep === 'operations' && workflowMode === 'DEPARTMENTAL' && (
              <div className="space-y-4">
                <div className="rounded-2xl border border-violet-200 bg-violet-50 p-4 dark:border-violet-900/40 dark:bg-violet-950/30">
                  <div className="flex items-center gap-2 text-violet-700 dark:text-violet-200">
                    <Shield className="h-4 w-4" />
                    <p className="font-bold">Departmanli mod icin Beyaz Masa zorunlu</p>
                  </div>
                  <p className="mt-2 text-sm text-violet-800/90 dark:text-violet-200/90">
                    Beyaz Masa gelen talepleri karsilar, uygun departmana yonlendirir ve operasyon akisini temiz tutar.
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block text-xs font-semibold text-slate-500 sm:col-span-2">
                    Beyaz Masa sorumlusu *
                    <input className={`mt-1 ${inputClass}`} value={whiteDeskFullName} onChange={(e) => setWhiteDeskFullName(e.target.value)} />
                  </label>
                  <label className="block text-xs font-semibold text-slate-500">
                    E-posta *
                    <input type="email" className={`mt-1 ${inputClass}`} value={whiteDeskEmail} onChange={(e) => setWhiteDeskEmail(e.target.value)} />
                  </label>
                  <label className="block text-xs font-semibold text-slate-500">
                    Telefon
                    <input className={`mt-1 ${inputClass}`} value={whiteDeskPhone} onChange={(e) => setWhiteDeskPhone(e.target.value)} />
                  </label>
                  <label className="block text-xs font-semibold text-slate-500 sm:col-span-2">
                    Sifre *
                    <input type="password" className={`mt-1 ${inputClass}`} value={whiteDeskPassword} onChange={(e) => setWhiteDeskPassword(e.target.value)} />
                  </label>
                </div>
              </div>
            )}

            {currentStep === 'departments' && workflowMode === 'DEPARTMENTAL' && (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">Departman tohumlama</h3>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                      Departmanli belediye secildiginde kurulumda bu adimin gelmesi gerekir. Buradaki birimler ilk gunu
                      calisir halde acar.
                    </p>
                  </div>
                  <button type="button" onClick={addDepartment} className="text-sm font-semibold text-primary hover:underline">
                    + Departman ekle
                  </button>
                </div>

                <div className="space-y-3">
                  {departments.map((item) => {
                    const routeKey = slugify(item.name) || 'departman';
                    return (
                      <div key={item.id} className="rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                            <input
                              type="checkbox"
                              checked={item.enabled}
                              onChange={(e) => updateDepartment(item.id, { enabled: e.target.checked })}
                            />
                            Dahil et
                          </label>
                          {departments.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeDepartment(item.id)}
                              className="text-xs font-semibold text-slate-500 hover:text-red-600"
                            >
                              Kaldir
                            </button>
                          )}
                        </div>

                        <div className="mt-3 grid gap-3 sm:grid-cols-2">
                          <input
                            placeholder="Departman adi"
                            className={inputClass}
                            value={item.name}
                            disabled={!item.enabled}
                            onChange={(e) => updateDepartment(item.id, { name: e.target.value })}
                          />
                          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs dark:border-slate-700 dark:bg-slate-900">
                            <p className="font-semibold text-slate-600 dark:text-slate-300">Inbox URL</p>
                            <p className="mt-1 font-mono text-primary">/municipality/{municipalitySlug}/departments/{routeKey}</p>
                          </div>
                          <input
                            placeholder="Kisa aciklama"
                            className={`sm:col-span-2 ${inputClass}`}
                            value={item.description}
                            disabled={!item.enabled}
                            onChange={(e) => updateDepartment(item.id, { description: e.target.value })}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {currentStep === 'categories' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">Varsayilan kategoriler</h3>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                      Vatandas uygulamasinda ilk gunden gorunecek hizmet kategorileri.
                    </p>
                  </div>
                  <button type="button" onClick={addCategory} className="text-sm font-semibold text-primary hover:underline">
                    + Kategori
                  </button>
                </div>

                <div className="space-y-3">
                  {categories.map((item) => (
                    <div key={item.id} className="rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
                      <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                        <input
                          type="checkbox"
                          checked={item.enabled}
                          onChange={(e) => updateCategory(item.id, { enabled: e.target.checked })}
                        />
                        Dahil et
                      </label>
                      <div className="mt-3 grid gap-3 sm:grid-cols-2">
                        <input
                          placeholder="Kategori adi"
                          className={inputClass}
                          value={item.name}
                          disabled={!item.enabled}
                          onChange={(e) => updateCategory(item.id, { name: e.target.value })}
                        />
                        <input
                          placeholder="Ikon kodu"
                          className={inputClass}
                          value={item.iconCode}
                          disabled={!item.enabled}
                          onChange={(e) => updateCategory(item.id, { iconCode: e.target.value })}
                        />
                        <input
                          placeholder="Aciklama"
                          className={`sm:col-span-2 ${inputClass}`}
                          value={item.description}
                          disabled={!item.enabled}
                          onChange={(e) => updateCategory(item.id, { description: e.target.value })}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {currentStep === 'transit' && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">Otobus Hatlari ve Sefer Saatleri (Istege bagli)</h3>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    Belediye kurulumu sirasinda otobus sefer saatleri ve hat guzergahlarini iceren PDF veya Excel dosyalarini yukleyebilirsiniz.
                    Yapay Zekamiz (Gemini) bu dosyalardan hatlari otomatik olarak olusturacaktir.
                  </p>
                </div>

                <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 p-8 text-center dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/10">
                  <Sparkles className="h-10 w-10 text-primary mb-2 animate-pulse" />
                  <label className="cursor-pointer text-xs font-semibold text-primary hover:underline">
                    Dosyalari Secin (PDF, Excel, TXT)
                    <input
                      type="file"
                      multiple
                      accept=".pdf,.xlsx,.xls,.txt,.csv"
                      onChange={(e) => {
                        if (e.target.files) {
                          setTransitFiles(Array.from(e.target.files));
                        }
                      }}
                      className="hidden"
                    />
                  </label>
                  <p className="mt-1 text-[11px] text-slate-500">Birden fazla dosya secebilirsiniz.</p>

                  {transitFiles.length > 0 && (
                    <div className="mt-4 w-full max-w-xs space-y-1.5 text-left">
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-350">Secilen Dosyalar:</p>
                      {transitFiles.map((file, i) => (
                        <div key={i} className="text-xs text-slate-600 dark:text-slate-400 truncate">
                          • {file.name} ({(file.size / 1024).toFixed(0)} KB)
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {currentStep === 'review' && (
              <div className="space-y-5">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">Kurulum ozeti</h3>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    Kaydetmeden once tenant yapisini ve operasyon akisini son kez gozden gecirin.
                  </p>
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  <SummaryCard
                    icon={<Building2 className="h-4 w-4" />}
                    title="Tenant kimligi"
                    rows={[
                      `Belediye: ${displayName.trim() || name}`,
                      `Slug: ${municipalitySlug}`,
                      `Merkez: ${centerLatStr}, ${centerLngStr}`,
                      `Workflow: ${workflowMode === 'DEPARTMENTAL' ? 'Departmanli' : 'Basit'}`,
                    ]}
                  />
                  <SummaryCard
                    icon={<Shield className="h-4 w-4" />}
                    title="Erisim hesaplari"
                    rows={[
                      `Admin: ${adminFullName} - ${adminEmail}`,
                      workflowMode === 'DEPARTMENTAL'
                        ? `Beyaz Masa: ${whiteDeskFullName} - ${whiteDeskEmail}`
                        : 'Beyaz Masa: Bu tenantta gerekmiyor',
                    ]}
                  />
                  <SummaryCard
                    icon={<Layers3 className="h-4 w-4" />}
                    title="Operasyon kurgu"
                    rows={[
                      workflowMode === 'DEPARTMENTAL'
                        ? `${enabledDepartments.length} departman ilk kurulumda acilacak`
                        : 'Departman adimi olmadan sade operasyon akisi',
                      `${enabledCategories.length} kategori mobil deneyime eklenecek`,
                    ]}
                  />
                  <SummaryCard
                    icon={<Link2 className="h-4 w-4" />}
                    title="URL stratejisi"
                    rows={[
                      `Kamu hostu: ${municipalityPublicEntry.replace(/^https?:\/\//, '')}`,
                      'Panel: super admin ile ayrik municipality login akisi',
                      workflowMode === 'DEPARTMENTAL' && enabledDepartments.length > 0
                        ? `Departman ornegi: ${departmentPublicUrl(municipalitySlug, slugify(enabledDepartments[0].name)).replace(/^https?:\/\//, '')}`
                        : 'Departman URL ornegi gerekmiyor',
                    ]}
                  />
                </div>
              </div>
            )}
          </div>

          {error ? <p className="mt-5 text-sm text-red-600">{error}</p> : null}
          {success ? <p className="mt-5 text-sm text-emerald-600">{success}</p> : null}

          <div className="mt-5 flex flex-wrap gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
            {stepIndex > 0 ? (
              <button
                type="button"
                onClick={() => setStepIndex((current) => current - 1)}
                className="inline-flex items-center gap-1 rounded-xl border px-4 py-2 text-sm font-semibold"
              >
                <ArrowLeft size={16} />
                Geri
              </button>
            ) : null}
            <div className="flex-1" />
            {stepIndex < steps.length - 1 ? (
              <button
                type="button"
                disabled={!currentStepValid}
                onClick={() => setStepIndex((current) => current + 1)}
                className="inline-flex items-center gap-1 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                Ileri
                <ArrowRight size={16} />
              </button>
            ) : (
              <button
                type="button"
                disabled={submitting || !currentStepValid}
                onClick={() => void submit()}
                className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {submitting ? 'Kaydediliyor…' : 'Kurulumu tamamla'}
              </button>
            )}
          </div>
        </div>

        <aside className="space-y-4">
          <div className="rounded-3xl border border-slate-200/90 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-2 text-primary">
              <MapPinned className="h-4 w-4" />
              <p className="text-sm font-bold">Canli tenant ozeti</p>
            </div>
            <div className="mt-4 space-y-4 text-sm">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Belediye</p>
                <p className="mt-1 font-bold text-slate-900 dark:text-white">{displayName.trim() || name || 'Yeni belediye'}</p>
                <p className="text-xs text-slate-500">{municipalitySlug}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Akis</p>
                <p className="mt-1 font-medium text-slate-900 dark:text-white">
                  {workflowMode === 'DEPARTMENTAL'
                    ? 'Beyaz Masa > Departman > Saha'
                    : 'Yonetici > Saha'}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Hazir moduller</p>
                <ul className="mt-2 space-y-2 text-slate-600 dark:text-slate-300">
                  <li className="flex items-start gap-2">
                    <span className="mt-1 h-2 w-2 rounded-full bg-primary" />
                    Rapor, personel ve disa aktarma
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1 h-2 w-2 rounded-full bg-primary" />
                    Duyuru ve anket icerik alani
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1 h-2 w-2 rounded-full bg-primary" />
                    Harita tabanli belediye merkezi
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200/90 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <p className="text-sm font-bold text-slate-900 dark:text-white">Neden path tabanli model?</p>
            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
              Ilk production surumunde tenant ayrimini URL path ile acmak, SSL, DNS ve preview ortamlarini daha rahat
              yonetir. Subdomain kurgusu daha sonra ayni slug yapisi ustunden devreye alinabilir.
            </p>
          </div>
        </aside>
      </section>
    </div>
  );
}

function SummaryCard({
  icon,
  title,
  rows,
}: {
  icon: React.ReactNode;
  title: string;
  rows: string[];
}) {
  return (
    <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900/60">
      <div className="flex items-center gap-2 text-primary">
        {icon}
        <p className="text-sm font-bold">{title}</p>
      </div>
      <ul className="mt-3 space-y-2 text-sm text-slate-600 dark:text-slate-300">
        {rows.map((row) => (
          <li key={row} className="flex items-start gap-2">
            <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-slate-300 dark:bg-slate-600" />
            <span>{row}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
