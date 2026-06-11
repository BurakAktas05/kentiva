import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, MessageSquare, Bell } from 'lucide-react';
import api from '../api';
import AiTemplateField from '../components/AiTemplateField';
import MunicipalitySettingsSkeleton from '../components/MunicipalitySettingsSkeleton';
import ToastBanner, { type ToastState } from '../components/ToastBanner';
import { emptyBrandingForm, type BrandingFormValues } from '../lib/branding';
import {
  notificationFieldsFromBranding,
  patchPayloadFromNotifications,
  type NotificationFormValues,
} from '../lib/notifications';

type MunicipalityDto = {
  id: string;
  name: string;
  displayName: string | null;
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
};

function dtoToNotifications(m: MunicipalityDto): NotificationFormValues {
  const full = {
    ...emptyBrandingForm(),
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
  } satisfies BrandingFormValues;
  return notificationFieldsFromBranding(full);
}

type Tab = 'sms' | 'push';

export default function MunicipalityNotificationTemplatesPage() {
  const { municipalityId } = useParams<{ municipalityId?: string }>();
  const superAdmin = Boolean(municipalityId);
  const [tab, setTab] = useState<Tab>('sms');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [municipality, setMunicipality] = useState<MunicipalityDto | null>(null);
  const [form, setForm] = useState<NotificationFormValues>(notificationFieldsFromBranding(emptyBrandingForm()));
  const [toast, setToast] = useState<ToastState>(null);

  const aiEndpoint = superAdmin
    ? `/admin/municipalities/${municipalityId}/branding/ai-notification-template`
    : '/municipalities/me/branding/ai-notification-template';

  const patchUrl = superAdmin
    ? `/admin/municipalities/${municipalityId}`
    : '/municipalities/me/branding';

  const backTo = superAdmin ? `/admin/municipalities/${municipalityId}/branding` : '/municipality-settings';

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = superAdmin
        ? await api.get(`/admin/municipalities/${municipalityId}`)
        : await api.get('/municipalities/me');
      const m = res.data.data as MunicipalityDto;
      setMunicipality(m);
      setForm(dtoToNotifications(m));
    } catch {
      setToast({ type: 'error', message: 'Şablonlar yüklenemedi.' });
    } finally {
      setLoading(false);
    }
  }, [municipalityId, superAdmin]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 5000);
    return () => window.clearTimeout(t);
  }, [toast]);

  const title = useMemo(
    () => municipality?.displayName || municipality?.name || 'Belediye',
    [municipality],
  );

  const publish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.smsSenderHeader.length > 11) {
      setToast({ type: 'error', message: 'SMS gönderici adı en fazla 11 karakter olabilir.' });
      return;
    }
    setSaving(true);
    try {
      await api.patch(patchUrl, patchPayloadFromNotifications(form));
      setToast({ type: 'success', message: 'Bildirim şablonları kaydedildi.' });
      await load();
    } catch (err: unknown) {
      const m = err as { response?: { data?: { message?: string } } };
      setToast({ type: 'error', message: m.response?.data?.message || 'Kayıt başarısız.' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <MunicipalitySettingsSkeleton />;

  return (
    <motion.div className="p-6">
      <ToastBanner toast={toast} onDismiss={() => setToast(null)} />

      <Link
        to={backTo}
        className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-slate-600 hover:text-primary dark:text-slate-400"
      >
        <ArrowLeft className="h-4 w-4" />
        Özelleştirmeye dön
      </Link>

      <div className="mb-6">
        <p className="kentiva-eyebrow">Bildirimler</p>
        <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          SMS ve push şablonları
        </h2>
        <p className="mt-1 max-w-2xl text-sm text-slate-600 dark:text-slate-400">
          {title} — vatandaşlara giden SMS ve mobil bildirim metinleri. Önce AI ile oluşturun, sonra düzenleyin.
        </p>
        <p className="mt-2 text-xs text-slate-500">
          Yer tutucular: {'{belediye}'}, {'{baslik}'}, {'{not}'}, {'{slogan}'}
        </p>
      </div>

      {/* İç İçe Tuşlar (Sleek Tabs) */}
      <div className="mb-6 border-b border-slate-200 dark:border-slate-800">
        <nav className="flex flex-wrap -mb-px gap-6" aria-label="Tabs">
          {[
            { id: 'sms', name: 'SMS Şablonları', icon: MessageSquare },
            { id: 'push', name: 'Push Şablonları', icon: Bell }
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id as any)}
              className={`flex items-center gap-2 border-b-2 py-4 px-1 text-sm font-semibold transition-all ${
                tab === t.id
                  ? 'border-violet-600 text-violet-600 dark:border-violet-400 dark:text-violet-400 font-extrabold'
                  : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-350'
              }`}
            >
              <t.icon className="h-4 w-4" />
              {t.name}
            </button>
          ))}
        </nav>
      </div>

      <form onSubmit={publish} className="max-w-2xl space-y-4">
        {tab === 'sms' ? (
          <>
            <div className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900/50">
              <label className="text-sm font-bold text-slate-800 dark:text-slate-100">SMS gönderici adı (max 11)</label>
              <input
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary dark:border-slate-700 dark:bg-slate-900"
                value={form.smsSenderHeader}
                maxLength={11}
                onChange={(e) => setForm((f) => ({ ...f, smsSenderHeader: e.target.value }))}
              />
            </div>
            <AiTemplateField
              label="Çözülen ihbar SMS"
              kind="SMS_RESOLVED"
              value={form.smsResolvedTemplate}
              onChange={(v) => setForm((f) => ({ ...f, smsResolvedTemplate: v }))}
              multiline
              aiEndpoint={aiEndpoint}
              onError={(msg) => setToast({ type: 'error', message: msg })}
            />
            <AiTemplateField
              label="İşlemde (PROCESSING) SMS"
              hint="İsteğe bağlı — vatandaşa bilgilendirme"
              kind="SMS_PROCESSING"
              value={form.smsProcessingTemplate}
              onChange={(v) => setForm((f) => ({ ...f, smsProcessingTemplate: v }))}
              multiline
              aiEndpoint={aiEndpoint}
              onError={(msg) => setToast({ type: 'error', message: msg })}
            />
            <AiTemplateField
              label="Atama (ASSIGNED) SMS"
              hint="Saha görevlisine — isteğe bağlı"
              kind="SMS_ASSIGNED"
              value={form.smsAssignedTemplate}
              onChange={(v) => setForm((f) => ({ ...f, smsAssignedTemplate: v }))}
              multiline
              aiEndpoint={aiEndpoint}
              onError={(msg) => setToast({ type: 'error', message: msg })}
            />
          </>
        ) : (
          <>
            <AiTemplateField
              label="Red push başlık"
              kind="PUSH_REJECTED_TITLE"
              value={form.pushRejectedTitleTemplate}
              onChange={(v) => setForm((f) => ({ ...f, pushRejectedTitleTemplate: v }))}
              aiEndpoint={aiEndpoint}
              onError={(msg) => setToast({ type: 'error', message: msg })}
            />
            <AiTemplateField
              label="Red push mesaj"
              kind="PUSH_REJECTED_BODY"
              value={form.pushRejectedBodyTemplate}
              onChange={(v) => setForm((f) => ({ ...f, pushRejectedBodyTemplate: v }))}
              multiline
              aiEndpoint={aiEndpoint}
              onError={(msg) => setToast({ type: 'error', message: msg })}
            />
            <AiTemplateField
              label="İşlemde push başlık"
              kind="PUSH_PROCESSING_TITLE"
              value={form.pushProcessingTitleTemplate}
              onChange={(v) => setForm((f) => ({ ...f, pushProcessingTitleTemplate: v }))}
              aiEndpoint={aiEndpoint}
              onError={(msg) => setToast({ type: 'error', message: msg })}
            />
            <AiTemplateField
              label="İşlemde push mesaj"
              kind="PUSH_PROCESSING_BODY"
              value={form.pushProcessingBodyTemplate}
              onChange={(v) => setForm((f) => ({ ...f, pushProcessingBodyTemplate: v }))}
              multiline
              aiEndpoint={aiEndpoint}
              onError={(msg) => setToast({ type: 'error', message: msg })}
            />
            <AiTemplateField
              label="Atama push başlık"
              kind="PUSH_ASSIGNED_TITLE"
              value={form.pushAssignedTitleTemplate}
              onChange={(v) => setForm((f) => ({ ...f, pushAssignedTitleTemplate: v }))}
              aiEndpoint={aiEndpoint}
              onError={(msg) => setToast({ type: 'error', message: msg })}
            />
            <AiTemplateField
              label="Atama push mesaj"
              kind="PUSH_ASSIGNED_BODY"
              value={form.pushAssignedBodyTemplate}
              onChange={(v) => setForm((f) => ({ ...f, pushAssignedBodyTemplate: v }))}
              multiline
              aiEndpoint={aiEndpoint}
              onError={(msg) => setToast({ type: 'error', message: msg })}
            />
          </>
        )}

        <button
          type="submit"
          disabled={saving}
          className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-hover disabled:opacity-50"
        >
          {saving ? 'Kaydediliyor…' : 'Şablonları yayınla'}
        </button>
      </form>
    </motion.div>
  );
}
