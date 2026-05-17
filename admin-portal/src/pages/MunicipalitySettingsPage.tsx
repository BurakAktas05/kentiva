import { useEffect, useState } from 'react';
import api from '../api';

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

import ReportTemplatesPanel from '../components/ReportTemplatesPanel';

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

export default function MunicipalitySettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
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
  const [form, setForm] = useState({
    displayName: '',
    logoUrl: '',
    primaryColor: '',
    secondaryColor: '',
    accentColor: '',
    slogan: '',
    contactEmail: '',
    contactPhone: '',
    websiteUrl: '',
    publicStatsEnabled: false,
    smsResolvedTemplate: '',
    pushRejectedTitleTemplate: '',
    pushRejectedBodyTemplate: '',
    smsSenderHeader: '',
  });

  useEffect(() => {
    let cancelled = false;
    api
      .get('/municipalities/me')
      .then((res) => {
        const m = res.data.data as MunicipalityDto;
        if (cancelled || !m) return;
        setForm({
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
        });
      })
      .catch(() => setMsg('Belediye bilgileri yüklenemedi.'))
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

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMsg('');
    try {
      await api.patch('/municipalities/me/branding', {
        displayName: form.displayName || null,
        logoUrl: form.logoUrl || null,
        primaryColor: form.primaryColor || null,
        secondaryColor: form.secondaryColor || null,
        accentColor: form.accentColor || null,
        slogan: form.slogan || null,
        contactEmail: form.contactEmail || null,
        contactPhone: form.contactPhone || null,
        websiteUrl: form.websiteUrl || null,
        publicStatsEnabled: form.publicStatsEnabled,
        active: null,
        onboarded: null,
        slug: null,
        smsResolvedTemplate: form.smsResolvedTemplate || null,
        pushRejectedTitleTemplate: form.pushRejectedTitleTemplate || null,
        pushRejectedBodyTemplate: form.pushRejectedBodyTemplate || null,
        smsSenderHeader: form.smsSenderHeader || null,
      });
      setMsg('Kaydedildi.');
    } catch (err: unknown) {
      const m = err as { response?: { data?: { message?: string } } };
      setMsg(m.response?.data?.message || 'Kayıt başarısız.');
    } finally {
      setSaving(false);
    }
  };

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
    return <div className="p-6 text-slate-600 dark:text-slate-400">Yükleniyor…</div>;
  }

  return (
    <div className="p-6 max-w-2xl space-y-6">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">Marka</p>
        <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">Belediye ayarları</h2>
        <p className="mt-1 text-sm font-medium text-slate-600 dark:text-slate-400">Mobil uygulamada görünen kurum bilgileri ve renkler.</p>
      </div>
      <form onSubmit={save} className="space-y-4">
        <Field label="Görünen ad" value={form.displayName} onChange={(v) => setForm((f) => ({ ...f, displayName: v }))} />
        <Field label="Logo URL" value={form.logoUrl} onChange={(v) => setForm((f) => ({ ...f, logoUrl: v }))} />
        <Field label="Birincil renk (hex)" value={form.primaryColor} onChange={(v) => setForm((f) => ({ ...f, primaryColor: v }))} />
        <Field label="İkincil renk (hex)" value={form.secondaryColor} onChange={(v) => setForm((f) => ({ ...f, secondaryColor: v }))} />
        <Field label="Vurgu rengi (hex)" value={form.accentColor} onChange={(v) => setForm((f) => ({ ...f, accentColor: v }))} />
        <Field label="Slogan" value={form.slogan} onChange={(v) => setForm((f) => ({ ...f, slogan: v }))} />

        <ReportTemplatesPanel />

        <div className="rounded-2xl border border-slate-200/90 bg-slate-50/80 p-4 dark:border-slate-700 dark:bg-slate-800/40">
          <p className="text-sm font-bold text-slate-800 dark:text-slate-100">Vatandaş bildirim metinleri</p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Yer tutucular: {'{belediye}'}, {'{baslik}'}, {'{not}'}, {'{slogan}'}. Çözülen ihbar → SMS; reddedilen → push.
          </p>
          <div className="mt-4 space-y-3">
            <Field
              label="SMS gönderici adı (NetGSM, max 11 karakter)"
              value={form.smsSenderHeader}
              onChange={(v) => setForm((f) => ({ ...f, smsSenderHeader: v }))}
            />
            <TextArea
              label="Çözülen ihbar SMS şablonu"
              value={form.smsResolvedTemplate}
              onChange={(v) => setForm((f) => ({ ...f, smsResolvedTemplate: v }))}
              placeholder="{belediye}: Sayın vatandaşımız, &quot;{baslik}&quot; bildiriminiz çözüme kavuşturulmuştur.{not}{slogan}"
            />
            <Field
              label="Red push başlık şablonu"
              value={form.pushRejectedTitleTemplate}
              onChange={(v) => setForm((f) => ({ ...f, pushRejectedTitleTemplate: v }))}
            />
            <TextArea
              label="Red push mesaj şablonu"
              value={form.pushRejectedBodyTemplate}
              onChange={(v) => setForm((f) => ({ ...f, pushRejectedBodyTemplate: v }))}
            />
          </div>
        </div>

        <Field label="Kurumsal e-posta" value={form.contactEmail} onChange={(v) => setForm((f) => ({ ...f, contactEmail: v }))} />
        <Field label="Telefon" value={form.contactPhone} onChange={(v) => setForm((f) => ({ ...f, contactPhone: v }))} />
        <Field label="Web sitesi" value={form.websiteUrl} onChange={(v) => setForm((f) => ({ ...f, websiteUrl: v }))} />
        <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
          <input
            type="checkbox"
            checked={form.publicStatsEnabled}
            onChange={(e) => setForm((f) => ({ ...f, publicStatsEnabled: e.target.checked }))}
          />
          Kamu istatistik sitesinde anonim özetlere izin ver
        </label>
        {msg ? <p className="text-sm text-slate-600 dark:text-slate-400">{msg}</p> : null}
        <button
          type="submit"
          disabled={saving}
          className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-hover disabled:opacity-60"
        >
          {saving ? 'Kaydediliyor…' : 'Kaydet'}
        </button>
      </form>

      <section className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900/50">
        <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">Entegrasyon</p>
        <h3 className="mt-1 text-lg font-bold text-slate-900 dark:text-white">ERP / CRM API anahtarları</h3>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Harici sistemler <code className="text-xs">/api/v1/integration/reports</code> uç noktalarına erişir.
          Başlık: <code className="text-xs">X-Api-Key</code> veya <code className="text-xs">Authorization: ApiKey …</code>
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

        <form onSubmit={saveWebhook} className="mt-6 space-y-3 border-t border-slate-200 pt-4 dark:border-slate-700">
          <p className="text-sm font-bold text-slate-800 dark:text-slate-100">Giden webhook (rapor durumu)</p>
          <p className="text-xs text-slate-500">
            Rapor durumu değişince POST: event <code>report.status_changed</code>, isteğe bağlı HMAC başlığı{' '}
            <code>X-BelediyeApp-Signature</code>.
          </p>
          <Field
            label="Webhook URL (https)"
            value={webhook.webhookUrl || ''}
            onChange={(v) => setWebhook((w) => ({ ...w, webhookUrl: v }))}
          />
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

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{label}</span>
      <input
        className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary dark:border-slate-700 dark:bg-slate-900"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

function TextArea({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{label}</span>
      <textarea
        rows={3}
        placeholder={placeholder}
        className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary dark:border-slate-700 dark:bg-slate-900"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}
