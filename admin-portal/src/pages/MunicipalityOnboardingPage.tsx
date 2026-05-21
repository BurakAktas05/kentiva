import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, Sparkles } from 'lucide-react';
import api from '../api';

type CategoryRow = {
  id: string;
  name: string;
  description: string;
  iconCode: string;
  enabled: boolean;
};

const DEFAULT_CATEGORIES: Omit<CategoryRow, 'id'>[] = [
  { name: 'Çukur', description: 'Yol ve kaldırım çukurları', iconCode: 'road_crack', enabled: true },
  { name: 'Aydınlatma', description: 'Sokak aydınlatma arızaları', iconCode: 'streetlight', enabled: true },
  { name: 'Çöp', description: 'Çöp ve atık bildirimleri', iconCode: 'trash', enabled: true },
  { name: 'Park', description: 'Park ve yeşil alan', iconCode: 'park', enabled: true },
];

const STEPS = ['Belediye', 'Yönetici', 'Kategoriler', 'Özet'] as const;

const inputClass =
  'w-full rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950';

function parseOptNumber(s: string): number | null {
  const t = s.trim();
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

function newCategoryRows(): CategoryRow[] {
  return DEFAULT_CATEGORIES.map((c, i) => ({
    id: `cat-${i}`,
    ...c,
  }));
}

export default function MunicipalityOnboardingPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
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

  const [categories, setCategories] = useState<CategoryRow[]>(newCategoryRows);

  const enabledCategories = useMemo(
    () => categories.filter((c) => c.enabled && c.name.trim()),
    [categories],
  );

  const stepValid = useMemo(() => {
    if (step === 0) return name.trim().length >= 2;
    if (step === 1) {
      return (
        adminEmail.trim().includes('@') &&
        adminPassword.length >= 8 &&
        adminFullName.trim().length >= 2
      );
    }
    if (step === 2) return enabledCategories.length > 0;
    return true;
  }, [step, name, adminEmail, adminPassword, adminFullName, enabledCategories.length]);

  const updateCategory = (id: string, patch: Partial<CategoryRow>) => {
    setCategories((rows) => rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
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

  const submit = async () => {
    setError('');
    setSuccess('');
    setSubmitting(true);
    const centerLat = parseOptNumber(centerLatStr);
    const centerLng = parseOptNumber(centerLngStr);
    const defaultZoomRaw = parseOptNumber(defaultZoomStr);
    const defaultZoom = defaultZoomRaw != null ? Math.round(defaultZoomRaw) : null;

    try {
      const res = await api.post('/admin/onboarding', {
        municipality: {
          name: name.trim(),
          slug: slug.trim() || null,
          displayName: displayName.trim() || null,
          centerLat,
          centerLng,
          defaultZoom,
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
        categories: enabledCategories.map((c) => ({
          name: c.name.trim(),
          description: c.description.trim() || null,
          iconCode: c.iconCode.trim() || null,
        })),
      });
      const data = res.data.data as {
        municipality: { displayName: string | null; name: string };
        categoriesSkipped?: string[];
      };
      const label = data.municipality.displayName || data.municipality.name;
      const skipped = data.categoriesSkipped?.length
        ? ` (${data.categoriesSkipped.length} kategori zaten vardı, atlandı)`
        : '';
      setSuccess(`${label} kurulumu tamamlandı${skipped}.`);
      setTimeout(() => navigate('/admin/municipalities'), 2000);
    } catch (err: unknown) {
      const m = err as { response?: { data?: { message?: string } } };
      setError(m.response?.data?.message || 'Kurulum başarısız. Tüm adımları kontrol edin.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="kentiva-eyebrow">Süper admin</p>
          <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Sparkles size={22} className="text-primary" />
            Belediye kurulum sihirbazı
          </h2>
          <p className="mt-1 text-sm font-medium text-slate-600 dark:text-slate-400">
            Belediye, ilk yönetici ve varsayılan kategoriler tek işlemde oluşturulur.
          </p>
        </div>
        <Link to="/admin/municipalities" className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">
          <ArrowLeft size={16} /> Belediye listesi
        </Link>
      </div>
      <ol className="flex flex-wrap gap-2">
        {STEPS.map((label, i) => (
          <li key={label} className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide ${i === step ? 'bg-primary text-white' : i < step ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'}`}>
            {i < step ? <Check size={12} className="inline mr-1" /> : null}{i + 1}. {label}
          </li>
        ))}
      </ol>
      <div className="rounded-2xl border border-slate-200/90 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 space-y-4">
        {step === 0 && (
          <div className="space-y-3">
            <h3 className="font-semibold text-slate-800 dark:text-white">Belediye bilgileri</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="sm:col-span-2 block text-xs font-semibold text-slate-500">Resmi ad *<input required className={`mt-1 ${inputClass}`} value={name} onChange={(e) => setName(e.target.value)} /></label>
              <label className="block text-xs font-semibold text-slate-500">Slug<input className={`mt-1 ${inputClass}`} placeholder="kadikoy" value={slug} onChange={(e) => setSlug(e.target.value)} /></label>
              <label className="block text-xs font-semibold text-slate-500">Görünen ad<input className={`mt-1 ${inputClass}`} value={displayName} onChange={(e) => setDisplayName(e.target.value)} /></label>
              <label className="block text-xs font-semibold text-slate-500">Merkez enlem<input type="text" inputMode="decimal" className={`mt-1 ${inputClass}`} value={centerLatStr} onChange={(e) => setCenterLatStr(e.target.value)} /></label>
              <label className="block text-xs font-semibold text-slate-500">Merkez boylam<input type="text" inputMode="decimal" className={`mt-1 ${inputClass}`} value={centerLngStr} onChange={(e) => setCenterLngStr(e.target.value)} /></label>
              <label className="block text-xs font-semibold text-slate-500">Zoom<input type="text" inputMode="numeric" className={`mt-1 ${inputClass}`} value={defaultZoomStr} onChange={(e) => setDefaultZoomStr(e.target.value)} /></label>
              <label className="sm:col-span-2 block text-xs font-semibold text-slate-500">Slogan<input className={`mt-1 ${inputClass}`} value={slogan} onChange={(e) => setSlogan(e.target.value)} /></label>
              <label className="sm:col-span-2 block text-xs font-semibold text-slate-500">İş Akışı Modu
                <select className={`mt-1 ${inputClass}`} value={workflowMode} onChange={(e) => setWorkflowMode(e.target.value as 'SIMPLE' | 'DEPARTMENTAL')}>
                  <option value="SIMPLE">Basit Mod (Admin/Müdür doğrudan saha ekibine atar)</option>
                  <option value="DEPARTMENTAL">Departmanlı Mod (Beyaz Masa gelen talebi departmana yönlendirir)</option>
                </select>
              </label>
            </div>
          </div>
        )}
        {step === 1 && (
          <div className="space-y-3">
            <h3 className="font-semibold text-slate-800 dark:text-white">İlk belediye yöneticisi</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="sm:col-span-2 block text-xs font-semibold text-slate-500">Ad soyad *<input className={`mt-1 ${inputClass}`} value={adminFullName} onChange={(e) => setAdminFullName(e.target.value)} /></label>
              <label className="block text-xs font-semibold text-slate-500">E-posta *<input type="email" className={`mt-1 ${inputClass}`} value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} /></label>
              <label className="block text-xs font-semibold text-slate-500">Telefon<input className={`mt-1 ${inputClass}`} value={adminPhone} onChange={(e) => setAdminPhone(e.target.value)} /></label>
              <label className="sm:col-span-2 block text-xs font-semibold text-slate-500">Şifre *<input type="password" className={`mt-1 ${inputClass}`} value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} /></label>
            </div>
          </div>
        )}
        {step === 2 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-semibold text-slate-800 dark:text-white">Varsayılan kategoriler</h3>
              <button type="button" onClick={addCategory} className="text-sm font-semibold text-primary hover:underline">+ Kategori</button>
            </div>
            <ul className="space-y-3">
              {categories.map((c) => (
                <li key={c.id} className="rounded-xl border border-slate-200 p-3 dark:border-slate-700 space-y-2">
                  <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={c.enabled} onChange={(e) => updateCategory(c.id, { enabled: e.target.checked })} />Dahil et</label>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <input placeholder="Ad" className={inputClass} value={c.name} disabled={!c.enabled} onChange={(e) => updateCategory(c.id, { name: e.target.value })} />
                    <input placeholder="İkon" className={inputClass} value={c.iconCode} disabled={!c.enabled} onChange={(e) => updateCategory(c.id, { iconCode: e.target.value })} />
                    <input placeholder="Açıklama" className={`sm:col-span-2 ${inputClass}`} value={c.description} disabled={!c.enabled} onChange={(e) => updateCategory(c.id, { description: e.target.value })} />
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
        {step === 3 && (
          <div className="space-y-4 text-sm">
            <h3 className="font-semibold text-slate-800 dark:text-white">Özet</h3>
            <p><strong>Belediye:</strong> {name} ({slug || 'otomatik slug'})</p>
            <p><strong>Yönetici:</strong> {adminFullName} — {adminEmail}</p>
            <p><strong>Kategoriler:</strong> {enabledCategories.map((c) => c.name).join(', ')}</p>
          </div>
        )}
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        {success ? <p className="text-sm text-emerald-600">{success}</p> : null}
        <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          {step > 0 ? <button type="button" onClick={() => setStep((s) => s - 1)} className="inline-flex items-center gap-1 rounded-xl border px-4 py-2 text-sm font-semibold"><ArrowLeft size={16} />Geri</button> : null}
          <div className="flex-1" />
          {step < STEPS.length - 1 ? (
            <button type="button" disabled={!stepValid} onClick={() => setStep((s) => s + 1)} className="inline-flex items-center gap-1 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">İleri<ArrowRight size={16} /></button>
          ) : (
            <button type="button" disabled={submitting || !stepValid} onClick={() => void submit()} className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{submitting ? 'Kaydediliyor…' : 'Kurulumu tamamla'}</button>
          )}
        </div>
      </div>
    </div>
  );
}