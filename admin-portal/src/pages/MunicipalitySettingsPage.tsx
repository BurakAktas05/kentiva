import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { MessageSquare } from 'lucide-react';
import api from '../api';
import MunicipalityBrandingForm from '../components/MunicipalityBrandingForm';
import MunicipalityBrandingPreview from '../components/MunicipalityBrandingPreview';
import MunicipalitySettingsSkeleton from '../components/MunicipalitySettingsSkeleton';
import OsmBoundaryFetchPanel from '../components/OsmBoundaryFetchPanel';
import MunicipalityWidgetsPanel from '../components/MunicipalityWidgetsPanel';
import ReportTemplatesPanel from '../components/ReportTemplatesPanel';
import ToastBanner, { type ToastState } from '../components/ToastBanner';
import MunicipalityLocationPanel from '../components/MunicipalityLocationPanel';
import { emptyBrandingForm, type BrandingFormValues } from '../lib/branding';

type ApiKeyListItem = {
  id: string;
  name: string;
  keyPrefix: string;
  scopes: string[];
  active: boolean;
  createdAt: string;
  lastUsedAt: string | null;
};

type WebhookSettings = {
  webhookUrl: string | null;
  webhookEnabled: boolean;
  webhookSecretConfigured: boolean;
};

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
};

function dtoToForm(m: MunicipalityDto): BrandingFormValues {
  return {
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
    smsProcessingTemplate: m.smsProcessingTemplate || '',
    pushProcessingTitleTemplate: m.pushProcessingTitleTemplate || '',
    pushProcessingBodyTemplate: m.pushProcessingBodyTemplate || '',
    smsAssignedTemplate: m.smsAssignedTemplate || '',
    pushAssignedTitleTemplate: m.pushAssignedTitleTemplate || '',
    pushAssignedBodyTemplate: m.pushAssignedBodyTemplate || '',
    workflowMode: m.workflowMode || 'SIMPLE',
  };
}

export default function MunicipalitySettingsPage() {
  const [loading, setLoading] = useState(true);
  const [municipality, setMunicipality] = useState<MunicipalityDto | null>(null);
  const [previewForm, setPreviewForm] = useState<BrandingFormValues>(emptyBrandingForm());
  const [toast, setToast] = useState<ToastState>(null);
  const [apiKeys, setApiKeys] = useState<ApiKeyListItem[]>([]);
  const [newKeyName, setNewKeyName] = useState('');
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [keysLoading, setKeysLoading] = useState(true);
  const [webhook, setWebhook] = useState<WebhookSettings>({
    webhookUrl: '',
    webhookEnabled: false,
    webhookSecretConfigured: false,
  });
  const [webhookSecret, setWebhookSecret] = useState('');
  const [integrationMsg, setIntegrationMsg] = useState('');
  const [helpOpen, setHelpOpen] = useState(false);

  const handleFormChange = useCallback((f: BrandingFormValues) => {
    setPreviewForm(f);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 5000);
    return () => window.clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    let cancelled = false;
    api
      .get('/municipalities/me')
      .then((res) => {
        const m = res.data.data as MunicipalityDto;
        if (!cancelled && m) {
          setMunicipality(m);
          setPreviewForm(dtoToForm(m));
        }
      })
      .catch(() => setToast({ type: 'error', message: 'Belediye bilgileri yüklenemedi.' }))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    api
      .get('/municipalities/me/api-keys')
      .then((res) => {
        if (!cancelled) setApiKeys(res.data.data ?? []);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setKeysLoading(false);
      });

    api
      .get('/municipalities/me/integration/webhook')
      .then((res) => {
        const w = res.data.data as WebhookSettings;
        if (!cancelled && w) {
          setWebhook({
            webhookUrl: w.webhookUrl || '',
            webhookEnabled: w.webhookEnabled,
            webhookSecretConfigured: w.webhookSecretConfigured,
          });
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, []);

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
    const m = res.data.data as MunicipalityDto;
    setMunicipality(m);
    setPreviewForm(dtoToForm(m));
  }, []);

  const createApiKey = async () => {
    if (!newKeyName.trim()) return;
    setIntegrationMsg('');
    setCreatedKey(null);
    try {
      const res = await api.post('/municipalities/me/api-keys', {
        name: newKeyName.trim(),
        scopes: ['reports:read'],
      });
      const data = res.data.data as { apiKey: string };
      setCreatedKey(data.apiKey);
      setNewKeyName('');
      const list = await api.get('/municipalities/me/api-keys');
      setApiKeys(list.data.data ?? []);
      setIntegrationMsg('API anahtarı oluşturuldu. Anahtarı kopyalayın; tekrar gösterilmez.');
    } catch (err: unknown) {
      const m = err as { response?: { data?: { message?: string } } };
      setIntegrationMsg(m.response?.data?.message || 'Anahtar oluşturulamadı.');
    }
  };

  const revokeApiKey = async (id: string) => {
    if (!window.confirm('Bu API anahtarını iptal etmek istediğinize emin misiniz?')) return;
    setIntegrationMsg('');
    try {
      await api.delete(`/municipalities/me/api-keys/${id}`);
      setApiKeys((prev) => prev.map((k) => (k.id === id ? { ...k, active: false } : k)));
      setIntegrationMsg('Anahtar iptal edildi.');
    } catch {
      setIntegrationMsg('İptal başarısız.');
    }
  };

  const saveWebhook = async (e: React.FormEvent) => {
    e.preventDefault();
    setIntegrationMsg('');
    try {
      const res = await api.patch('/municipalities/me/integration/webhook', {
        webhookUrl: webhook.webhookUrl || null,
        webhookEnabled: webhook.webhookEnabled,
        webhookSecret: webhookSecret || null,
      });
      const w = res.data.data as WebhookSettings;
      setWebhook({
        webhookUrl: w.webhookUrl || '',
        webhookEnabled: w.webhookEnabled,
        webhookSecretConfigured: w.webhookSecretConfigured,
      });
      setWebhookSecret('');
      setIntegrationMsg('Webhook ayarları kaydedildi.');
    } catch (err: unknown) {
      const m = err as { response?: { data?: { message?: string } } };
      setIntegrationMsg(m.response?.data?.message || 'Webhook kaydedilemedi.');
    }
  };

  if (loading) {
    return <MunicipalitySettingsSkeleton />;
  }

  if (!municipality) {
    return (
      <div className="p-6 text-sm text-red-600 dark:text-red-400">
        Belediye bilgisi yüklenemedi. Oturumunuzun bir belediyeye bağlı olduğundan emin olun.
      </div>
    );
  }

  return (
    <div className="p-6">
      <ToastBanner toast={toast} onDismiss={() => setToast(null)} />

      <div className="mb-6">
        <p className="kentiva-eyebrow">SaaS marka</p>
        <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          Belediye özelleştirme
        </h2>
        <p className="mt-1 max-w-2xl text-sm font-medium text-slate-600 dark:text-slate-400">
          Mobil uygulama, kamu sitesi ve bildirimlerde kurumunuzun kendi markası görünsün.
        </p>
        <Link
          to="/municipality-settings/notifications"
          className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-violet-700 hover:underline dark:text-violet-300"
        >
          <MessageSquare className="h-4 w-4" />
          SMS ve push şablonları (AI)
        </Link>
      </div>

      <div className="mb-6 grid gap-3 md:grid-cols-3">
        <InfoCard title="Tenant slug" value={municipality.slug} helper="Panel ve kamu URL omurgasi" />
        <InfoCard
          title="Workflow"
          value={municipality.workflowMode === 'DEPARTMENTAL' ? 'Departmanli' : 'Basit'}
          helper={
            municipality.workflowMode === 'DEPARTMENTAL'
              ? 'Beyaz Masa > Departman > Saha'
              : 'Yonetici veya mudur dogrudan atar'
          }
        />
        <InfoCard
          title="Harita merkezi"
          value={`${Number(municipality.centerLat ?? 0).toFixed(4)}, ${Number(municipality.centerLng ?? 0).toFixed(4)}`}
          helper={`Zoom ${municipality.defaultZoom ?? 12}`}
        />
      </div>

      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0 space-y-6">
          <MunicipalityLocationPanel
            municipalityName={municipality.displayName || municipality.name}
            centerLat={municipality.centerLat}
            centerLng={municipality.centerLng}
            defaultZoom={municipality.defaultZoom}
            onSaved={(next) => {
              setMunicipality((current) =>
                current
                  ? {
                      ...current,
                      centerLat: next.centerLat,
                      centerLng: next.centerLng,
                      defaultZoom: next.defaultZoom,
                    }
                  : current,
              );
            }}
          />
          <MunicipalityBrandingForm
            mode="tenant"
            meta={meta}
            initial={initialForm}
            onToast={(t) => {
              setToast(t);
              if (t?.type === 'success') void reloadMunicipality();
            }}
            onFormChange={handleFormChange}
          />
          <ReportTemplatesPanel />
          <MunicipalityWidgetsPanel />
          <OsmBoundaryFetchPanel />
        </div>

        <aside className="xl:sticky xl:top-6 xl:self-start">
          <MunicipalityBrandingPreview form={previewForm} legalName={meta.legalName} slug={meta.slug} />
        </aside>
      </div>

      <section className="mt-8 rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900/50">
        <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
          Entegrasyon
        </p>
        <h3 className="mt-1 text-lg font-bold text-slate-900 dark:text-white">ERP / CRM API anahtarları</h3>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Harici sistemler <code className="text-xs">/api/v1/integration/reports</code> uç noktalarına erişir.
        </p>

        {keysLoading ? (
          <p className="mt-4 text-sm text-slate-500">Anahtarlar yükleniyor…</p>
        ) : (
          <ul className="mt-4 space-y-2">
            {apiKeys.length === 0 ? (
              <li className="text-sm text-slate-500">Henüz API anahtarı yok.</li>
            ) : (
              apiKeys.map((k) => (
                <li
                  key={k.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-slate-700"
                >
                  <div>
                    <span className="font-medium text-slate-800 dark:text-slate-100">{k.name}</span>
                    <span className="ml-2 font-mono text-xs text-slate-500">{k.keyPrefix}</span>
                    {!k.active ? (
                      <span className="ml-2 rounded bg-slate-200 px-1.5 py-0.5 text-xs dark:bg-slate-700">iptal</span>
                    ) : null}
                  </div>
                  {k.active ? (
                    <button
                      type="button"
                      onClick={() => revokeApiKey(k.id)}
                      className="text-xs font-semibold text-red-600 hover:underline"
                    >
                      İptal et
                    </button>
                  ) : null}
                </li>
              ))
            )}
          </ul>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          <input
            className="min-w-[12rem] flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
            placeholder="Anahtar adı (ör. SAP entegrasyonu)"
            value={newKeyName}
            onChange={(e) => setNewKeyName(e.target.value)}
          />
          <button
            type="button"
            onClick={createApiKey}
            className="rounded-xl bg-slate-800 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 dark:bg-slate-600"
          >
            Anahtar oluştur
          </button>
        </div>

        {createdKey ? (
          <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-950/40">
            <p className="text-xs font-semibold text-amber-900 dark:text-amber-200">Yeni anahtar (bir kez gösterilir)</p>
            <code className="mt-1 block break-all text-xs text-amber-950 dark:text-amber-100">{createdKey}</code>
          </div>
        ) : null}

        <div className="mt-6 border-t border-slate-200 pt-4 dark:border-slate-700">
          <button
            type="button"
            onClick={() => setHelpOpen((o) => !o)}
            className="text-sm font-bold text-primary hover:underline"
          >
            {helpOpen ? 'Entegrasyon yardımını gizle' : 'Entegrasyon yardımını göster'}
          </button>
          {helpOpen && (
            <ul className="mt-3 list-inside list-disc space-y-1 text-xs text-slate-600 dark:text-slate-400">
              <li>
                API: <code>GET /api/v1/integration/reports</code> — başlık <code>X-Api-Key</code>
              </li>
              <li>
                Webhook olayları: <code>report.created</code>, <code>report.assigned</code>,{' '}
                <code>report.status_changed</code>
              </li>
              <li>İmza: <code>X-BelediyeApp-Signature: sha256=…</code> (HMAC-SHA256 gövde)</li>
            </ul>
          )}
        </div>

        <form onSubmit={saveWebhook} className="mt-6 space-y-3 border-t border-slate-200 pt-4 dark:border-slate-700">
          <p className="text-sm font-bold text-slate-800 dark:text-slate-100">Giden webhook</p>
          <p className="text-xs text-slate-500">
            Olaylar: <code>report.created</code>, <code>report.assigned</code>, <code>report.status_changed</code>
          </p>
          <label className="block">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Webhook URL (https)</span>
            <input
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
              value={webhook.webhookUrl || ''}
              onChange={(e) => setWebhook((w) => ({ ...w, webhookUrl: e.target.value }))}
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Webhook gizli anahtar (HMAC)</span>
            <input
              type="password"
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
              placeholder={webhook.webhookSecretConfigured ? 'Değiştirmek için yazın' : ''}
              value={webhookSecret}
              onChange={(e) => setWebhookSecret(e.target.value)}
            />
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
            <input
              type="checkbox"
              checked={webhook.webhookEnabled}
              onChange={(e) => setWebhook((w) => ({ ...w, webhookEnabled: e.target.checked }))}
            />
            Webhook aktif
          </label>
          <button
            type="submit"
            className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-100"
          >
            Webhook kaydet
          </button>
        </form>

        {integrationMsg ? <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">{integrationMsg}</p> : null}
      </section>
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
