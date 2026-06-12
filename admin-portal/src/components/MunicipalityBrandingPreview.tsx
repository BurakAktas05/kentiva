import { motion } from 'framer-motion';
import { Globe, LogIn, Wifi, Battery, Home, MapPin, User, ClipboardList, Cloud, ChevronRight, BarChart3 } from 'lucide-react';
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

      {/* Premium Mobil Cihaz Mockup — mirrors Home.tsx */}
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
          {/* Top Bar — Welcome + Municipality Pill */}
          <div className="px-3.5 pt-3 pb-2.5 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[9px] font-medium text-slate-400">Hoş geldiniz 👋</p>
              <p className="text-[11px] font-semibold text-slate-800 dark:text-white leading-tight truncate">
                Merhaba, Ahmet Yılmaz
              </p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-0.5">
              <div
                className="flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-1 text-[8px] font-medium text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
              >
                <MapPin className="h-2.5 w-2.5" style={{ color: primary }} />
                <span className="max-w-[80px] truncate">{display}</span>
              </div>
            </div>
          </div>

          {/* Scrollable Body Mock */}
          <div className="flex-1 overflow-y-auto px-3 py-1 space-y-2.5">
            {/* Weather Widget */}
            <motion.div
              key={`weather-${primary}`}
              className="relative overflow-hidden rounded-xl p-3 text-white shadow-sm"
              style={{ background: `linear-gradient(135deg, ${primary}, ${secondary})` }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Cloud className="h-6 w-6 opacity-80" />
                  <div>
                    <p className="text-[13px] font-bold leading-none">22°C</p>
                    <p className="text-[8px] opacity-75 leading-tight">Parçalı Bulutlu</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[9px] font-semibold opacity-90">{display}</p>
                  <p className="text-[8px] opacity-70">Haziran 2026</p>
                </div>
              </div>
            </motion.div>

            {/* Announcement Carousel Mock */}
            <div>
              <p className="text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">Duyurular</p>
              <div className="relative rounded-xl overflow-hidden shadow-sm border border-slate-100 dark:border-slate-800">
                <div
                  className="h-20 flex items-end p-2.5"
                  style={{ background: `linear-gradient(135deg, ${secondary}40, ${primary}30)` }}
                >
                  <div>
                    <p className="text-[10px] font-bold text-slate-800 dark:text-white leading-tight">
                      Yaz Festivali Etkinlik Programı
                    </p>
                    <p className="text-[8px] text-slate-500 mt-0.5">2 gün önce yayınlandı</p>
                  </div>
                </div>
                {/* Carousel dots */}
                <div className="absolute bottom-1.5 right-2 flex items-center gap-1">
                  <span className="h-1 w-3 rounded-full" style={{ backgroundColor: primary }} />
                  <span className="h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-600" />
                  <span className="h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-600" />
                </div>
              </div>
            </div>

            {/* İhbarlarım Card — mirrors reportsCard() in Home.tsx */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-800/80 p-2.5 shadow-sm">
              <div className="flex items-center gap-2.5">
                <div
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                  style={{ backgroundColor: `${primary}18` }}
                >
                  <ClipboardList className="h-4 w-4" style={{ color: primary }} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-semibold text-slate-800 dark:text-white leading-tight">İhbarlarım</p>
                  <p className="text-[8px] text-slate-400 dark:text-slate-500 mt-0.5">
                    Toplam 3 ihbar kaydınız var
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-0.5">
                  <span className="text-[8px] font-medium" style={{ color: primary }}>Tümünü Gör</span>
                  <ChevronRight className="h-3 w-3" style={{ color: primary }} />
                </div>
              </div>
            </div>

            {/* Active Survey Widget */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-800/80 p-2.5 shadow-sm space-y-2">
              <div className="flex items-center gap-1.5">
                <BarChart3 className="h-3.5 w-3.5" style={{ color: accent }} />
                <p className="text-[9px] font-bold text-slate-700 dark:text-slate-200">Aktif Anket</p>
              </div>
              <p className="text-[10px] font-semibold text-slate-800 dark:text-white leading-tight">
                Park alanlarını yeterli buluyor musunuz?
              </p>
              <div className="space-y-1">
                {['Evet, yeterli', 'Hayır, artırılmalı', 'Fikrim yok'].map((opt, i) => (
                  <div
                    key={i}
                    className={`rounded-lg px-2 py-1.5 text-[9px] font-medium border ${
                      i === 0
                        ? 'border-transparent text-white'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 bg-slate-50/50 dark:bg-slate-900/50'
                    }`}
                    style={i === 0 ? { backgroundColor: primary } : undefined}
                  >
                    {opt}
                  </div>
                ))}
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
