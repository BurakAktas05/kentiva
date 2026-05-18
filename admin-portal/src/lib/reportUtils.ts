import type { Report, ReportListItem } from '../api';

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
  };
}
