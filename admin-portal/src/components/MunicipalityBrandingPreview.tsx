import { motion } from 'framer-motion';
import { Smartphone, Globe, LogIn } from 'lucide-react';
import { resolveMediaUrl } from '../lib/env';
import {
  brandingColor,
  contrastLevelOnPrimary,
  DEFAULT_ACCENT,
  DEFAULT_PRIMARY,
  DEFAULT_SECONDARY,
  type BrandingFormValues,
} from '../lib/branding';

type Props = {
  form: BrandingFormValues;
  legalName: string;
  slug: string;
};

export default function MunicipalityBrandingPreview({ form, legalName, slug }: Props) {
  const primary = brandingColor(form.primaryColor, DEFAULT_PRIMARY);
  const secondary = brandingColor(form.secondaryColor, DEFAULT_SECONDARY);
  const accent = brandingColor(form.accentColor, DEFAULT_ACCENT);
  const display = form.displayName.trim() || legalName;
  const logoSrc = resolveMediaUrl(form.logoUrl);
  const contrast = contrastLevelOnPrimary(primary);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
      <p className="kentiva-eyebrow">Canlı önizleme</p>

      {contrast === 'fail' ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-200">
          Beyaz metin ile birincil renk arasındaki kontrast WCAG AA için yetersiz (4.5:1). Başlık veya buton
          metnini koyulaştırın ya da birincil rengi açın.
        </p>
      ) : contrast === 'aa-large' ? (
        <p className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-300">
          Kontrast büyük metin için yeterli; küçük metin için birincil rengi biraz koyulaştırmanız önerilir.
        </p>
      ) : null}

      <motion.div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-md dark:border-slate-700 dark:bg-slate-900">
        <motion.div
          key={`${primary}-${secondary}-${display}`}
          className="flex items-center gap-2 border-b border-white/10 px-3 py-2.5 text-white"
          style={{ background: `linear-gradient(135deg, ${primary}, ${secondary})` }}
        >
          {logoSrc ? (
            <img src={logoSrc} alt="" className="h-8 w-8 rounded-lg bg-white/90 object-contain p-0.5" />
          ) : (
            <motion.div
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/20 text-xs font-bold"
              animate={{ scale: [1, 1.03, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              {display.slice(0, 2).toUpperCase()}
            </motion.div>
          )}
          <motion.div className="min-w-0 flex-1" layout>
            <p className="truncate text-sm font-bold">{display}</p>
            {form.slogan ? <p className="truncate text-[10px] opacity-90">{form.slogan}</p> : null}
          </motion.div>
          <Smartphone className="h-4 w-4 shrink-0 opacity-80" />
        </motion.div>
        <motion.div className="space-y-2 p-3" initial={false} animate={{ backgroundColor: '#f8fafc' }}>
          <div className="h-16 rounded-xl bg-white p-2 shadow-sm dark:bg-slate-800">
            <div className="h-2 w-2/3 rounded bg-slate-200 dark:bg-slate-600" />
            <motion.div
              className="mt-2 h-6 w-24 rounded-lg text-center text-[10px] font-semibold leading-6 text-white"
              style={{ backgroundColor: primary }}
            >
              Bildir
            </motion.div>
          </div>
          <motion.div className="flex gap-2">
            <motion.div className="h-8 flex-1 rounded-lg" style={{ backgroundColor: accent, opacity: 0.35 }} />
            <motion.div className="h-8 flex-1 rounded-lg" style={{ backgroundColor: secondary, opacity: 0.25 }} />
          </motion.div>
        </motion.div>
      </motion.div>

      <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-slate-50 dark:border-slate-700 dark:bg-slate-950">
        <div className="flex items-center gap-1 border-b border-slate-200 px-3 py-1.5 text-[10px] text-slate-500 dark:border-slate-800">
          <LogIn className="h-3 w-3" /> Vatandaş girişi
        </div>
        <div className="flex flex-col items-center px-4 py-5">
          {logoSrc ? (
            <img src={logoSrc} alt="" className="mb-2 h-14 w-14 object-contain" />
          ) : (
            <div
              className="mb-2 flex h-14 w-14 items-center justify-center rounded-2xl text-lg font-bold text-white"
              style={{ backgroundColor: primary }}
            >
              {display.slice(0, 1)}
            </div>
          )}
          <p className="text-center text-sm font-bold text-slate-800 dark:text-white">{display}</p>
          <p className="mt-3 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-center text-[11px] text-slate-400 dark:border-slate-700 dark:bg-slate-900">
            Telefon numaranız
          </p>
          <motion.button
            type="button"
            className="mt-2 w-full rounded-xl py-2 text-xs font-semibold text-white"
            style={{ backgroundColor: primary }}
          >
            Devam et
          </motion.button>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200/90 dark:border-slate-700">
        <div className="flex items-center gap-1 border-b border-slate-200 px-3 py-1.5 text-[10px] text-slate-500 dark:border-slate-800">
          <Globe className="h-3 w-3" /> Kamu sitesi /belediye/{slug || '…'}
        </div>
        <div className="p-3" style={{ borderTop: `3px solid ${primary}` }}>
          <p className="text-sm font-bold text-slate-900 dark:text-white">{display}</p>
          <p className="text-xs text-slate-500">{form.contactEmail || 'destek@belediye.gov.tr'}</p>
        </div>
      </div>
    </motion.div>
  );
}
