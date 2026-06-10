import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { ArrowRight, Building2, Camera, CheckCircle2, ChevronLeft, Navigation } from 'lucide-react';
import {
  analyzeReportDraft,
  createReport,
  fetchNearbyReportHints,
  getCategories,
  getReportTemplates,
  resolveMediaUrl,
  resolveMunicipalityByGps,
  uploadMedia,
  type ApiCategory,
  type ApiReportTemplate,
  type NearbyReportHint,
  type PublicDepartment,
  type PublicTenant,
  type ReportDraftAnalysis,
} from '../../api';
import { Lang, t } from '../../i18n';
import { captureReportPhotoFile, PhotoCaptureCancelledError, type CaptureResult } from '../../lib/captureReportPhoto';
import ReportAiScanOverlay from '../ReportAiScanOverlay';

interface NewReportProps {
  defaultMunicipality?: PublicTenant | null;
  defaultDepartment?: PublicDepartment | null;
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
  return combined.length >= 10 ? combined : `${prefix} - ${new Date().toLocaleDateString(lang === 'tr' ? 'tr-TR' : 'en-US')}`;
}

export default function NewReport({
  defaultMunicipality,
  defaultDepartment,
  onSubmit,
  onCancel,
  lang,
  isDark,
}: NewReportProps) {
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
  const [capturedFile, setCapturedFile] = useState<File | null>(null);
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
  const [kvkkApproved, setKvkkApproved] = useState(false);

  const municipalityLocked = Boolean(defaultMunicipality?.id);
  const activeDepartment =
    defaultDepartment &&
    defaultMunicipality?.id &&
    resolvedMunicipality?.id === defaultMunicipality.id
      ? defaultDepartment
      : null;

  useEffect(() => {
    if (defaultMunicipality?.onboarded && defaultMunicipality.id && !resolvedMunicipality) {
      setResolvedMunicipality(defaultMunicipality);
    }
  }, [defaultMunicipality, resolvedMunicipality]);

  useEffect(() => {
    return () => {
      if (localPhotoPreview && localPhotoPreview.startsWith('blob:')) {
        URL.revokeObjectURL(localPhotoPreview);
      }
    };
  }, [localPhotoPreview]);

  const minDescriptionLen = 20;
  const descriptionTooShort = description.trim().length > 0 && description.trim().length < minDescriptionLen;

  useEffect(() => {
    if (!navigator.geolocation) {
      return;
    }

    setLocating(true);
    setError('');
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setLatitude(lat);
        setLongitude(lng);
        setLocationText(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);

        if (defaultMunicipality?.id) {
          setResolvedMunicipality(defaultMunicipality);
          setError('');
          setLocating(false);
          return;
        }

        const municipality = await resolveMunicipalityByGps(lat, lng);
        setResolvedMunicipality(municipality);
        if (!municipality) {
          setError(t('report.municipality.outside', lang));
        }
        setLocating(false);
      },
      () => {
        setLocating(false);
        setError(t('report.location.denied', lang));
      },
      { enableHighAccuracy: true, timeout: 15000 },
    );
  }, [defaultMunicipality?.id, lang]);

  useEffect(() => {
    if (!resolvedMunicipality?.id) {
      setCategories([]);
      setCategoryId('');
      return;
    }

    let cancelled = false;
    getCategories(resolvedMunicipality.id, activeDepartment?.id)
      .then((cats) => {
        if (cancelled) return;
        setCategories(cats);
        const other = cats.find((category) => /diger|other/i.test(category.name.toLowerCase()));
        setCategoryId(other?.id ?? cats[0]?.id ?? '');
      })
      .catch(() => {
        if (!cancelled) {
          setError(lang === 'tr' ? 'Kategoriler yuklenemedi.' : 'Could not load categories.');
        }
      });

    return () => {
      cancelled = true;
    };
  }, [activeDepartment?.id, lang, resolvedMunicipality?.id]);

  useEffect(() => {
    if (!resolvedMunicipality) {
      setTemplates([]);
      setSelectedTemplateKey(null);
      return;
    }

    let cancelled = false;
    setTemplatesLoading(true);
    const tenant = resolvedMunicipality.slug ? { slug: resolvedMunicipality.slug } : { id: resolvedMunicipality.id };

    getReportTemplates(tenant, {
      departmentSlug: activeDepartment?.slug,
      departmentId: activeDepartment?.id,
    })
      .then((rows) => {
        if (!cancelled) {
          setTemplates(rows);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setTemplates([]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setTemplatesLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [activeDepartment?.id, activeDepartment?.slug, resolvedMunicipality]);

  const applyTemplate = (template: ApiReportTemplate) => {
    setDescription(template.descriptionTemplate);
    setSelectedTemplateKey(template.templateKey);
    if (template.categoryId) {
      setCategoryId(template.categoryId);
    }
  };

  const selectedCategory = categories.find((category) => category.id === categoryId);

  const handleCapturePhoto = async () => {
    if (isUploading) return;
    setError('');

    try {
      const { file, previewUrl } = await captureReportPhotoFile();
      if (localPhotoPreview && !localPhotoPreview.startsWith('http')) {
        URL.revokeObjectURL(localPhotoPreview);
      }
      setLocalPhotoPreview(previewUrl);
      setCapturedFile(file);
      setIsUploading(true);

      const urls = await uploadMedia(file);
      if (urls.length === 0) {
        return;
      }
      setMediaUrl(urls[0]);
    } catch (err: unknown) {
      if (err instanceof PhotoCaptureCancelledError) return;
      setError(err instanceof Error ? err.message : lang === 'tr' ? 'Fotograf yuklenemedi.' : 'Upload failed.');
      setMediaUrl(null);
    } finally {
      setIsUploading(false);
    }
  };

  const resolveMunicipalityAt = async (lat: number, lng: number) => {
    if (defaultMunicipality?.id) {
      setResolvedMunicipality(defaultMunicipality);
      setError('');
      return defaultMunicipality;
    }

    const municipality = await resolveMunicipalityByGps(lat, lng);
    setResolvedMunicipality(municipality);
    if (!municipality) {
      setError(t('report.municipality.outside', lang));
    } else {
      setError('');
    }
    return municipality;
  };

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      setError(t('report.location.needGps', lang));
      return;
    }

    setLocating(true);
    setError('');
    if (!municipalityLocked) {
      setResolvedMunicipality(null);
    }

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
          ? `Aciklama en az ${minDescriptionLen} karakter olmalidir.`
          : `Description must be at least ${minDescriptionLen} characters.`,
      );
      return;
    }

    if (step !== 1 || latitude === null || longitude === null || !categoryId || !resolvedMunicipality) {
      return;
    }

    try {
      const hints = await fetchNearbyReportHints(latitude, longitude, resolvedMunicipality.id, 75);
      const matchingCategoryHints = hints.filter(
        (hint) => hint.categoryName?.trim().toLowerCase() === selectedCategory?.name?.trim().toLowerCase()
      );
      if (matchingCategoryHints.length > 0) {
        setNearbyHints(matchingCategoryHints);
        setShowDuplicateModal(true);
        return;
      }
    } catch {
      // Ignore duplicate lookup issues and continue.
    }

    // Trigger AI analysis before proceeding
    if (mediaUrl && categoryId) {
      setAiScanOpen(true);
      setAiAnalysisLoading(true);
      setAiAnalysis(null);
      const category = categories.find((item) => item.id === categoryId);
      const title = buildReportTitle(description, category?.name, lang);
      try {
        const result = await analyzeReportDraft({
          categoryId,
          title,
          description: description.trim() || undefined,
          contentLanguage: lang,
          mediaUrl,
        });
        setAiAnalysis(result);
      } catch {
        // AI analysis failed — proceed without it
        setAiScanOpen(false);
        proceedToSummary();
        return;
      } finally {
        setAiAnalysisLoading(false);
      }
      // The overlay's onDone will call proceedToSummary
    } else {
      proceedToSummary();
    }
  };

  const handleSubmit = async () => {
    if (latitude === null || longitude === null || !categoryId || !resolvedMunicipality) {
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const finalTitle = buildReportTitle(description, selectedCategory?.name, lang);
      await createReport(
        finalTitle,
        description,
        categoryId,
        latitude,
        longitude,
        resolvedMunicipality.displayName,
        mediaUrl ? [mediaUrl] : [],
        resolvedMunicipality.id,
        kvkkApproved,
      );
      onSubmit();
    } catch (err: unknown) {
      // Offline fallback: save to localStorage queue
      if (!navigator.onLine || (err instanceof TypeError && err.message.includes('fetch'))) {
        try {
          const offlineReports = JSON.parse(localStorage.getItem('belediye_offline_reports') || '[]');
          offlineReports.push({
            title: buildReportTitle(description, selectedCategory?.name, lang),
            description,
            categoryId,
            latitude,
            longitude,
            district: resolvedMunicipality?.displayName ?? null,
            mediaUrl: mediaUrl || null,
            targetMunicipalityId: resolvedMunicipality?.id || null,
            kvkkApproved,
            savedAt: new Date().toISOString(),
          });
          localStorage.setItem('belediye_offline_reports', JSON.stringify(offlineReports));
          alert(lang === 'tr'
            ? 'İnternet bağlantınız yok. Raporunuz cihazınıza kaydedildi ve bağlantı sağlandığında otomatik gönderilecek.'
            : 'You are offline. Your report has been saved locally and will be submitted when you reconnect.');
          onSubmit();
          return;
        } catch {
          // localStorage failure — fall through to show normal error
        }
      }
      const message =
        err instanceof Error
          ? err.message
          : lang === 'tr'
            ? 'Rapor gonderilemedi. Internet baglantinizi kontrol edin.'
            : 'Could not submit. Check your connection.';
      setError(message);
      setIsSubmitting(false);
    }
  };

  const municipalityLabel = resolvedMunicipality?.displayName ?? '-';
  const departmentLabel = activeDepartment?.name ?? '-';
  const departmentScopeTitle = lang === 'tr' ? 'Departman kapsami aktif' : 'Department scope active';
  const departmentScopeDescription =
    lang === 'tr'
      ? 'Bu bildirim secili departman akisina gore filtrelenir ve ilgili ekip sablonlari once cikar.'
      : 'This report is filtered for the selected department and prioritizes that team templates.';
  const departmentRowLabel = lang === 'tr' ? 'Departman' : 'Department';

  const previewRow = (label: string, value: string) => (
    <div className={`flex gap-3 border-b py-3 last:border-0 ${isDark ? 'border-slate-700' : 'border-slate-100'}`}>
      <span className={`w-24 shrink-0 text-xs font-semibold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{label}</span>
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
    <div className={`flex h-full flex-col ${isDark ? 'bg-slate-900' : 'bg-white'}`}>
      <motion.div className={`flex items-center justify-between border-b p-4 ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
        <button
          type="button"
          onClick={() => (step === 1 ? onCancel() : setStep(1))}
          className={`-ml-2 p-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
        <div className="text-center">
          <p className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-slate-800'}`}>
            {t('report.screenTitle', lang)}
          </p>
          <p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            {step === 2 ? t('report.step2.short', lang) : t('report.stepProgress', lang, { current: step, total: 2 })}
          </p>
        </div>
        <div className="w-10" />
      </motion.div>

      <div className={`h-1 w-full ${isDark ? 'bg-slate-800' : 'bg-slate-100'}`}>
        <div className="h-full bg-primary transition-all duration-300 ease-out" style={{ width: `${(step / 2) * 100}%` }} />
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {step === 1 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-5">
            {activeDepartment && (
              <div
                className={`rounded-2xl border px-4 py-3 ${
                  isDark ? 'border-slate-700 bg-slate-800/80 text-slate-200' : 'border-slate-200 bg-slate-50 text-slate-700'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`mt-0.5 rounded-xl p-2 ${isDark ? 'bg-primary/15 text-secondary' : 'bg-primary/10 text-primary'}`}>
                    <Building2 className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">{departmentScopeTitle}</p>
                    <p className={`mt-1 text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{departmentScopeDescription}</p>
                    <div className="mt-2 flex flex-wrap gap-2 text-[11px] font-semibold">
                      <span className={`rounded-full px-2.5 py-1 ${isDark ? 'bg-slate-700 text-slate-200' : 'bg-white text-slate-700'}`}>
                        {resolvedMunicipality?.displayName ?? defaultMunicipality?.displayName}
                      </span>
                      <span className={`rounded-full px-2.5 py-1 ${isDark ? 'bg-primary/15 text-secondary' : 'bg-primary/10 text-primary'}`}>
                        {activeDepartment.name}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {resolvedMunicipality && (templates.length > 0 || templatesLoading) && (
              <div>
                <label className={`mb-2 block text-sm font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  {t('report.templates', lang)}
                </label>
                <p className={`mb-2 text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{t('report.templates.hint', lang)}</p>
                {templatesLoading ? (
                  <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    {lang === 'tr' ? 'Sablonlar yukleniyor...' : 'Loading templates...'}
                  </p>
                ) : (
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {templates.map((template) => (
                      <button
                        key={template.id}
                        type="button"
                        onClick={() => applyTemplate(template)}
                        className={`shrink-0 rounded-xl border px-3 py-2 text-left text-xs transition-colors ${
                          selectedTemplateKey === template.templateKey
                            ? 'border-primary bg-primary text-white'
                            : isDark
                              ? 'border-slate-600 bg-slate-800 text-slate-200 hover:border-primary/50'
                              : 'border-slate-200 bg-white text-slate-700 hover:border-primary/40'
                        }`}
                      >
                        <span className="block font-bold">{template.title}</span>
                        <span
                          className={`mt-0.5 block text-[10px] opacity-80 ${
                            selectedTemplateKey === template.templateKey ? '' : 'text-slate-500'
                          }`}
                        >
                          {template.categoryName}
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
                <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  {lang === 'tr' ? 'Konum alindiktan sonra kategoriler yuklenecek.' : 'Categories load after location is set.'}
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {categories.map((category) => (
                    <button
                      key={category.id}
                      type="button"
                      onClick={() => setCategoryId(category.id)}
                      className={`rounded-xl border px-3 py-2 text-xs font-semibold transition-colors ${
                        categoryId === category.id
                          ? 'border-primary bg-primary text-white'
                          : isDark
                            ? 'border-slate-600 bg-slate-800 text-slate-300 hover:border-primary/50'
                            : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-primary/40'
                      }`}
                    >
                      {category.name}
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
                  className={`flex-1 rounded-xl border px-4 py-3 text-sm outline-none ${
                    isDark ? 'border-slate-700 bg-slate-800 text-white' : 'border-slate-200 bg-slate-50'
                  }`}
                />
                <button
                  type="button"
                  onClick={handleGetLocation}
                  disabled={locating}
                  className="flex items-center gap-2 rounded-xl bg-primary px-4 text-sm font-medium text-white transition-all active:scale-95 disabled:opacity-60"
                >
                  <Navigation className={`h-4 w-4 ${locating ? 'animate-spin' : ''}`} />
                </button>
              </div>

              {locating && (
                <div className={`mt-2 flex items-center gap-2 rounded-lg px-3 py-2 text-xs ${isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>
                  <div className="h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  <span>{lang === 'tr' ? 'Konumunuz tespit ediliyor...' : 'Detecting your location...'}</span>
                </div>
              )}

              {resolvedMunicipality && (
                <div
                  className={`mt-2 flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium ${
                    isDark ? 'bg-primary/20 text-secondary' : 'bg-primary/10 text-primary'
                  }`}
                >
                  <Building2 className="h-3.5 w-3.5 shrink-0" />
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
                    ? 'border-slate-700 bg-slate-800 text-slate-500 hover:border-primary hover:text-secondary'
                    : 'border-slate-300 bg-slate-50 text-slate-400 hover:border-primary hover:text-primary'
                }`}
              >
                {isUploading ? (
                  <div className="flex flex-col items-center">
                    <span className="text-sm font-medium">{t('report.uploading', lang)}</span>
                  </div>
                ) : localPhotoPreview || mediaUrl ? (
                  <>
                    <img
                      src={localPhotoPreview || resolveMediaUrl(mediaUrl!)}
                      alt={lang === 'tr' ? 'Yuklenen fotograf' : 'Uploaded photo'}
                      className="absolute inset-0 h-full w-full object-cover"
                    />

                  </>
                ) : (
                  <>
                    <Camera className="mb-2 h-8 w-8" />
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
                onChange={(event) => setDescription(event.target.value)}
                rows={4}
                placeholder={t('report.description.placeholder', lang)}
                className={`w-full resize-none rounded-xl border px-4 py-3 text-sm outline-none transition-all ${
                  isDark
                    ? 'border-slate-700 bg-slate-800 text-white focus:border-primary'
                    : 'border-slate-200 bg-slate-50 focus:ring-2 focus:ring-primary'
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

            {error && (
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
                {activeDepartment && previewRow(departmentRowLabel, departmentLabel)}
                {previewRow(
                  t('report.preview.photo', lang),
                  mediaUrl || localPhotoPreview
                    ? lang === 'tr'
                      ? 'Eklendi'
                      : 'Attached'
                    : t('report.preview.noPhoto', lang),
                )}
              </motion.div>
              {(localPhotoPreview || mediaUrl) && (
                <img src={localPhotoPreview || resolveMediaUrl(mediaUrl!)} alt="" className="h-36 w-full object-cover" />
              )}
              <motion.div className={`px-4 py-3 ${isDark ? 'bg-slate-800/80' : 'bg-slate-50'}`}>
                <p className={`mb-1 text-xs font-semibold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  {t('report.preview.description', lang)}
                </p>
                <p className={`text-sm leading-relaxed ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{description}</p>
              </motion.div>
            </motion.div>

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
                {error}
              </div>
            )}

            {/* KVKK onay */}
            <label className={`flex items-start gap-3 cursor-pointer rounded-xl border p-3 ${isDark ? 'border-slate-700 bg-slate-800/50' : 'border-slate-200 bg-slate-50'}`}>
              <input
                type="checkbox"
                checked={kvkkApproved}
                onChange={(e) => setKvkkApproved(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
              />
              <span className={`text-xs leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                {t('report.kvkkLabel', lang)}
              </span>
            </label>
          </motion.div>
        )}
      </div>

      <div className={`border-t p-4 ${isDark ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-white'}`}>
        {step < 2 ? (
          <button
            type="button"
            onClick={handleNext}
            disabled={!canProceed}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-sm font-semibold text-white shadow-md shadow-primary/20 disabled:opacity-50 active:scale-95 dark:shadow-none"
          >
            {t('report.next', lang)} <ArrowRight className="h-4 w-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || !kvkkApproved}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-sm font-semibold text-white shadow-md shadow-primary/20 active:scale-95 disabled:opacity-70 dark:shadow-none"
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                {t('report.submitting', lang)}
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5" /> {t('report.submit', lang)}
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
        onDone={() => { setAiScanOpen(false); proceedToSummary(); }}
      />

      {showDuplicateModal && nearbyHints.length > 0 && (
        <div className="fixed inset-0 z-[90] flex items-end justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className={`w-full max-w-md rounded-2xl border p-5 shadow-xl ${isDark ? 'border-slate-700 bg-slate-900' : 'border-slate-200 bg-white'}`}>
            <p className="text-sm font-bold text-slate-900 dark:text-white">
              {lang === 'tr' ? 'Yakinda benzer ihbar var' : 'Similar report nearby'}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {lang === 'tr'
                ? `Bu konumda yaklasik ${Math.round(nearbyHints[0].distanceMeters)} m otede zaten bir ihbar var.`
                : `A report exists about ${Math.round(nearbyHints[0].distanceMeters)} m away.`}
            </p>
            <ul className="mt-3 space-y-2">
              {nearbyHints.slice(0, 3).map((hint) => (
                <li key={hint.id} className="rounded-lg border border-slate-200 px-3 py-2 text-xs dark:border-slate-700">
                  <span className="font-semibold">{hint.title}</span>
                  <span className="text-slate-500"> · {hint.categoryName}</span>
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
