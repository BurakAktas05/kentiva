import { motion } from 'framer-motion';
import { useCallback, useEffect, useRef, useState, type MutableRefObject } from 'react';
import { Upload, Link2, Palette, AlertTriangle } from 'lucide-react';
import api from '../api';
import { resolveMediaUrl } from '../lib/env';
import {
  brandingColor,
  contrastLevelOnPrimary,
  DEFAULT_ACCENT,
  DEFAULT_PRIMARY,
  DEFAULT_SECONDARY,
  isValidEmail,
  isValidUrl,
  municipalityPublicUrl,
  normalizeHex,
  type BrandingFormValues,
} from '../lib/branding';
import type { ToastState } from './ToastBanner';

const inputClass =
  'mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary dark:border-slate-700 dark:bg-slate-900';

export type BrandingMeta = {
  legalName: string;
  slug: string;
  municipalityId: string;
};

type Props = {
  mode: 'tenant' | 'superAdmin';
  meta: BrandingMeta;
  initial: BrandingFormValues;
  onToast: (t: ToastState) => void;
  onFormChange?: (form: BrandingFormValues) => void;
  onSlugChange?: (slug: string) => void;
  slugEditable?: boolean;
};

function draftKey(municipalityId: string) {
  return `belediye-branding-draft:${municipalityId}`;
}

export default function MunicipalityBrandingForm({
  mode,
  meta,
  initial,
  onToast,
  onFormChange,
  onSlugChange,
  slugEditable = false,
}: Props) {
  const onFormChangeRef = useRef(onFormChange) as MutableRefObject<typeof onFormChange>;
  useEffect(() => {
    onFormChangeRef.current = onFormChange;
  });
  const [form, setForm] = useState<BrandingFormValues>(initial);
  const [slug, setSlug] = useState(meta.slug);
  const [savedSnapshot, setSavedSnapshot] = useState(JSON.stringify(initial));
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    Promise.resolve().then(() => {
      setForm(initial);
      setSlug(meta.slug);
      setSavedSnapshot(JSON.stringify(initial));
      onFormChangeRef.current?.(initial);
      onSlugChange?.(meta.slug);
    });
  }, [initial, meta.slug, onSlugChange]);

  useEffect(() => {
    onFormChangeRef.current?.(form);
  }, [form]);

  useEffect(() => {
    onSlugChange?.(slug);
  }, [slug, onSlugChange]);

  useEffect(() => {
    Promise.resolve().then(() => {
      try {
        const raw = localStorage.getItem(draftKey(meta.municipalityId));
        if (!raw) return;
        const parsed = JSON.parse(raw) as BrandingFormValues;
        setForm(parsed);
      } catch {
        /* ignore */
      }
    });
  }, [meta.municipalityId]);

  const isDirty = JSON.stringify(form) !== savedSnapshot || (slugEditable && slug !== meta.slug);

  const persistDraft = useCallback(() => {
    try {
      localStorage.setItem(draftKey(meta.municipalityId), JSON.stringify(form));
      onToast({ type: 'success', message: 'Taslak tarayıcıda kaydedildi.' });
    } catch {
      onToast({ type: 'error', message: 'Taslak kaydedilemedi.' });
    }
  }, [form, meta.municipalityId, onToast]);

  const clearDraft = () => {
    localStorage.removeItem(draftKey(meta.municipalityId));
    setForm(initial);
    setSlug(meta.slug);
    onToast({ type: 'success', message: 'Taslak silindi, kayıtlı sürüme dönüldü.' });
  };

  const validate = (): string | null => {
    if (!form.displayName.trim()) return 'Görünen ad zorunludur.';
    if (form.primaryColor && !normalizeHex(form.primaryColor)) return 'Birincil renk geçerli bir hex olmalıdır (#0b4f9c).';
    if (form.secondaryColor && !normalizeHex(form.secondaryColor)) return 'İkincil renk geçerli bir hex olmalıdır.';
    if (form.accentColor && !normalizeHex(form.accentColor)) return 'Vurgu rengi geçerli bir hex olmalıdır.';
    if (!isValidEmail(form.contactEmail)) return 'Geçerli bir kurumsal e-posta girin.';
    if (!isValidUrl(form.websiteUrl)) return 'Web sitesi http veya https ile başlamalıdır.';
    if (form.logoUrl && !/^https?:\/\//i.test(form.logoUrl) && !form.logoUrl.startsWith('/')) {
      return 'Logo URL tam adres veya sunucu yolu (/media/…) olmalıdır.';
    }
    return null;
  };

  const uploadLogoFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      onToast({ type: 'error', message: 'Yalnızca görüntü dosyası yükleyebilirsiniz (PNG, JPG, WebP).' });
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      onToast({ type: 'error', message: 'Logo en fazla 2 MB olmalıdır. Kare veya yatay 3:1 oran önerilir.' });
      return;
    }
    setUploadingLogo(true);
    try {
      const body = new FormData();
      body.append('file', file);
      const url =
        mode === 'tenant'
          ? '/municipalities/me/branding/logo'
          : `/admin/municipalities/${meta.municipalityId}/branding/logo`;
      const res = await api.post(url, body, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const logoUrl = res.data.data as string;
      setForm((f) => ({ ...f, logoUrl }));
      onToast({ type: 'success', message: 'Logo yüklendi. Değişiklikleri yayınlamak için Kaydet’e basın.' });
    } catch (err: unknown) {
      const m = err as { response?: { data?: { message?: string } } };
      onToast({ type: 'error', message: m.response?.data?.message || 'Logo yüklenemedi.' });
    } finally {
      setUploadingLogo(false);
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) void uploadLogoFile(file);
  };

  const publish = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validate();
    if (err) {
      onToast({ type: 'error', message: err });
      return;
    }
    setSaving(true);
    const payload = {
      displayName: form.displayName.trim() || null,
      logoUrl: form.logoUrl.trim() || null,
      primaryColor: normalizeHex(form.primaryColor) || null,
      secondaryColor: normalizeHex(form.secondaryColor) || null,
      accentColor: normalizeHex(form.accentColor) || null,
      slogan: form.slogan.trim() || null,
      contactEmail: form.contactEmail.trim() || null,
      contactPhone: form.contactPhone.trim() || null,
      websiteUrl: form.websiteUrl.trim() || null,
      publicStatsEnabled: form.publicStatsEnabled,
      active: null,
      onboarded: null,
      workflowMode: form.workflowMode,
      slug: slugEditable && slug.trim() ? slug.trim() : null,
    };
    try {
      if (mode === 'tenant') {
        await api.patch('/municipalities/me/branding', payload);
      } else {
        await api.patch(`/admin/municipalities/${meta.municipalityId}`, payload);
      }
      localStorage.removeItem(draftKey(meta.municipalityId));
      setSavedSnapshot(JSON.stringify(form));
      onToast({ type: 'success', message: 'Marka ayarları yayınlandı. Mobil ve kamu sitesi kısa süre içinde güncellenir.' });
    } catch (err: unknown) {
      const m = err as { response?: { data?: { message?: string } } };
      onToast({ type: 'error', message: m.response?.data?.message || 'Kayıt başarısız.' });
    } finally {
      setSaving(false);
    }
  };

  const primary = brandingColor(form.primaryColor, DEFAULT_PRIMARY);
  const contrast = contrastLevelOnPrimary(primary);
  const logoPreview = resolveMediaUrl(form.logoUrl);

  return (
    <form onSubmit={publish} className="space-y-5">
      {/* Kimlik */}
      <Section title="Kimlik" subtitle="Vatandaş uygulamasında ve kamu sayfasında görünen kurum kimliği.">
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
          Resmi ad
          <input className={`${inputClass} bg-slate-50 dark:bg-slate-800/80`} value={meta.legalName} readOnly disabled />
        </label>
        <Field
          label="Görünen ad *"
          hint="Mobil uygulama başlığı ve bildirimlerde kullanılır."
          value={form.displayName}
          onChange={(v) => setForm((f) => ({ ...f, displayName: v }))}
        />
        {mode === 'superAdmin' && (
          <label className="block">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">İş Akışı Modu</span>
            <select
              className={inputClass}
              value={form.workflowMode}
              onChange={(e) => setForm((f) => ({ ...f, workflowMode: e.target.value }))}
            >
              <option value="SIMPLE">Basit Mod (Doğrudan Atama)</option>
              <option value="DEPARTMENTAL">Departmanlı Mod (Beyaz Masa &gt; Departman &gt; Atama)</option>
            </select>
          </label>
        )}
        <Field
          label="Slogan"
          value={form.slogan}
          onChange={(v) => setForm((f) => ({ ...f, slogan: v }))}
          placeholder="Hizmette öncü belediye"
        />

        <div>
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Logo</span>
          <p className="mt-0.5 text-xs text-slate-500">
            PNG veya SVG önerilir; en az 256×256 px, max 2 MB. Kare veya yatay 3:1.
          </p>
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            className={`mt-2 flex flex-col items-center justify-center rounded-2xl border-2 border-dashed px-4 py-6 transition-colors ${
              dragOver
                ? 'border-primary bg-primary/5'
                : 'border-slate-200 bg-slate-50/80 dark:border-slate-700 dark:bg-slate-800/40'
            }`}
          >
            {logoPreview ? (
              <img src={logoPreview} alt="" className="mb-3 h-16 w-16 object-contain" />
            ) : (
              <Upload className="mb-2 h-8 w-8 text-slate-400" />
            )}
            <p className="text-center text-xs text-slate-500">Sürükleyip bırakın veya dosya seçin</p>
            <button
              type="button"
              disabled={uploadingLogo}
              onClick={() => fileRef.current?.click()}
              className="mt-2 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary-hover disabled:opacity-60"
            >
              {uploadingLogo ? 'Yükleniyor…' : 'Dosya seç'}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void uploadLogoFile(f);
                e.target.value = '';
              }}
            />
          </div>
          <Field
            label="Logo URL (alternatif)"
            value={form.logoUrl}
            onChange={(v) => setForm((f) => ({ ...f, logoUrl: v }))}
            placeholder="https://… veya /media/…"
          />
        </div>
      </Section>

      {/* Görünüm */}
      <Section title="Görünüm" subtitle="Mobil uygulama ve kamu sitesi renk paleti.">
        <div className="flex flex-wrap gap-2">
          {[
            { label: 'Kentiva', primary: '#0b4f9c', secondary: '#0ea5e9', accent: '#f59e0b' },
            { label: 'Orman', primary: '#14532d', secondary: '#22c55e', accent: '#84cc16' },
            { label: 'Gece', primary: '#1e293b', secondary: '#6366f1', accent: '#f472b6' },
            { label: 'Gün batımı', primary: '#9a3412', secondary: '#ea580c', accent: '#fbbf24' },
          ].map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() =>
                setForm((f) => ({
                  ...f,
                  primaryColor: preset.primary,
                  secondaryColor: preset.secondary,
                  accentColor: preset.accent,
                }))
              }
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:border-primary/40 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200"
            >
              <span className="flex gap-0.5">
                <span className="h-4 w-4 rounded-full" style={{ background: preset.primary }} />
                <span className="h-4 w-4 rounded-full" style={{ background: preset.secondary }} />
                <span className="h-4 w-4 rounded-full" style={{ background: preset.accent }} />
              </span>
              {preset.label}
            </button>
          ))}
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <ColorField
            label="Birincil"
            value={form.primaryColor}
            fallback={DEFAULT_PRIMARY}
            onChange={(v) => setForm((f) => ({ ...f, primaryColor: v }))}
            contrast={contrast}
          />
          <ColorField
            label="İkincil"
            value={form.secondaryColor}
            fallback={DEFAULT_SECONDARY}
            onChange={(v) => setForm((f) => ({ ...f, secondaryColor: v }))}
          />
          <ColorField
            label="Vurgu"
            value={form.accentColor}
            fallback={DEFAULT_ACCENT}
            onChange={(v) => setForm((f) => ({ ...f, accentColor: v }))}
          />
        </div>
        {contrast === 'fail' ? (
          <p className="flex items-start gap-2 text-xs text-amber-700 dark:text-amber-300">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            Birincil renk üzerinde beyaz metin okunabilirliği düşük. Daha koyu bir ton seçin.
          </p>
        ) : null}
      </Section>

      {/* Alan adı */}
      <Section title="Alan adı" subtitle="Kamu istatistik ve belediye sayfası adresi.">
        {slugEditable ? (
          <Field
            label="Slug"
            hint="Yalnızca küçük harf, rakam ve tire. Değişiklik mevcut bağlantıları etkiler."
            value={slug}
            onChange={setSlug}
          />
        ) : (
          <label className="block">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Slug</span>
            <div className="mt-1 flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800/80">
              <Link2 className="h-4 w-4 shrink-0 text-slate-400" />
              <span className="font-mono text-slate-700 dark:text-slate-200">{meta.slug}</span>
            </div>
          </label>
        )}
        <p className="text-xs text-slate-500">
          Kamu adresi:{' '}
          <a
            href={municipalityPublicUrl(slug || meta.slug)}
            target="_blank"
            rel="noreferrer"
            className="font-medium text-primary hover:underline"
          >
            {municipalityPublicUrl(slug || meta.slug)}
          </a>
        </p>
      </Section>

      {/* İletişim */}
      <Section title="İletişim" subtitle="Vatandaşların gördüğü destek kanalları.">
        <Field
          label="Destek e-postası"
          type="email"
          value={form.contactEmail}
          onChange={(v) => setForm((f) => ({ ...f, contactEmail: v }))}
        />
        <Field
          label="Destek telefonu"
          value={form.contactPhone}
          onChange={(v) => setForm((f) => ({ ...f, contactPhone: v }))}
        />
        <Field
          label="Web sitesi"
          value={form.websiteUrl}
          onChange={(v) => setForm((f) => ({ ...f, websiteUrl: v }))}
          placeholder="https://www.belediye.gov.tr"
        />
      </Section>

      {/* Mobil uygulama */}
      <Section title="Mobil uygulama" subtitle="Kamu istatistikleri ayarları.">
        <label className="flex items-start gap-3 rounded-xl border border-slate-200/90 bg-slate-50/80 p-3 dark:border-slate-700 dark:bg-slate-800/40">
          <input
            type="checkbox"
            className="mt-1"
            checked={form.publicStatsEnabled}
            onChange={(e) => setForm((f) => ({ ...f, publicStatsEnabled: e.target.checked }))}
          />
          <span>
            <span className="block text-sm font-semibold text-slate-800 dark:text-slate-100">
              Kamu istatistik sitesinde anonim özet
            </span>
            <span className="text-xs text-slate-500">kentiva.app/belediye sayfasında çözüm oranı gösterilir.</span>
          </span>
        </label>
      </Section>

      <motion.div
        className="flex flex-wrap items-center gap-3 border-t border-slate-200 pt-4 dark:border-slate-800"
        layout
      >
        <button
          type="submit"
          disabled={saving || !isDirty}
          className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-hover disabled:opacity-50"
        >
          {saving ? 'Yayınlanıyor…' : 'Yayınla'}
        </button>
        <button
          type="button"
          onClick={persistDraft}
          className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-100 dark:hover:bg-slate-800"
        >
          Taslağı kaydet
        </button>
        <button
          type="button"
          onClick={clearDraft}
          className="text-sm font-medium text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
        >
          Taslağı sil
        </button>
        {isDirty ? (
          <span className="text-xs font-medium text-amber-600 dark:text-amber-400">Kaydedilmemiş değişiklikler var</span>
        ) : null}
      </motion.div>
    </form>
  );
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/50">
      <h3 className="text-base font-bold text-slate-900 dark:text-white">{title}</h3>
      <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>
      <motion.div className="mt-4 space-y-3">{children}</motion.div>
    </section>
  );
}

function Field({
  label,
  hint,
  value,
  onChange,
  placeholder,
  type = 'text',
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{label}</span>
      {hint ? <span className="mt-0.5 block text-xs text-slate-500">{hint}</span> : null}
      <input
        type={type}
        className={inputClass}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

function ColorField({
  label,
  value,
  fallback,
  onChange,
  contrast,
}: {
  label: string;
  value: string;
  fallback: string;
  onChange: (v: string) => void;
  contrast?: 'ok' | 'aa-large' | 'fail';
}) {
  const display = brandingColor(value, fallback);
  return (
    <label className="block">
      <span className="flex items-center gap-1 text-sm font-medium text-slate-700 dark:text-slate-300">
        <Palette className="h-3.5 w-3.5" />
        {label}
      </span>
      <motion.div className="mt-1 flex gap-2" layout>
        <input
          type="color"
          className="h-10 w-12 cursor-pointer rounded-lg border border-slate-200 dark:border-slate-700"
          value={display}
          onChange={(e) => onChange(e.target.value)}
        />
        <input
          className={`${inputClass} flex-1 font-mono text-xs`}
          value={value}
          placeholder={fallback}
          onChange={(e) => onChange(e.target.value)}
        />
      </motion.div>
      {contrast === 'fail' ? (
        <span className="mt-1 block text-[10px] text-amber-600">Düşük kontrast</span>
      ) : null}
    </label>
  );
}
