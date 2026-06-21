import { useState } from 'react';
import { fetchNearbyReportHints, analyzeReportDraft, createReport, type PublicTenant, type NearbyReportHint, type ReportDraftAnalysis } from '../api';
import { Lang } from '../i18n';
import { storageService } from '../lib/storageService';

interface UseReportSubmitProps {
  latitude: number | null;
  longitude: number | null;
  resolvedMunicipality: PublicTenant | null;
  mediaUrls: string[];
  description: string;
  categoryId: string;
  selectedCategoryName: string | undefined;
  lang: Lang;
  onSubmit: () => void;
  minDescriptionLen?: number;
}

function buildReportTitle(description: string, categoryName: string | undefined, lang: Lang): string {
  const trimmed = description.trim();
  if (trimmed.length >= 10) return trimmed.slice(0, 80);
  const prefix = categoryName || (lang === 'tr' ? 'Bildirim' : 'Report');
  const combined = `${prefix}: ${trimmed}`.slice(0, 80);
  return combined.length >= 10 ? combined : `${prefix} - ${new Date().toLocaleDateString(lang === 'tr' ? 'tr-TR' : 'en-US')}`;
}

export function useReportSubmit({
  latitude,
  longitude,
  resolvedMunicipality,
  mediaUrls,
  description,
  categoryId,
  selectedCategoryName,
  lang,
  onSubmit,
  minDescriptionLen = 20
}: UseReportSubmitProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [nearbyHints, setNearbyHints] = useState<NearbyReportHint[]>([]);
  const [kvkkApproved, setKvkkApproved] = useState(false);

  const [aiScanOpen, setAiScanOpen] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<ReportDraftAnalysis | null>(null);
  const [aiAnalysisLoading, setAiAnalysisLoading] = useState(false);

  const checkDuplicatesAndProceed = async () => {
    if (description.trim().length < minDescriptionLen) {
      setError(
        lang === 'tr'
          ? `Aciklama en az ${minDescriptionLen} karakter olmalidir.`
          : `Description must be at least ${minDescriptionLen} characters.`,
      );
      return false;
    }

    if (latitude === null || longitude === null || !categoryId || !resolvedMunicipality) {
      return false;
    }

    try {
      const hints = await fetchNearbyReportHints(latitude, longitude, resolvedMunicipality.id, 75);
      const matchingCategoryHints = hints.filter(
        (hint) => hint.categoryName?.trim().toLowerCase() === selectedCategoryName?.trim().toLowerCase()
      );
      if (matchingCategoryHints.length > 0) {
        setNearbyHints(matchingCategoryHints);
        setShowDuplicateModal(true);
        return false;
      }
    } catch {
      // Ignore duplicate lookup issues and continue.
    }

    return true;
  };

  const runAiAnalysis = async () => {
    if (mediaUrls.length > 0 && categoryId) {
      setAiScanOpen(true);
      setAiAnalysisLoading(true);
      setAiAnalysis(null);
      const title = buildReportTitle(description, selectedCategoryName, lang);
      try {
        const result = await analyzeReportDraft({
          categoryId,
          title,
          description: description.trim() || undefined,
          contentLanguage: lang,
          mediaUrl: mediaUrls[0],
        });
        setAiAnalysis(result);
        return true;
      } catch {
        // AI analysis failed — proceed without it
        setAiScanOpen(false);
        return false;
      } finally {
        setAiAnalysisLoading(false);
      }
    }
    return false;
  };

  const submitReport = async () => {
    if (latitude === null || longitude === null || !categoryId || !resolvedMunicipality) {
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const finalTitle = buildReportTitle(description, selectedCategoryName, lang);
      await createReport(
        finalTitle,
        description,
        categoryId,
        latitude,
        longitude,
        resolvedMunicipality.displayName,
        mediaUrls,
        resolvedMunicipality.id,
        kvkkApproved,
      );
      onSubmit();
    } catch (err: unknown) {
      // Offline fallback: save to StorageService queue
      if (!navigator.onLine || (err instanceof TypeError && err.message.includes('fetch'))) {
        try {
          const raw = storageService.getItem('belediye_offline_reports');
          const offlineReports = JSON.parse(raw || '[]');
          offlineReports.push({
            title: buildReportTitle(description, selectedCategoryName, lang),
            description,
            categoryId,
            latitude,
            longitude,
            district: resolvedMunicipality?.displayName ?? null,
            mediaUrls: mediaUrls || [],
            targetMunicipalityId: resolvedMunicipality?.id || null,
            kvkkApproved,
            savedAt: new Date().toISOString(),
          });
          storageService.setItem('belediye_offline_reports', JSON.stringify(offlineReports));
          alert(lang === 'tr'
            ? 'İnternet bağlantınız yok. Raporunuz cihazınıza kaydedildi ve bağlantı sağlandığında otomatik gönderilecek.'
            : 'You are offline. Your report has been saved locally and will be submitted when you reconnect.');
          onSubmit();
          return;
        } catch {
          // fallback failure — fall through to show normal error
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

  return {
    isSubmitting,
    error,
    setError,
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
  };
}
