import { getPublicApiBaseFromEnv } from './apiBase';

export const API_BASE = getPublicApiBaseFromEnv(import.meta.env);

export function getBackendOrigin(): string {
  const base = API_BASE;
  const marker = '/api/';
  const idx = base.indexOf(marker);
  if (idx !== -1) return base.slice(0, idx);
  try {
    return new URL(base).origin;
  } catch {
    return 'http://localhost:8080';
  }
}

export type PublicStatsOverview = {
  totalReports: number;
  resolvedReports: number;
  resolutionRatePercent: number;
  onboardedMunicipalityCount: number;
};

export type PublicMunicipalityStat = {
  slug: string;
  displayName: string;
  totalReports: number;
  resolvedReports: number;
};

export type PublicCategoryStat = {
  categoryName: string;
  count: number;
};

export type PublicMonthlyStat = {
  month: string;
  opened: number;
  resolved: number;
};

export type PublicMunicipalityDetail = {
  id: string;
  slug: string;
  displayName: string;
  logoUrl: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  accentColor: string | null;
  slogan: string | null;
  centerLat: number;
  centerLng: number;
  contactEmail: string | null;
  contactPhone: string | null;
  websiteUrl: string | null;
  active: boolean;
  onboarded: boolean;
  publicStatsEnabled: boolean;
};

type ApiEnvelope<T> = {
  success: boolean;
  message?: string;
  data: T;
};

export async function publicGet<T>(path: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, { signal });
  const body = (await res.json()) as ApiEnvelope<T>;
  if (!res.ok || !body.success) {
    throw new Error(body.message || 'İstek başarısız');
  }
  return body.data;
}

export function fetchPublicStatsOverview(signal?: AbortSignal) {
  return publicGet<PublicStatsOverview>('/public/stats', signal);
}

export function fetchPublicMunicipalityStats(signal?: AbortSignal) {
  return publicGet<PublicMunicipalityStat[]>('/public/stats/municipalities', signal);
}

export function fetchPublicCategoryStats(signal?: AbortSignal) {
  return publicGet<PublicCategoryStat[]>('/public/stats/categories', signal);
}

export function fetchPublicMonthlyStats(signal?: AbortSignal) {
  return publicGet<PublicMonthlyStat[]>('/public/stats/monthly', signal);
}

export function fetchPublicMunicipalityBySlug(slug: string, signal?: AbortSignal) {
  return publicGet<PublicMunicipalityDetail>(`/public/municipalities/${encodeURIComponent(slug)}`, signal);
}

export type PublicResolvedReport = {
  id: string;
  title: string;
  description: string;
  categoryName: string;
  district: string;
  createdAt: string;
  resolvedAt: string;
  officialResolutionNote: string;
};

export function fetchPublicMunicipalityResolvedReports(slug: string, signal?: AbortSignal) {
  return publicGet<PublicResolvedReport[]>(`/public/municipalities/${encodeURIComponent(slug)}/resolved-reports`, signal);
}
