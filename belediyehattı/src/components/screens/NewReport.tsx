import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Camera, CheckCircle2, ChevronLeft, ArrowRight, Building2, Navigation } from 'lucide-react';
import {
  getCategories,
  getReportTemplates,
  createReport,
  uploadMedia,
  resolveMediaUrl,
  resolveMunicipalityByGps,
  fetchNearbyReportHints,
  analyzeReportDraft,
  type ApiCategory,
  type ApiReportTemplate,
  type NearbyReportHint,
  type PublicTenant,
  type ReportDraftAnalysis,
} from '../../api';
import { Lang, t } from '../../i18n';
import { captureReportPhotoFile, PhotoCaptureCancelledError } from '../../lib/captureReportPhoto';
import ReportAiScanOverlay from '../ReportAiScanOverlay';

interface NewReportProps {
  defaultMunicipality?: PublicTenant | null;
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
  return combined.length >= 10 ? combined : `${prefix} — ${new Date().toLocaleDateString(lang === 'tr' ? 'tr-TR' : 'en-US')}`;
}

export default function NewReport({ defaultMunicipality, onSubmit, onCancel, lang, isDark }: NewReportProps) {
  const [step, setStep] = useState(1);
  const [description, setDescription] = useState('');
  const [categories, setCategories] = useState<ApiCategory[]>([]);
  const [categoryId, setCategoryId] = useState('');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [locationText, setLocationText] = useState('');
  const [resolvedMunicipality, setResolvedMunicipality] = useState<PublicTenant | null>(null);
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [localPhotoPreview, setLocalPhotoPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [locating, setLocating] = useState(false);
  const [templates, setTemplates] = useState<ApiReportTemplate[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [selectedTemplateKey, setSelectedTemplateKey] = useState<string | null>(null);
  const [aiScanOpen, setAiScanOpen] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<ReportDraftAnalysis | null>(null);
  const [aiAnalysisLoading, setAiAnalysisLoading] = useState(false);
  const [nearbyHints, setNearbyHints] = useState<NearbyReportHint[]>([]);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);

  useEffect(() => {
    if (defaultMunicipality?.onboarded && defaultMunicipality.id && !resolvedMunicipality) {
      setResolvedMunicipality(defaultMunicipality);
    }
  }, [defaultMunicipality, resolvedMunicipality]);

  useEffect(() => {
    return () => {
      if (localPhotoPreview) URL.revokeObjectURL(localPhotoPreview);
    };
  }, [localPhotoPreview]);

  const minDescriptionLen = 20;
  const descriptionTooShort = description.trim().length > 0 && description.trim().length < minDescriptionLen;

  // Ekran acilir acilmaz GPS al ve belediyeyi otomatik tespit et
  useEffect(() => {
    if (navigator.geolocation) {
      setLocating(true);
      setError('');
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          setLatitude(lat);
          setLongitude(lng);
          setLocationText(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
          const m = await resolveMunicipalityByGps(lat, lng);
          setResolvedMunicipality(m);
          if (!m) setError(t('report.municipality.outside', lang));
          setLocating(false);
        },
        () => {
          setLocating(false);
          setError(t('report.location.denied', lang));
        },
        { enableHighAccuracy: true, timeout: 15000 },
      );
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  useEffect(() => {
    if (!resolvedMunicipality) {
      setTemplates([]);
      setSelectedTemplateKey(null);
      return;
    }
    let cancelled = false;
    setTemplatesLoading(true);
    const tenant = resolvedMunicipality.slug
      ? { slug: resolvedMunicipality.slug }
      : { id: resolvedMunicipality.id };
    getReportTemplates(tenant)
      .then((rows) => {
        if (!cancelled) setTemplates(rows);
      })
      .catch(() => {
        if (!cancelled) setTemplates([]);
      })
      .finally(() => {
        if (!cancelled) setTemplatesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [resolvedMunicipality]);

  const applyTemplate = (tpl: ApiReportTemplate) => {
    setDescription(tpl.descriptionTemplate);
    setSelectedTemplateKey(tpl.templateKey);
    if (tpl.categoryId) {
      setCategoryId(tpl.categoryId);
    }
  };

  const selectedCategory = categories.find((c) => c.id === categoryId);

  const handleCapturePhoto = async () => {
    if (isUploading) return;
    setError('');
    try {
      const file = await captureReportPhotoFile();
      if (localPhotoPreview) URL.revokeObjectURL(localPhotoPreview);
      setLocalPhotoPreview(URL.createObjectURL(file));
      setIsUploading(true);
      const urls = await uploadMedia(file);
      if (urls.length > 0) {
        const url = urls[0];
        setMediaUrl(url);
        if (categoryId) {
          setAiScanOpen(true);
          setAiAnalysisLoading(true);
          setAiAnalysis(null);
          const cat = categories.find((c) => c.id === categoryId);
          const title = buildReportTitle(description, cat?.name, lang);
          try {
            const result = await analyzeReportDraft({
              categoryId,
              title,
              description: description.trim() || undefined,
              contentLanguage: lang,
              mediaUrl: url,
            });
            setAiAnalysis(result);
          } catch {
            setAiScanOpen(false);
          } finally {
            setAiAnalysisLoading(false);
          }
        }
      }
    } catch (err: unknown) {
      if (err instanceof PhotoCaptureCancelledError) return;
      setError(err instanceof Error ? err.message : lang === 'tr' ? 'Fotoğraf yüklenemedi' : 'Upload failed');
      setMediaUrl(null);
    } finally {
      setIsUploading(false);
    }
  };

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

  const proceedToSummary = () => setStep(2);

  const handleNext = async () => {
    if (description.trim().length < minDescriptionLen) {
      setError(
        lang === 'tr'
          ? `Açıklama en az ${minDescriptionLen} karakter olmalıdır.`
          : `Description must be at least ${minDescriptionLen} characters.`,
      );
      return;
    }
    if (step !== 1 || latitude === null || longitude === null || !categoryId || !resolvedMunicipality) {
      return;
    }
    try {
      const hints = await fetchNearbyReportHints(latitude, longitude, resolvedMunicipality.id, 75);
      if (hints.length > 0) {
        setNearbyHints(hints);
        setShowDuplicateModal(true);
        return;
      }
    } catch {
      /* devam */
    }
    proceedToSummary();
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
            ? 'Rapor gönderilemedi. İnternet bağlantınızı kontrol edin.'
            : 'Could not submit. Check your connection.';
      setError(msg);
      setIsSubmitting(false);
    }
  };

  const municipalityLabel = resolvedMunicipality?.displayName ?? '—';

  const previewRow = (label: string, value: string) => (
    <div className={`flex gap-3 border-b py-3 last:border-0 ${isDark ? 'border-slate-700' : 'border-slate-100'}`}>
      <span className={`w-24 shrink-0 text-xs font-semibold ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{label}</span>
      <span className={`min-w-0 flex-1 text-sm font-medium ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{value}</span>
</div>
  );

  const canProceed =
    description.trim().length >= minDescriptionLen &&
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
        <div className="text-center">
          <p className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-slate-800'}`}>
            {t('report.screenTitle', lang)}
          </p>
          <p className={`text-[11px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
            {step === 2 ? t('report.step2.short', lang) : t('report.stepProgress', lang, { current: step, total: 2 })}
          </p>
        </div>
        <div className="w-10" />
      </motion.div>

      <div className={`${isDark ? 'bg-slate-800' : 'bg-slate-100'} h-1 w-full`}>
        <div className="bg-primary h-full transition-all duration-300 ease-out" style={{ width: `${(step / 2) * 100}%` }} />
      </div>

      <div className="p-6 overflow-y-auto flex-1">
        {step === 1 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-5">
            {resolvedMunicipality && (templates.length > 0 || templatesLoading) && (
              <div>
                <label className={`mb-2 block text-sm font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  {t('report.templates', lang)}
                </label>
                <p className={`mb-2 text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{t('report.templates.hint', lang)}</p>
                {templatesLoading ? (
                  <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                    {lang === 'tr' ? 'Şablonlar yükleniyor…' : 'Loading templates…'}
                  </p>
                ) : (
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {templates.map((tpl) => (
                      <button
                        key={tpl.id}
                        type="button"
                        onClick={() => applyTemplate(tpl)}
                        className={`shrink-0 rounded-xl border px-3 py-2 text-left text-xs transition-colors ${
                          selectedTemplateKey === tpl.templateKey
                            ? 'border-primary bg-primary text-white'
                            : isDark
                              ? 'border-slate-600 bg-slate-800 text-slate-200 hover:border-primary/50'
                              : 'border-slate-200 bg-white text-slate-700 hover:border-primary/40'
                        }`}
                      >
                        <span className="block font-bold">{tpl.title}</span>
                        <span
                          className={`mt-0.5 block text-[10px] opacity-80 ${selectedTemplateKey === tpl.templateKey ? '' : 'text-slate-500'}`}
                        >
                          {tpl.categoryName}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div>
              <label className={`mb-2 block text-sm font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                {t('report.preview.category', lang)}
              </label>
              {categories.length === 0 ? (
                <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                  {lang === 'tr' ? 'Konum alındıktan sonra kategoriler yüklenecek.' : 'Categories load after location is set.'}
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
              <label className={`mb-2 block text-sm font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                {t('report.location', lang)}
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

              {locating && (
                <div className={`mt-2 flex items-center gap-2 text-xs px-3 py-2 rounded-lg ${isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>
                  <div className="w-3.5 h-3.5 border-2 border-primary border-t-transparent rounded-full animate-spin shrink-0" />
                  <span>{lang === 'tr' ? 'Konumunuz tespit ediliyor…' : 'Detecting your location…'}</span>
                </div>
              )}

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
                <motion.div
                  className={`mt-3 flex gap-3 rounded-xl border p-3 text-xs font-medium ${
                    isDark ? 'border-amber-800/60 bg-amber-950/50 text-amber-100' : 'border-amber-200 bg-amber-50 text-amber-900'
                  }`}
                >
                  <Building2 className="mt-0.5 h-4 w-4 shrink-0" />
                  <p>{t('report.municipality.outside', lang)}</p>
                </motion.div>
              )}
            </div>

            <div>
              <label className={`mb-2 block text-sm font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                {t('report.photo', lang)}
              </label>
              <button
                type="button"
                onClick={() => void handleCapturePhoto()}
                disabled={isUploading}
                className={`relative flex aspect-[4/3] max-h-48 w-full flex-col items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed transition-colors disabled:opacity-60 ${
                  isDark
                    ? 'bg-slate-800 border-slate-700 text-slate-500 hover:text-secondary hover:border-primary'
                    : 'bg-slate-50 border-slate-300 text-slate-400 hover:text-primary hover:border-primary'
                }`}
              >
                {isUploading ? (
                  <div className="flex flex-col items-center">
                    <motion.div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mb-2"></motion.div>
                    <span className="text-sm font-medium">{t('report.uploading', lang)}</span>
                  </div>
                ) : localPhotoPreview || mediaUrl ? (
                  <>
                    <img
                      src={localPhotoPreview || resolveMediaUrl(mediaUrl!)}
                      alt={lang === 'tr' ? 'Yüklenen fotoğraf' : 'Uploaded photo'}
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                    <div
                      className="pointer-events-none absolute inset-0 grid grid-cols-3 grid-rows-3 border border-white/40"
                      aria-hidden
                    >
                      {Array.from({ length: 9 }).map((_, i) => (
                        <span key={i} className="border border-white/25" />
                      ))}
                    </div>
                    <p className="pointer-events-none absolute bottom-2 left-2 right-2 rounded-lg bg-black/50 px-2 py-1 text-center text-[10px] font-semibold text-white">
                      {lang === 'tr' ? 'Sorunu çerçevenin içine alın' : 'Frame the issue in view'}
                    </p>
                  </>
                ) : (
                  <>
                    <Camera className="w-8 h-8 mb-2" />
                    <span className="text-sm font-medium">{t('report.photo.btn', lang)}</span>
                  </>
                )}
              </button>
            </div>

            <div>
              <label className={`mb-2 block text-sm font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                {t('report.description', lang)}
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
              {descriptionTooShort && (
                <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                  {lang === 'tr'
                    ? `En az ${minDescriptionLen} karakter (${description.trim().length}/${minDescriptionLen})`
                    : `At least ${minDescriptionLen} characters (${description.trim().length}/${minDescriptionLen})`}
                </p>
              )}
            </div>

            {error && step === 1 && (
              <motion.div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
                {error}
              </motion.div>
            )}
          </motion.div>
        )}

        {step === 2 && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-4">
            <motion.div
              className={`overflow-hidden rounded-2xl border shadow-sm ${
                isDark ? 'border-slate-700 bg-slate-800' : 'border-slate-200 bg-white'
              }`}
            >
              <motion.div className="px-4 pt-3">
                {selectedCategory && (
                  <span className="inline-block rounded-lg bg-primary/15 px-2.5 py-1 text-xs font-bold text-primary dark:text-sky-300">
                    {selectedCategory.name}
                  </span>
                )}
              </motion.div>
              <motion.div className="px-4 pb-2">
                {previewRow(t('report.preview.location', lang), locationText || 'GPS')}
                {previewRow(t('report.preview.municipality', lang), municipalityLabel)}
                {previewRow(
                  t('report.preview.photo', lang),
                  mediaUrl || localPhotoPreview
                    ? lang === 'tr'
                      ? 'Eklendi'
                      : lang === 'ar'
                        ? 'مضافة'
                        : 'Attached'
                    : t('report.preview.noPhoto', lang),
                )}
              </motion.div>
              {(localPhotoPreview || mediaUrl) && (
                <img
                  src={localPhotoPreview || resolveMediaUrl(mediaUrl!)}
                  alt=""
                  className="h-36 w-full object-cover"
                />
              )}
              <motion.div className={`px-4 py-3 ${isDark ? 'bg-slate-800/80' : 'bg-slate-50'}`}>
                <p className={`mb-1 text-xs font-semibold ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                  {t('report.preview.description', lang)}
                </p>
                <p className={`text-sm leading-relaxed ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{description}</p>
              </motion.div>
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

      <ReportAiScanOverlay
        open={aiScanOpen}
        analysis={aiAnalysis}
        loading={aiAnalysisLoading}
        lang={lang}
        onDone={() => setAiScanOpen(false)}
      />

      {showDuplicateModal && nearbyHints.length > 0 && (
        <div className="fixed inset-0 z-[90] flex items-end justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className={`w-full max-w-md rounded-2xl border p-5 shadow-xl ${isDark ? 'border-slate-700 bg-slate-900' : 'border-slate-200 bg-white'}`}>
            <p className="text-sm font-bold text-slate-900 dark:text-white">
              {lang === 'tr' ? 'Yakında benzer ihbar var' : 'Similar report nearby'}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {lang === 'tr'
                ? `Bu konumda yaklaşık ${Math.round(nearbyHints[0].distanceMeters)} m ötede zaten bir ihbar var.`
                : `A report exists about ${Math.round(nearbyHints[0].distanceMeters)} m away.`}
            </p>
            <ul className="mt-3 space-y-2">
              {nearbyHints.slice(0, 3).map((h) => (
                <li key={h.id} className="rounded-lg border border-slate-200 px-3 py-2 text-xs dark:border-slate-700">
                  <span className="font-semibold">{h.title}</span>
                  <span className="text-slate-500"> · {h.categoryName}</span>
                </li>
              ))}
            </ul>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowDuplicateModal(false);
                  proceedToSummary();
                }}
                className="flex-1 rounded-xl bg-primary py-2.5 text-xs font-bold text-white"
              >
                {lang === 'tr' ? 'Yine de devam et' : 'Continue anyway'}
              </button>
              <button
                type="button"
                onClick={() => setShowDuplicateModal(false)}
                className="rounded-xl border border-slate-300 px-4 py-2.5 text-xs font-bold dark:border-slate-600"
              >
                {lang === 'tr' ? 'Geri' : 'Back'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
