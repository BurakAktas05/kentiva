import { useState } from 'react';
import {
  analyzeReportDraft,
  createReport,
  fetchNearbyReportHints,
  type NearbyReportHint,
  type PublicTenant,
  type ReportDraftAnalysis,
} from '../api';
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
  /** Called when the report was saved to the offline queue instead of submitted. */
  onQueuedOffline?: () => void;
  minDescriptionLen?: number;
}

export type ReportAiNotice = {
  tone: 'success' | 'info' | 'warning';
  message: string;
};

function buildReportTitle(description: string, categoryName: string | undefined, lang: Lang): string {
  const trimmed = description.trim();
  if (trimmed.length >= 10) return trimmed.slice(0, 80);
  const prefix = categoryName || (lang === 'tr' ? 'Bildirim' : 'Report');
  const combined = `${prefix}: ${trimmed}`.slice(0, 80);
  return combined.length >= 10 ? combined : `${prefix} - ${new Date().toLocaleDateString(lang === 'tr' ? 'tr-TR' : 'en-US')}`;
}

function buildAiNotice(lang: Lang, analysisSource?: string | null, mode: 'success' | 'fallback' | 'unavailable' = 'success'): ReportAiNotice {
  if (mode === 'unavailable') {
    return {
      tone: 'warning',
      message:
        lang === 'tr'
          ? 'AI ön incelemesi şu an tamamlanamadı. Bildiriminiz yine de belediye ekiplerine iletilecek.'
          : 'AI pre-check is currently unavailable. Your report will still be delivered to municipal teams.',
    };
  }

  if (mode === 'fallback') {
    return {
      tone: 'info',
      message:
        lang === 'tr'
          ? 'AI servisi yerine kural tabanlı bir ön inceleme kullanıldı. Nihai değerlendirme belediye ekiplerince yapılır.'
          : 'A rules-based pre-check was used instead of the AI service. Final evaluation is always made by municipal teams.',
    };
  }

  return {
    tone: 'success',
    message:
      lang === 'tr'
        ? `AI ön incelemesi tamamlandı${analysisSource ? ` (${analysisSource})` : ''}. Nihai karar belediye ekiplerine aittir.`
        : `AI pre-check completed${analysisSource ? ` (${analysisSource})` : ''}. Final decisions always belong to municipal teams.`,
  };
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
  onQueuedOffline,
  minDescriptionLen = 20,
}: UseReportSubmitProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [nearbyHints, setNearbyHints] = useState<NearbyReportHint[]>([]);
  const [kvkkApproved, setKvkkApproved] = useState(false);

  const [aiScanOpen, setAiScanOpen] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<ReportDraftAnalysis | null>(null);
  const [aiAnalysisLoading, setAiAnalysisLoading] = useState(false);
  const [aiNotice, setAiNotice] = useState<ReportAiNotice | null>(null);

  const checkDuplicatesAndProceed = async () => {
    if (description.trim().length < minDescriptionLen) {
      setError(
        lang === 'tr'
          ? `Açıklama en az ${minDescriptionLen} karakter olmalıdır.`
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
        (hint) => hint.categoryName?.trim().toLowerCase() === selectedCategoryName?.trim().toLowerCase(),
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
    setAiNotice(null);

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

        const source = result.analysisSource?.toLowerCase() ?? '';
        if (source.includes('kural') || source.includes('fallback')) {
          setAiNotice(buildAiNotice(lang, result.analysisSource, 'fallback'));
        } else {
          setAiNotice(buildAiNotice(lang, result.analysisSource, 'success'));
        }
        return true;
      } catch {
        setAiNotice(buildAiNotice(lang, null, 'unavailable'));
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
          if (onQueuedOffline) {
            onQueuedOffline();
          } else {
            onSubmit();
          }
          return;
        } catch {
          // fall through to regular error handling
        }
      }

      const message =
        err instanceof Error
          ? err.message
          : lang === 'tr'
            ? 'İhbar gönderilemedi. İnternet bağlantınızı kontrol edin.'
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
    aiNotice,
    checkDuplicatesAndProceed,
    runAiAnalysis,
    submitReport,
  };
}
