import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import api from '../api';
import MunicipalityBrandingForm from '../components/MunicipalityBrandingForm';
import MunicipalityBrandingPreview from '../components/MunicipalityBrandingPreview';
import MunicipalitySettingsSkeleton from '../components/MunicipalitySettingsSkeleton';
import ToastBanner, { type ToastState } from '../components/ToastBanner';
import { emptyBrandingForm, type BrandingFormValues } from '../lib/branding';

type MunicipalityDto = {
  id: string;
  name: string;
  slug: string;
  displayName: string | null;
  logoUrl: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  accentColor: string | null;
  slogan: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  websiteUrl: string | null;
  publicStatsEnabled: boolean | null;
  smsResolvedTemplate: string | null;
  pushRejectedTitleTemplate: string | null;
  pushRejectedBodyTemplate: string | null;
  smsSenderHeader: string | null;
};

function dtoToForm(m: MunicipalityDto): BrandingFormValues {
  return {
    ...emptyBrandingForm(),
    displayName: m.displayName || m.name || '',
    logoUrl: m.logoUrl || '',
    primaryColor: m.primaryColor || '',
    secondaryColor: m.secondaryColor || '',
    accentColor: m.accentColor || '',
    slogan: m.slogan || '',
    contactEmail: m.contactEmail || '',
    contactPhone: m.contactPhone || '',
    websiteUrl: m.websiteUrl || '',
    publicStatsEnabled: !!m.publicStatsEnabled,
    smsResolvedTemplate: m.smsResolvedTemplate || '',
    pushRejectedTitleTemplate: m.pushRejectedTitleTemplate || '',
    pushRejectedBodyTemplate: m.pushRejectedBodyTemplate || '',
    smsSenderHeader: m.smsSenderHeader || '',
  };
}

export default function SuperAdminMunicipalityBrandingPage() {
  const { municipalityId = '' } = useParams<{ municipalityId: string }>();
  const [loading, setLoading] = useState(true);
  const [municipality, setMunicipality] = useState<MunicipalityDto | null>(null);
  const [previewForm, setPreviewForm] = useState<BrandingFormValues>(emptyBrandingForm());
  const [previewSlug, setPreviewSlug] = useState('');
  const [toast, setToast] = useState<ToastState>(null);

  const handleFormChange = useCallback((f: BrandingFormValues) => {
    setPreviewForm(f);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 5000);
    return () => window.clearTimeout(t);
  }, [toast]);

  const load = useCallback(async () => {
    if (!municipalityId) return;
    setLoading(true);
    try {
      const res = await api.get(`/admin/municipalities/${municipalityId}`);
      const m = res.data.data as MunicipalityDto;
      setMunicipality(m);
      setPreviewForm(dtoToForm(m));
      setPreviewSlug(m.slug);
    } catch {
      setToast({ type: 'error', message: 'Belediye yüklenemedi.' });
    } finally {
      setLoading(false);
    }
  }, [municipalityId]);

  useEffect(() => {
    void load();
  }, [load]);

  const initialForm = useMemo(
    () => (municipality ? dtoToForm(municipality) : emptyBrandingForm()),
    [municipality],
  );

  const meta = useMemo(
    () =>
      municipality
        ? { legalName: municipality.name, slug: municipality.slug, municipalityId: municipality.id }
        : { legalName: '', slug: '', municipalityId: municipalityId },
    [municipality, municipalityId],
  );

  if (loading) {
    return <MunicipalitySettingsSkeleton />;
  }

  if (!municipality) {
    return (
      <div className="space-y-4 p-6">
        <Link
          to="/admin/municipalities"
          className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
        >
          <ArrowLeft size={14} /> Belediyelere dön
        </Link>
        <p className="text-sm text-red-600 dark:text-red-400">Belediye bulunamadı.</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <ToastBanner toast={toast} onDismiss={() => setToast(null)} />

      <Link
        to="/admin/municipalities"
        className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
      >
        <ArrowLeft size={14} /> Belediyelere dön
      </Link>

      <div className="mb-6">
        <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
          Süper admin · SaaS marka
        </p>
        <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          {municipality.displayName || municipality.name} — özelleştirme
        </h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Bu belediye için marka, renk ve iletişim ayarlarını düzenleyin.
        </p>
      </div>

      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_300px]">
        <MunicipalityBrandingForm
          mode="superAdmin"
          meta={meta}
          initial={initialForm}
          slugEditable
          onFormChange={handleFormChange}
          onSlugChange={setPreviewSlug}
          onToast={(t) => {
            setToast(t);
            if (t?.type === 'success') void load();
          }}
        />
        <aside className="xl:sticky xl:top-6 xl:self-start">
          <MunicipalityBrandingPreview form={previewForm} legalName={meta.legalName} slug={previewSlug || meta.slug} />
        </aside>
      </div>
    </div>
  );
}
