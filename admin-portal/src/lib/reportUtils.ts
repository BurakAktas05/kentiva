import type { Report, ReportListItem } from '../api';

export const REPORT_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Beklemede',
  PROCESSING: 'İşlemde',
  RESOLVED: 'Çözüldü',
  REJECTED: 'Reddedildi',
  FORWARDED: 'Yönlendirildi',
  OUT_OF_JURISDICTION: 'Yetki Alanı Dışı',
};

export function reportStatusLabel(status: string | null | undefined) {
  if (!status) return 'Bilinmiyor';
  return REPORT_STATUS_LABELS[status] ?? status;
}

export function reportToListItem(r: Report): ReportListItem {
  return {
    id: r.id,
    title: r.title,
    status: r.status,
    categoryName: r.categoryName,
    latitude: r.latitude ?? null,
    longitude: r.longitude ?? null,
    createdAt: r.createdAt,
    district: r.district ?? '',
    duplicateGroupId: r.duplicateGroupId ?? null,
    duplicateGroupSize: r.duplicateGroupSize ?? null,
    aiPriority: r.aiPriority ?? null,
    processedAt: r.processedAt ?? null,
    slaBreached: r.slaBreached ?? null,
  };
}
