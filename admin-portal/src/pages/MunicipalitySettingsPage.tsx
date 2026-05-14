import { useEffect, useState } from 'react';
import api from '../api';

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
};

export default function MunicipalitySettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
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
        });
      })
      .catch(() => setMsg('Belediye bilgileri yüklenemedi.'))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
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
      });
      setMsg('Kaydedildi.');
    } catch (err: unknown) {
      const m = err as { response?: { data?: { message?: string } } };
      setMsg(m.response?.data?.message || 'Kayıt başarısız.');
    } finally {
      setSaving(false);
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
