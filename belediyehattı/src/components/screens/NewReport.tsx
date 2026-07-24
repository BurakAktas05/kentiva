import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowRight, Building2, Camera, CheckCircle2, ChevronLeft, Navigation, MapPin } from 'lucide-react';
import {
  getCategories,
  getReportTemplates,
  resolveMediaUrl,
  type ApiCategory,
  type ApiReportTemplate,
  type PublicDepartment,
  type PublicTenant,
} from '../../api';
import { Lang, t } from '../../i18n';
import ReportAiScanOverlay from '../ReportAiScanOverlay';
import { ReportMap } from '../common/ReportMap';
import { useReportLocation } from '../../hooks/useReportLocation';
import { useReportPhotos } from '../../hooks/useReportPhotos';
import { useReportSubmit } from '../../hooks/useReportSubmit';

interface NewReportProps {
  defaultMunicipality?: PublicTenant | null;
  defaultDepartment?: PublicDepartment | null;
  onSubmit: () => void;
  onCancel: () => void;
  lang: Lang;
  isDark: boolean;
}

export default function NewReport({
  defaultMunicipality,
  defaultDepartment,
  onSubmit,
  onCancel,
  lang,
  isDark,
}: NewReportProps) {
  const [step, setStep] = useState(0);
  const [description, setDescription] = useState('');
  const [categories, setCategories] = useState<ApiCategory[]>([]);
  const [categoryId, setCategoryId] = useState('');
  const [templates, setTemplates] = useState<ApiReportTemplate[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [selectedTemplateKey, setSelectedTemplateKey] = useState<string | null>(null);
  const [formError, setFormError] = useState('');

  const minDescriptionLen = 20;
  const descriptionTooShort = description.trim().length > 0 && description.trim().length < minDescriptionLen;

  // 1. Geolocation and region boundary tracking
  const {
    latitude,
    setLatitude,
    longitude,
    setLongitude,
    locationText,
    setLocationText,
    locating,
    error: locationError,
    resolvedMunicipality,
    nearbyReports,
    getPosition,
    resolveMunicipalityAt,
  } = useReportLocation({ defaultMunicipality, lang });

  const handleManualLocation = async (lat: number, lng: number) => {
    setLatitude(lat);
    setLongitude(lng);
    setLocationText(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
    await resolveMunicipalityAt(lat, lng);
  };

  // 2. Photo capturing and upload management
  const {
    mediaUrls,
    localPhotoPreviews,
    isUploading,
    error: photoError,
    handleCapturePhoto,
    handleRemovePhoto,
    maxPhotos,
  } = useReportPhotos({ lang });

  const selectedCategory = categories.find((category) => category.id === categoryId);

  // 3. Form validations, duplicate checks, and report submission
  const {
    isSubmitting,
    error: submitError,
    setError: setSubmitError,
    showDuplicateModal,
    setShowDuplicateModal,
    nearbyHints,
    kvkkApproved,
    setKvkkApproved,
    aiScanOpen,
    setAiScanOpen,
    aiAnalysis,
    aiAnalysisLoading,
    checkDuplicatesAndProceed,
    runAiAnalysis,
    submitReport,
  } = useReportSubmit({
    latitude,
    longitude,
    resolvedMunicipality,
    mediaUrls,
    description,
    categoryId,
    selectedCategoryName: selectedCategory?.name,
    lang,
    onSubmit,
    minDescriptionLen,
  });

  const municipalityLocked = Boolean(defaultMunicipality?.id);
  const activeDepartment =
    defaultDepartment &&
    defaultMunicipality?.id &&
    resolvedMunicipality?.id === defaultMunicipality.id
      ? defaultDepartment
      : null;

  // Categories load logic
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
          setFormError(lang === 'tr' ? 'Kategoriler yüklenemedi.' : 'Could not load categories.');
        }
      });

    return () => {
      cancelled = true;
    };
  }, [activeDepartment?.id, lang, resolvedMunicipality?.id]);

  // Templates load logic
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

  useEffect(() => {
    if (templates.length > 0 && categoryId && !selectedTemplateKey) {
      const catTemplates = templates.filter((t) => t.categoryId === categoryId);
      if (catTemplates.length > 0) {
        applyTemplate(catTemplates[0]);
      }
    }
  }, [templates, categoryId, selectedTemplateKey]);

  const proceedToSummary = () => setStep(2);

  const handleNext = async () => {
    setFormError('');
    if (description.trim().length < minDescriptionLen) {
      setFormError(
        lang === 'tr'
          ? `Aciklama en az ${minDescriptionLen} karakter olmalidir.`
          : `Description must be at least ${minDescriptionLen} characters.`,
      );
      return;
    }

    if (step !== 1 || latitude === null || longitude === null || !categoryId || !resolvedMunicipality) {
      return;
    }

    const validated = await checkDuplicatesAndProceed();
    if (!validated) return;

    if (mediaUrls.length > 0 && categoryId) {
      const analyzed = await runAiAnalysis();
      if (!analyzed) {
        proceedToSummary();
      }
    } else {
      proceedToSummary();
    }
  };

  const error = formError || locationError || photoError || submitError;
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

  const outsideMessage = t('report.municipality.outside', lang);
  const municipalityLookupFailed =
    !locating && !resolvedMunicipality && Boolean(locationError) && locationError !== outsideMessage;
  const isOutsideKentiva =
    !locating &&
    ((!resolvedMunicipality && locationError === outsideMessage) ||
      (Boolean(resolvedMunicipality) && !resolvedMunicipality?.onboarded));

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
          aria-label={lang === 'tr' ? 'Geri dön' : 'Go back'}
          onClick={() => {
            if (step === 0) onCancel();
            else if (step === 1) setStep(0);
            else setStep(1);
          }}
          className={`-ml-2 p-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
        <div className="text-center">
          <p className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-slate-800'}`}>
            {t('report.screenTitle', lang)}
          </p>
          <p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            {isOutsideKentiva 
              ? (lang === 'tr' ? 'Bölge Dışı' : 'Outside Area') 
              : step === 0 
                ? (lang === 'tr' ? 'Konum Doğrulama' : lang === 'ar' ? 'تأكيد الموقع' : 'Verify Location')
                : step === 2 
                  ? t('report.step2.short', lang) 
                  : t('report.stepProgress', lang, { current: step, total: 2 })}
          </p>
        </div>
        <div className="w-10" />
      </motion.div>

      {!isOutsideKentiva && (
        <div
          className={`h-1 w-full ${isDark ? 'bg-slate-800' : 'bg-slate-100'}`}
          role="progressbar"
          aria-label={lang === 'tr' ? 'İhbar oluşturma ilerlemesi' : 'Report creation progress'}
          aria-valuemin={1}
          aria-valuemax={3}
          aria-valuenow={step + 1}
        >
          <div className="h-full bg-primary transition-all duration-300 ease-out" style={{ width: `${(step / 2) * 100}%` }} />
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-6 flex flex-col">
        {isOutsideKentiva ? (
          <div className="flex flex-1 flex-col items-center justify-center p-4 text-center my-auto">
            <div className={`rounded-3xl border p-8 max-w-sm shadow-xl w-full transition-all ${
              isDark 
                ? 'border-amber-500/20 bg-slate-900/60 text-white' 
                : 'border-amber-200 bg-white text-slate-800'
            }`}>
              <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500 shadow-inner">
                <Building2 className="h-7 w-7" />
              </div>
              <h3 className="text-base font-extrabold tracking-tight">
                {lang === 'tr' ? 'Belediye Kayıtlı Değil' : 'Municipality Not Registered'}
              </h3>
              <p className="mt-3 text-xs leading-relaxed text-slate-500 dark:text-slate-400 font-semibold">
                {lang === 'tr' 
                  ? 'Bulunduğunuz konumdaki belediye henüz Kentiva platformuna kayıtlı değildir. Bu nedenle buraya ihbar oluşturamazsınız.' 
                  : 'The municipality in your region is not registered with Kentiva yet. You cannot submit reports here.'}
              </p>
              <button
                type="button"
                onClick={onCancel}
                className="mt-6 w-full rounded-2xl bg-primary py-3 text-xs font-bold text-white shadow-lg shadow-primary/20 hover:brightness-105 active:scale-[0.98] transition-all"
              >
                {lang === 'tr' ? 'Vazgeç ve Geri Dön' : 'Cancel & Go Back'}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-5 flex-1">
            {step === 0 && (latitude === null || longitude === null || municipalityLookupFailed) && (
              <div className="flex flex-1 flex-col items-center justify-center p-6 text-center my-auto min-h-[50vh]">
                {locationError ? (
                  <div className="space-y-4 max-w-xs">
                    <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500">
                      <MapPin className="h-6 w-6" />
                    </div>
                    <h3 className={`text-base font-extrabold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      {municipalityLookupFailed
                        ? (lang === 'tr' ? 'Bölge doğrulanamadı' : 'Region could not be verified')
                        : (lang === 'tr' ? 'Konum Alınamadı' : 'Location Not Found')}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold leading-relaxed">
                      {locationError}
                    </p>
                    <div className="space-y-2">
                      <button
                        type="button"
                        onClick={() => void getPosition()}
                        className="w-full rounded-xl bg-primary py-2.5 text-xs font-bold text-white shadow-md active:scale-95 transition-all cursor-pointer"
                      >
                        {lang === 'tr' ? 'Konumu yeniden dene' : 'Try location again'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const fallbackLat = defaultMunicipality?.centerLat || 41.2507;
                          const fallbackLng = defaultMunicipality?.centerLng || 32.6942;
                          void handleManualLocation(fallbackLat, fallbackLng);
                        }}
                        className={`w-full rounded-xl border py-2.5 text-xs font-bold transition-all active:scale-95 ${
                          isDark ? 'border-slate-700 text-slate-200' : 'border-slate-200 text-slate-700'
                        }`}
                      >
                        {lang === 'tr' ? 'Haritadan manuel belirle' : 'Set manually on map'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center text-center w-full">
                    <div className="relative mb-6 flex h-20 w-20 items-center justify-center mx-auto">
                      <div className="absolute inset-0 animate-ping rounded-full bg-primary/20" />
                      <div className="absolute inset-2 animate-pulse rounded-full bg-primary/30" />
                      <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-white shadow-lg">
                        <Navigation className="h-6 w-6 animate-spin" />
                      </div>
                    </div>
                    <h3 className={`text-base font-extrabold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      {lang === 'tr' ? 'Konumunuz Belirleniyor' : 'Detecting Your Location'}
                    </h3>
                    <p className="mt-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400 font-semibold max-w-xs mx-auto">
                      {lang === 'tr'
                        ? 'En doğru ihbar koordinatları için hassas GPS bağlantısı kuruluyor. Lütfen bekleyin...'
                        : 'Establishing high-accuracy GPS connection for precise report mapping. Please wait...'}
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        const fallbackLat = defaultMunicipality?.centerLat || 41.2507;
                        const fallbackLng = defaultMunicipality?.centerLng || 32.6942;
                        void handleManualLocation(fallbackLat, fallbackLng);
                      }}
                      className="mt-6 text-xs font-semibold text-primary underline cursor-pointer mx-auto"
                    >
                      {lang === 'tr' ? 'Beklemeden Manuel Seç' : 'Skip & Select Manually'}
                    </button>
                  </div>
                )}
              </div>
            )}

            {step === 0 && latitude !== null && longitude !== null && !municipalityLookupFailed && (
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="space-y-5 flex-1 flex flex-col"
              >
                <div className={`w-full rounded-2xl overflow-hidden shadow-inner relative border ${
                  isDark ? 'border-slate-800 bg-slate-950' : 'border-slate-200 bg-slate-100'
                }`} style={{ height: '320px', zIndex: 10 }}>
                  <ReportMap
                    latitude={latitude}
                    longitude={longitude}
                    isDark={isDark}
                    nearbyReports={nearbyReports}
                    lang={lang}
                    onLocationChange={handleManualLocation}
                  />
                </div>

                {resolvedMunicipality ? (
                  <div className={`p-4 rounded-2xl border flex items-center gap-3.5 transition-all ${
                    isDark ? 'border-slate-800 bg-slate-900/60' : 'border-slate-100 bg-slate-50'
                  }`}>
                    <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={`text-xs font-bold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        {lang === 'tr' ? 'Tespit Edilen Bölge' : 'Resolved Region'}
                      </p>
                      <p className={`text-sm font-extrabold truncate mt-0.5 ${isDark ? 'text-white' : 'text-slate-800'}`}>
                        {resolvedMunicipality.displayName}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className={`p-4 rounded-2xl border flex items-center gap-3.5 ${
                    isDark ? 'border-slate-800 bg-slate-900/60' : 'border-slate-100 bg-slate-50'
                  }`}>
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
                      <MapPin className="w-5 h-5 animate-pulse" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={`text-xs font-bold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        {lang === 'tr' ? 'Bölge Sınırı Sorgulanıyor' : 'Resolving Region'}
                      </p>
                      <p className={`text-sm font-semibold truncate mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        {lang === 'tr' ? 'Veritabanı kontrol ediliyor...' : 'Checking database...'}
                      </p>
                    </div>
                  </div>
                )}
              </motion.div>
            )}

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
                    {lang === 'tr' ? 'Şablonlar yükleniyor...' : 'Loading templates...'}
                  </p>
                ) : (
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {templates
                      .filter((t) => t.categoryId === categoryId)
                      .map((template) => (
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
                  {lang === 'tr' ? 'Konum alındıktan sonra kategoriler yüklenecek.' : 'Categories load after location is set.'}
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {categories.map((category) => (
                    <button
                      key={category.id}
                      type="button"
                      onClick={() => {
                        setCategoryId(category.id);
                        const catTemplates = templates.filter((t) => t.categoryId === category.id);
                        if (catTemplates.length > 0) {
                          applyTemplate(catTemplates[0]);
                        } else {
                          setSelectedTemplateKey(null);
                        }
                      }}
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

            {resolvedMunicipality && (
              <div className={`p-4 rounded-2xl border flex items-center gap-3.5 transition-all ${
                isDark ? 'border-slate-800 bg-slate-900/60' : 'border-slate-100 bg-slate-50'
              }`}>
                <div className="flex items-center gap-2.5 min-w-0">
                  <MapPin className="h-4 w-4 text-primary shrink-0" />
                  <span className={`text-xs font-semibold truncate ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
                    {resolvedMunicipality.displayName}
                  </span>
                </div>
              </div>
            )}

            <div>
              <label className={`mb-2 block text-sm font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                {t('report.photo', lang)}
              </label>
              <div className="space-y-2">
                {localPhotoPreviews.length > 0 && (
                  <div className="grid grid-cols-3 gap-2">
                    {localPhotoPreviews.map((preview, i) => (
                      <div key={i} className="relative aspect-square overflow-hidden rounded-xl">
                        <img
                          src={preview.startsWith('blob:') ? preview : resolveMediaUrl(preview)}
                          alt={`${lang === 'tr' ? 'Fotoğraf' : 'Photo'} ${i + 1}`}
                          className="h-full w-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemovePhoto(i)}
                          className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white text-xs hover:bg-black/80"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {localPhotoPreviews.length < maxPhotos && (
                  <button
                    type="button"
                    onClick={() => void handleCapturePhoto()}
                    disabled={isUploading}
                    className={`relative flex aspect-[4/3] max-h-32 w-full flex-col items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed transition-colors disabled:opacity-60 ${
                      isDark
                        ? 'border-slate-700 bg-slate-800 text-slate-500 hover:border-primary hover:text-secondary'
                        : 'border-slate-300 bg-slate-50 text-slate-400 hover:border-primary hover:text-primary'
                    }`}
                  >
                    {isUploading ? (
                      <div className="flex flex-col items-center">
                        <span className="text-sm font-medium">{t('report.uploading', lang)}</span>
                      </div>
                    ) : (
                      <>
                        <Camera className="mb-1 h-6 w-6" />
                        <span className="text-xs font-medium">{t('report.photo.btn', lang)} ({localPhotoPreviews.length}/{maxPhotos})</span>
                      </>
                    )}
                  </button>
                )}
              </div>
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
            <h2 className={`text-base font-extrabold ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {lang === 'tr' ? 'Göndermeden önce son kontrol' : 'Final check before sending'}
            </h2>
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
                  mediaUrls.length > 0
                    ? `${mediaUrls.length} ${lang === 'tr' ? 'fotoğraf eklendi' : 'photo(s) attached'}`
                    : t('report.preview.noPhoto', lang),
                )}
              </motion.div>
              {localPhotoPreviews.length > 0 && (
                <div className="grid grid-cols-3 gap-1 px-2 pb-2">
                  {localPhotoPreviews.map((p, i) => (
                    <img key={i} src={p.startsWith('blob:') ? p : resolveMediaUrl(p)} alt="" className="h-20 w-full rounded-lg object-cover" />
                  ))}
                </div>
              )}
              <motion.div className={`px-4 py-3 ${isDark ? 'bg-slate-800/80' : 'bg-slate-50'}`}>
                <p className={`mb-1 text-xs font-semibold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  {t('report.preview.description', lang)}
                </p>
                <p className={`text-sm leading-relaxed ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{description}</p>
              </motion.div>
            </motion.div>

            {error && (
              <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
                {error}
              </div>
            )}

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
      )}
      </div>

      {!isOutsideKentiva && (
        <div className={`border-t p-4 ${isDark ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-white'}`}>
          {step === 0 ? (
            <button
              type="button"
              disabled={!resolvedMunicipality || !resolvedMunicipality.onboarded}
              onClick={() => setStep(1)}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-sm font-semibold text-white shadow-md shadow-primary/20 disabled:opacity-50 active:scale-95 dark:shadow-none cursor-pointer"
            >
              <span>{lang === 'tr' ? 'İhbar Oluştur' : 'Create Report'}</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          ) : step === 1 ? (
            <button
              type="button"
              onClick={handleNext}
              disabled={!canProceed}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-sm font-semibold text-white shadow-md shadow-primary/20 disabled:opacity-50 active:scale-95 dark:shadow-none cursor-pointer"
            >
              {t('report.next', lang)} <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={submitReport}
              disabled={isSubmitting || !kvkkApproved}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-sm font-semibold text-white shadow-md shadow-primary/20 active:scale-95 disabled:opacity-70 dark:shadow-none cursor-pointer"
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
      )}

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
