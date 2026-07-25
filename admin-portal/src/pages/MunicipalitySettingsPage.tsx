import { useCallback, useEffect, useMemo, useState } from 'react';
import api from '../api';
import MunicipalityBrandingForm from '../components/MunicipalityBrandingForm';
import MunicipalityBrandingPreview from '../components/MunicipalityBrandingPreview';
import MunicipalitySettingsSkeleton from '../components/MunicipalitySettingsSkeleton';
import OsmBoundaryFetchPanel from '../components/OsmBoundaryFetchPanel';
import ReportTemplatesPanel from '../components/ReportTemplatesPanel';
import ToastBanner, { type ToastState } from '../components/ToastBanner';
import MunicipalityLocationPanel from '../components/MunicipalityLocationPanel';
import { emptyBrandingForm, type BrandingFormValues } from '../lib/branding';
import MunicipalityReputationSettingsPanel from '../components/MunicipalityReputationSettingsPanel';
import PageHeader from '../components/ui/PageHeader';
import ErrorState from '../components/ui/ErrorState';
import Button from '../components/ui/Button';

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
  smsProcessingTemplate: string | null;
  pushProcessingTitleTemplate: string | null;
  pushProcessingBodyTemplate: string | null;
  smsAssignedTemplate: string | null;
  pushAssignedTitleTemplate: string | null;
  pushAssignedBodyTemplate: string | null;
  workflowMode?: string | null;
  centerLat?: number | null;
  centerLng?: number | null;
  defaultZoom?: number | null;
  allowMunicipalityRejection: boolean | null;
  reputationDeltaReportCreated: number | null;
  reputationDeltaReportResolved: number | null;
  reputationDeltaReportRejected: number | null;
  reputationDeltaInappropriateMedia: number | null;
  autoSuspensionThreshold: number | null;
  autoSuspensionDays: number | null;
  aiMediaModerationEnabled: boolean | null;
};

type SettingsTab = 'branding' | 'location' | 'reputation' | 'templates';

function dtoToForm(municipality: MunicipalityDto): BrandingFormValues {
  return {
    displayName: municipality.displayName || municipality.name || '',
    logoUrl: municipality.logoUrl || '',
    primaryColor: municipality.primaryColor || '',
    secondaryColor: municipality.secondaryColor || '',
    accentColor: municipality.accentColor || '',
    slogan: municipality.slogan || '',
    contactEmail: municipality.contactEmail || '',
    contactPhone: municipality.contactPhone || '',
    websiteUrl: municipality.websiteUrl || '',
    publicStatsEnabled: !!municipality.publicStatsEnabled,
    smsResolvedTemplate: municipality.smsResolvedTemplate || '',
    pushRejectedTitleTemplate: municipality.pushRejectedTitleTemplate || '',
    pushRejectedBodyTemplate: municipality.pushRejectedBodyTemplate || '',
    smsSenderHeader: municipality.smsSenderHeader || '',
    smsProcessingTemplate: municipality.smsProcessingTemplate || '',
    pushProcessingTitleTemplate: municipality.pushProcessingTitleTemplate || '',
    pushProcessingBodyTemplate: municipality.pushProcessingBodyTemplate || '',
    smsAssignedTemplate: municipality.smsAssignedTemplate || '',
    pushAssignedTitleTemplate: municipality.pushAssignedTitleTemplate || '',
    pushAssignedBodyTemplate: municipality.pushAssignedBodyTemplate || '',
    workflowMode: municipality.workflowMode || 'SIMPLE',
  };
}

const TABS: Array<{ id: SettingsTab; name: string }> = [
  { id: 'branding', name: 'Markalama & Görünüm' },
  { id: 'location', name: 'Konum & Harita' },
  { id: 'reputation', name: 'İtibar & Güvenlik' },
  { id: 'templates', name: "Şablonlar & Widget'lar" },
];

export default function MunicipalitySettingsPage() {
  const [loading, setLoading] = useState(true);
  const [municipality, setMunicipality] = useState<MunicipalityDto | null>(null);
  const [previewForm, setPreviewForm] = useState<BrandingFormValues>(emptyBrandingForm());
  const [toast, setToast] = useState<ToastState>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<SettingsTab>('branding');

  const handleFormChange = useCallback((form: BrandingFormValues) => {
    setPreviewForm(form);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timeoutId = window.setTimeout(() => setToast(null), 5000);
    return () => window.clearTimeout(timeoutId);
  }, [toast]);

  const loadMunicipality = useCallback(() => {
    setLoading(true);
    setLoadError(null);
    let cancelled = false;

    api
      .get('/municipalities/me')
      .then((res) => {
        const nextMunicipality = res.data.data as MunicipalityDto;
        if (!cancelled && nextMunicipality) {
          setMunicipality(nextMunicipality);
          setPreviewForm(dtoToForm(nextMunicipality));
        }
      })
      .catch(() => {
        if (!cancelled) setLoadError('Belediye bilgileri yüklenemedi.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => loadMunicipality(), [loadMunicipality]);

  const initialForm = useMemo(
    () => (municipality ? dtoToForm(municipality) : emptyBrandingForm()),
    [municipality],
  );

  const meta = useMemo(
    () =>
      municipality
        ? { legalName: municipality.name, slug: municipality.slug, municipalityId: municipality.id }
        : { legalName: '', slug: '', municipalityId: '' },
    [municipality],
  );

  const reloadMunicipality = useCallback(async () => {
    const res = await api.get('/municipalities/me');
    const nextMunicipality = res.data.data as MunicipalityDto;
    setMunicipality(nextMunicipality);
    setPreviewForm(dtoToForm(nextMunicipality));
  }, []);

  if (loading) {
    return <MunicipalitySettingsSkeleton />;
  }

  if (loadError || !municipality) {
    return (
      <div className="p-6">
        <ErrorState
          message={loadError || 'Belediye bilgisi yüklenemedi. Oturumunuzun bir belediyeye bağlı olduğundan emin olun.'}
          action={
            <Button variant="secondary" onClick={loadMunicipality}>
              Tekrar dene
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="p-6">
      <ToastBanner toast={toast} onDismiss={() => setToast(null)} />

      <div className="mb-6">
        <PageHeader
          eyebrow="SaaS Marka"
          title="Belediye Ayarları"
          subtitle="Mobil uygulama, kamu sitesi ve belediye portalı özelliklerini özelleştirin."
        />
      </div>

      <div className="mb-6 grid gap-3 md:grid-cols-3">
        <InfoCard title="Tenant slug" value={municipality.slug} helper="Panel ve kamu URL omurgası" />
        <InfoCard
          title="İş akışı"
          value={municipality.workflowMode === 'DEPARTMENTAL' ? 'Departmanlı' : 'Basit'}
          helper={
            municipality.workflowMode === 'DEPARTMENTAL'
              ? 'Beyaz Masa > Departman > Saha'
              : 'Yönetici veya müdür doğrudan atar'
          }
        />
        <InfoCard
          title="Harita merkezi"
          value={`${Number(municipality.centerLat ?? 0).toFixed(4)}, ${Number(municipality.centerLng ?? 0).toFixed(4)}`}
          helper={`Zoom ${municipality.defaultZoom ?? 12}`}
        />
      </div>

      <div className="mb-6 border-b border-slate-200 dark:border-slate-800">
        <nav className="flex flex-wrap -mb-px gap-6" aria-label="Tabs">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`border-b-2 px-1 py-4 text-sm font-semibold transition-all ${
                activeTab === tab.id
                  ? 'border-primary text-primary dark:border-primary dark:text-primary font-extrabold'
                  : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-350'
              }`}
            >
              {tab.name}
            </button>
          ))}
        </nav>
      </div>

      <div className="min-h-[400px]">
        {activeTab === 'branding' && (
          <div className="grid items-start gap-8 xl:grid-cols-[minmax(0,1fr)_300px]">
            <div className="min-w-0 space-y-6">
              <MunicipalityBrandingForm
                mode="tenant"
                meta={meta}
                initial={initialForm}
                onToast={(nextToast) => {
                  setToast(nextToast);
                  if (nextToast?.type === 'success') void reloadMunicipality();
                }}
                onFormChange={handleFormChange}
              />
            </div>
            <aside className="xl:sticky xl:top-6 xl:self-start">
              <MunicipalityBrandingPreview form={previewForm} legalName={meta.legalName} slug={meta.slug} />
            </aside>
          </div>
        )}

        {activeTab === 'location' && (
          <div className="max-w-4xl space-y-6">
            <MunicipalityLocationPanel
              municipalityName={municipality.displayName || municipality.name}
              centerLat={municipality.centerLat}
              centerLng={municipality.centerLng}
              defaultZoom={municipality.defaultZoom}
              onSaved={(nextLocation) => {
                setMunicipality((current) =>
                  current
                    ? {
                        ...current,
                        centerLat: nextLocation.centerLat,
                        centerLng: nextLocation.centerLng,
                        defaultZoom: nextLocation.defaultZoom,
                      }
                    : current,
                );
              }}
            />
            <OsmBoundaryFetchPanel />
          </div>
        )}

        {activeTab === 'reputation' && (
          <div className="max-w-4xl">
            <MunicipalityReputationSettingsPanel municipality={municipality} onSaved={reloadMunicipality} />
          </div>
        )}

        {activeTab === 'templates' && (
          <div className="max-w-4xl space-y-6">
            <ReportTemplatesPanel />
          </div>
        )}
      </div>
    </div>
  );
}

function InfoCard({ title, value, helper }: { title: string; value: string; helper: string }) {
  return (
    <div className="rounded-2xl border border-slate-200/90 bg-slate-50/80 p-4 dark:border-slate-700 dark:bg-slate-800/50">
      <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">{title}</p>
      <p className="mt-2 text-lg font-bold text-slate-900 dark:text-white">{value}</p>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{helper}</p>
    </div>
  );
}
