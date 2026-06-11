import { motion } from 'framer-motion';
import { Globe, LogIn, Wifi, Battery, Bell, Plus, Home, MapPin, User, CheckCircle2 } from 'lucide-react';
import { resolveMediaUrl } from '../lib/env';
import {
  brandingColor,
  contrastLevelOnPrimary,
  DEFAULT_ACCENT,
  DEFAULT_PRIMARY,
  DEFAULT_SECONDARY,
  municipalityPublicUrl,
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
  const publicUrl = municipalityPublicUrl(slug || 'belediye');

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div>
        <p className="kentiva-eyebrow">Canlı Önizleme</p>
        <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5">Kurumsal Marka ve Arayüz</h4>
      </div>

      {contrast === 'fail' && (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-900 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-200">
          ⚠️ Birincil renk üzerinde beyaz metin okunabilirliği yetersiz (WCAG AA &lt; 4.5:1).
        </p>
      )}

      {/* Premium Mobil Cihaz Mockup */}
      <div className="relative mx-auto w-[270px] h-[520px] rounded-[48px] border-[8px] border-slate-800 bg-slate-950 shadow-2xl overflow-hidden ring-4 ring-slate-700/30">
        {/* Dynamic Island / Notch */}
        <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-24 h-4 bg-slate-800 rounded-full z-30" />
        
        {/* Status Bar */}
        <div className="absolute top-1.5 left-0 right-0 px-6 py-1 flex justify-between items-center text-[9px] text-white z-20 font-semibold mix-blend-difference">
          <span>09:41</span>
          <div className="flex items-center gap-1">
            <Wifi className="h-2.5 w-2.5" />
            <Battery className="h-2.5 w-2.5" />
          </div>
        </div>

        {/* Cihaz Ekranı */}
        <div className="relative w-full h-full pt-7 pb-3 bg-slate-50 dark:bg-slate-900 flex flex-col justify-between overflow-hidden select-none">
          {/* Header Gradiyenti */}
          <motion.div
            key={`${primary}-${secondary}`}
            className="px-4 pt-3 pb-5 rounded-b-[24px] text-white shadow-md relative overflow-hidden"
            style={{ background: `linear-gradient(135deg, ${primary}, ${secondary})` }}
          >
            {/* Header Content */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {logoSrc ? (
                  <img src={logoSrc} alt="" className="h-7 w-7 rounded-lg bg-white object-contain p-0.5 shadow-sm" />
                ) : (
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/20 text-xs font-bold">
                    {display.slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="truncate text-xs font-bold leading-tight">{display}</p>
                  <p className="text-[9px] opacity-80 leading-none truncate">Kent Mobil Asistanı</p>
                </div>
              </div>
              <Bell className="h-4.5 w-4.5 opacity-80" />
            </div>

            <div className="mt-3">
              <p className="text-[10px] opacity-90 leading-tight">Merhaba 👋</p>
              <p className="text-sm font-extrabold leading-tight">Hizmet Kapınızda</p>
            </div>
          </motion.div>

          {/* Scrollable Body Mock */}
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
            {/* Slogan veya Tanıtım */}
            {form.slogan && (
              <div className="bg-white dark:bg-slate-800 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800/80 shadow-sm">
                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold">BELEDİYE MOTTO</p>
                <p className="text-xs font-bold text-slate-800 dark:text-slate-100 mt-0.5">{form.slogan}</p>
              </div>
            )}

            {/* İstatistik Widget'ları */}
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-white dark:bg-slate-800 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800/80 shadow-sm flex items-center gap-2">
                <CheckCircle2 className="h-6 w-6" style={{ color: primary }} />
                <div>
                  <p className="text-[14px] font-bold text-slate-800 dark:text-slate-100 leading-none">142</p>
                  <p className="text-[8px] text-slate-400 dark:text-slate-500 font-medium">Çözüldü</p>
                </div>
              </div>
              <div className="bg-white dark:bg-slate-800 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800/80 shadow-sm flex items-center gap-2">
                <div className="h-6 w-6 rounded-full flex items-center justify-center bg-amber-500/10">
                  <span className="h-2 w-2 rounded-full bg-amber-500" />
                </div>
                <div>
                  <p className="text-[14px] font-bold text-slate-800 dark:text-slate-100 leading-none">8</p>
                  <p className="text-[8px] text-slate-400 dark:text-slate-500 font-medium">İşlemde</p>
                </div>
              </div>
            </div>

            {/* Hızlı Buton */}
            <motion.button
              whileTap={{ scale: 0.98 }}
              className="w-full py-2.5 rounded-xl flex items-center justify-center gap-1.5 text-xs font-extrabold text-white shadow-md shadow-primary/10"
              style={{ backgroundColor: primary }}
            >
              <Plus className="h-4 w-4" />
              Yeni İhbar Bildir
            </motion.button>

            {/* Son İhbar Kartı */}
            <div className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-100 dark:border-slate-800/80 shadow-sm space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[9px] px-1.5 py-0.5 rounded-md font-bold text-white" style={{ backgroundColor: secondary }}>
                  Yol & Altyapı
                </span>
                <span className="text-[8px] font-semibold text-slate-400 dark:text-slate-500">2 saat önce</span>
              </div>
              <div>
                <p className="text-xs font-extrabold text-slate-800 dark:text-slate-100">Sokak Çukuru Onarımı</p>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate">Cumhuriyet Cd. No: 12 önündeki...</p>
              </div>
              <div className="flex items-center justify-between border-t border-slate-50 dark:border-slate-700/50 pt-2">
                <span className="text-[9px] font-bold" style={{ color: accent }}>
                  ● Ekipler Atandı
                </span>
                <span className="text-[8px] font-medium text-slate-400 dark:text-slate-500">Süreç Başlatıldı</span>
              </div>
            </div>
          </div>

          {/* Bottom Tab Bar */}
          <div className="border-t border-slate-200/50 dark:border-slate-800/50 bg-white/95 dark:bg-slate-950/95 pt-2 pb-1.5 px-4 flex justify-between items-center text-[9px] text-slate-400 dark:text-slate-500">
            <div className="flex flex-col items-center gap-0.5 font-bold" style={{ color: primary }}>
              <Home className="h-4 w-4" />
              <span>Ana Sayfa</span>
            </div>
            <div className="flex flex-col items-center gap-0.5 font-medium">
              <MapPin className="h-4 w-4" />
              <span>Harita</span>
            </div>
            <div className="flex flex-col items-center gap-0.5 font-medium">
              <User className="h-4 w-4" />
              <span>Profil</span>
            </div>
          </div>
        </div>
      </div>

      {/* Login Ekranı Mockup */}
      <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-slate-50 dark:border-slate-700 dark:bg-slate-950">
        <div className="flex items-center gap-1 border-b border-slate-200 px-3 py-1.5 text-[10px] text-slate-500 dark:border-slate-800">
          <LogIn className="h-3 w-3" /> Vatandaş Giriş Ekranı
        </div>
        <div className="flex flex-col items-center px-4 py-5">
          {logoSrc ? (
            <img src={logoSrc} alt="" className="mb-2 h-12 w-12 object-contain" />
          ) : (
            <div
              className="mb-2 flex h-12 w-12 items-center justify-center rounded-xl text-md font-bold text-white"
              style={{ backgroundColor: primary }}
            >
              {display.slice(0, 1)}
            </div>
          )}
          <p className="text-center text-xs font-extrabold text-slate-800 dark:text-white">{display}</p>
          <p className="mt-3 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-center text-[10px] text-slate-400 dark:border-slate-700 dark:bg-slate-900">
            Giriş Yapmak İçin Telefon Numaranız
          </p>
          <motion.button
            type="button"
            className="mt-2 w-full rounded-xl py-2 text-xs font-semibold text-white shadow-sm"
            style={{ backgroundColor: primary }}
          >
            Devam Et
          </motion.button>
        </div>
      </div>

      {/* Web Kamu Sitesi Footer */}
      <div className="overflow-hidden rounded-2xl border border-slate-200/90 dark:border-slate-700">
        <div className="flex items-center gap-1 border-b border-slate-200 px-3 py-1.5 text-[10px] text-slate-500 dark:border-slate-800">
          <Globe className="h-3 w-3" /> Kamu Web Sitesi ({publicUrl.replace(/^https?:\/\//, '')})
        </div>
        <div className="p-3 bg-white dark:bg-slate-900" style={{ borderTop: `3px solid ${primary}` }}>
          <p className="text-xs font-bold text-slate-900 dark:text-white">{display}</p>
          <p className="text-[10px] text-slate-500">{form.contactEmail || 'destek@belediye.gov.tr'}</p>
        </div>
      </div>
    </motion.div>
  );
}
