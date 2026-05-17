import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Camera, MapPin, FileText, CheckCircle2, ChevronLeft, ArrowRight, Building2, Navigation, Tag } from 'lucide-react';
import {
  getCategories,
  createReport,
  uploadMedia,
  resolveMediaUrl,
  resolveMunicipalityByGps,
  type ApiCategory,
  type PublicTenant,
} from '../../api';
import { Lang, t } from '../../i18n';

interface NewReportProps {
  onSubmit: () => void;
  onCancel: () => void;
  lang: Lang;
  isDark: boolean;
}

function buildReportTitle(description: string, categoryName: string | undefined, lang: Lang): string {
  const trimmed = description.trim();
  if (trimmed.length >= 10) return trimmed.slice(0, 80);
  const prefix = categoryName || (lang === 'tr' ? 'Bildirim' : 'Report');
  const combined = `${prefix}: ${trimmed}`.slice(0, 80);
  return combined.length >= 10 ? combined : `${prefix} â€” ${new Date().toLocaleDateString(lang === 'tr' ? 'tr-TR' : 'en-US')}`;
}

export default function NewReport({ onSubmit, onCancel, lang, isDark }: NewReportProps) {
  const [step, setStep] = useState(1);
  const [description, setDescription] = useState('');
  const [categories, setCategories] = useState<ApiCategory[]>([]);
  const [categoryId, setCategoryId] = useState('');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [locationText, setLocationText] = useState('');
  const [resolvedMunicipality, setResolvedMunicipality] = useState<PublicTenant | null>(null);
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [locating, setLocating] = useState(false);

  useEffect(() => {
    if (!resolvedMunicipality?.id) {
      setCategories([]);
      setCategoryId('');
      return;
    }
    let cancelled = false;
    getCategories(resolvedMunicipality.id)
      .then((cats) => {
        if (cancelled) return;
        setCategories(cats);
        const other = cats.find((c) => /diğer|other/i.test(c.name));
        setCategoryId(other?.id ?? cats[0]?.id ?? '');
      })
      .catch(() => {
        if (!cancelled) {
          setError(lang === 'tr' ? 'Kategoriler yüklenemedi.' : 'Could not load categories.');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [lang, resolvedMunicipality?.id]);

  const selectedCategory = categories.find((c) => c.id === categoryId);

  const resolveMunicipalityAt = async (lat: number, lng: number) => {
    const m = await resolveMunicipalityByGps(lat, lng);
    setResolvedMunicipality(m);
    if (!m) {
      setError(t('report.municipality.outside', lang));
    } else {
      setError('');
    }
    return m;
  };

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      setError(t('report.location.needGps', lang));
      return;
    }
    setLocating(true);
    setError('');
    setResolvedMunicipality(null);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setLatitude(lat);
        setLongitude(lng);
        setLocationText(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
        await resolveMunicipalityAt(lat, lng);
        setLocating(false);
      },
      () => {
        setLocating(false);
        setError(t('report.location.denied', lang));
      },
      { enableHighAccuracy: true, timeout: 15000 },
    );
  };

  const handleNext = () => {
    if (step === 1 && description.trim() && latitude !== null && longitude !== null && categoryId && resolvedMunicipality) {
      setStep(2);
    }
  };

  const handleSubmit = async () => {
    if (latitude === null || longitude === null || !categoryId || !resolvedMunicipality) return;
    setIsSubmitting(true);
    setError('');
    try {
      const finalTitle = buildReportTitle(description, selectedCategory?.name, lang);
      const urls = mediaUrl ? [mediaUrl] : [];
      await createReport(
        finalTitle,
        description,
        categoryId,
        latitude,
        longitude,
        resolvedMunicipality.displayName,
        urls,
        resolvedMunicipality.id,
      );
      onSubmit();
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : lang === 'tr'
            ? 'Rapor gÃ¶nderilemedi. Ä°nternet baÄŸlantÄ±nÄ±zÄ± kontrol edin.'
            : 'Could not submit. Check your connection.';
      setError(msg);
      setIsSubmitting(false);
    }
  };

  const municipalityLabel = resolvedMunicipality?.displayName ?? 'â€”';

  const generatePreviewText = () => {
    const today = new Date().toLocaleDateString(lang === 'tr' ? 'tr-TR' : 'en-US');

    return `ğŸ“ ${t('report.location', lang)}: ${locationText || 'GPS'}
ğŸ›ï¸ ${lang === 'tr' ? 'Belediye' : 'Municipality'}: ${municipalityLabel}
ğŸ“‚ ${lang === 'tr' ? 'Kategori' : 'Category'}: ${selectedCategory?.name ?? 'â€”'}
ğŸ“… ${lang === 'tr' ? 'Tarih' : 'Date'}: ${today}
${mediaUrl ? 'ğŸ“¸ ' + (lang === 'tr' ? 'FotoÄŸraf eklendi' : 'Photo attached') : ''}

ğŸ“ ${t('report.description', lang)}:
${description}`;
  };

  const canProceed =
    Boolean(description.trim()) &&
    latitude !== null &&
    longitude !== null &&
    Boolean(categoryId) &&
    Boolean(resolvedMunicipality);

  return (
    <div className={`flex flex-col h-full ${isDark ? 'bg-slate-900' : 'bg-white'}`}>
      <motion.div className={`flex items-center justify-between p-4 border-b ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
        <button
          type="button"
          onClick={() => (step === 1 ? onCancel() : setStep(1))}
          className={`p-2 -ml-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <span className={`font-semibold text-sm ${isDark ? 'text-white' : 'text-slate-800'}`}>
          {t(`report.step${step}` as 'report.step1' | 'report.step2', lang)}
        </span>
        <div className="w-10" />
      </motion.div>

      <div className={`${isDark ? 'bg-slate-800' : 'bg-slate-100'} h-1 w-full`}>
        <div className="bg-primary h-full transition-all duration-300 ease-out" style={{ width: `${(step / 2) * 100}%` }} />
      </div>

      <div className="p-6 overflow-y-auto flex-1">
        {step === 1 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-5">
            <div>
              <label
                className={`block text-sm font-semibold mb-2 flex items-center gap-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}
              >
                <Tag className="w-4 h-4 text-primary" /> {lang === 'tr' ? 'Kategori' : 'Category'}
              </label>
              {categories.length === 0 ? (
                <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                  {lang === 'tr' ? 'Kategoriler yÃ¼kleniyorâ€¦' : 'Loading categoriesâ€¦'}
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {categories.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setCategoryId(cat.id)}
                      className={`rounded-xl border px-3 py-2 text-xs font-semibold transition-colors ${
                        categoryId === cat.id
                          ? 'border-primary bg-primary text-white'
                          : isDark
                            ? 'border-slate-600 bg-slate-800 text-slate-300 hover:border-primary/50'
                            : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-primary/40'
                      }`}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label
                className={`block text-sm font-semibold mb-2 flex items-center gap-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}
              >
                <MapPin className="w-4 h-4 text-primary" /> {t('report.location', lang)}
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={locating ? t('report.location.detecting', lang) : locationText}
                  readOnly
                  placeholder={t('report.location', lang)}
                  className={`flex-1 border rounded-xl px-4 py-3 text-sm outline-none ${
                    isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'
                  }`}
                />
                <button
                  type="button"
                  onClick={handleGetLocation}
                  disabled={locating}
                  className="bg-primary text-white px-4 rounded-xl flex items-center gap-2 text-sm font-medium active:scale-95 transition-all disabled:opacity-60"
                >
                  <Navigation className={`w-4 h-4 ${locating ? 'animate-spin' : ''}`} />
                </button>
              </div>

              {resolvedMunicipality && (
                <div
                  className={`mt-2 flex items-center gap-2 text-xs font-medium px-3 py-2 rounded-lg ${isDark ? 'bg-primary/20 text-secondary' : 'bg-primary/10 text-primary'}`}
                >
                  <Building2 className="w-3.5 h-3.5 shrink-0" />
                  <span>
                    {t('report.municipality.resolved', lang)}: <strong>{resolvedMunicipality.displayName}</strong>
                  </span>
                </div>
              )}

              {latitude != null && longitude != null && !resolvedMunicipality && !locating && (
                <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">{t('report.municipality.outside', lang)}</p>
              )}
            </div>

            <div>
              <label
                className={`block text-sm font-semibold mb-2 flex items-center gap-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}
              >
                <Camera className="w-4 h-4 text-primary" /> {t('report.photo', lang)}
              </label>
              <label
                className={`w-full aspect-[21/9] border-2 border-dashed rounded-2xl flex flex-col items-center justify-center transition-colors cursor-pointer overflow-hidden relative ${
                  isDark
                    ? 'bg-slate-800 border-slate-700 text-slate-500 hover:text-secondary hover:border-primary'
                    : 'bg-slate-50 border-slate-300 text-slate-400 hover:text-primary hover:border-primary'
                }`}
              >
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={async (e) => {
                    if (e.target.files && e.target.files[0]) {
                      setIsUploading(true);
                      try {
                        const urls = await uploadMedia(e.target.files[0]);
                        if (urls.length > 0) setMediaUrl(urls[0]);
                      } catch (err: unknown) {
                        setError(err instanceof Error ? err.message : lang === 'tr' ? 'FotoÄŸraf yÃ¼klenemedi' : 'Upload failed');
                      } finally {
                        setIsUploading(false);
                      }
                    }
                  }}
                  disabled={isUploading}
                />
                {isUploading ? (
                  <div className="flex flex-col items-center">
                    <motion.div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mb-2"></motion.div>
                    <span className="text-sm font-medium">YÃ¼kleniyor...</span>
                  </div>
                ) : mediaUrl ? (
                  <img src={resolveMediaUrl(mediaUrl)} alt="Uploaded" className="w-full h-full object-cover" />
                ) : (
                  <>
                    <Camera className="w-8 h-8 mb-2" />
                    <span className="text-sm font-medium">{t('report.photo.btn', lang)}</span>
                  </>
                )}
              </label>
            </div>

            <div>
              <label
                className={`block text-sm font-semibold mb-2 flex items-center gap-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}
              >
                <FileText className="w-4 h-4 text-primary" /> {t('report.description', lang)}
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                placeholder={t('report.description.placeholder', lang)}
                className={`w-full border rounded-xl px-4 py-3 text-sm outline-none transition-all resize-none ${
                  isDark ? 'bg-slate-800 border-slate-700 text-white focus:border-primary' : 'bg-slate-50 border-slate-200 focus:ring-2 focus:ring-primary'
                }`}
              />
            </div>

            {error && step === 1 && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm p-3 rounded-xl">
                {error}
              </div>
            )}
          </motion.div>
        )}

        {step === 2 && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-6">
            <div
              className={`border rounded-xl p-4 text-sm ${isDark ? 'bg-primary/15 border-primary/30 text-secondary' : 'bg-primary/5 border-primary/20 text-primary'}`}
            >
              <p className="font-semibold mb-1 flex items-center gap-2">
                <FileText className="w-4 h-4" /> {lang === 'tr' ? 'Bildirim Ã–zeti' : 'Report Summary'}
              </p>
              <p className="opacity-80">{lang === 'tr' ? 'LÃ¼tfen bilgilerinizi kontrol edin ve gÃ¶nderin.' : 'Please review and submit.'}</p>
            </div>

            <motion.div
              className={`p-5 rounded-2xl border font-sans text-sm font-medium leading-relaxed whitespace-pre-wrap shadow-sm relative ${
                isDark ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'
              }`}
            >
              {generatePreviewText()}
            </motion.div>

            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm p-3 rounded-xl">
                {error}
              </div>
            )}
          </motion.div>
        )}
      </div>

      <div className={`p-4 border-t ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
        {step < 2 ? (
          <button
            type="button"
            onClick={handleNext}
            disabled={!canProceed}
            className="w-full bg-primary text-white rounded-xl py-3.5 font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95 shadow-md shadow-primary/20 dark:shadow-none"
          >
            {t('report.next', lang)} <ArrowRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="w-full bg-primary text-white rounded-xl py-3.5 font-semibold text-sm flex items-center justify-center gap-2 active:scale-95 shadow-md shadow-primary/20 dark:shadow-none disabled:opacity-70"
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> {t('report.submitting', lang)}
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5" /> {t('report.submit', lang)}
              </span>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
