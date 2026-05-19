// ============================================
// BelediyeApp API Service — Backend Integration
// ============================================

import { apiOriginFromBase, clearStaleApiOverrideIfNeeded, resolveApiBase } from './lib/apiBase';

const AUTH_PATHS = [
  '/auth/login',
  '/auth/register',
  '/auth/refresh',
  '/auth/forgot-password',
  '/auth/reset-password',
];

let refreshInFlight: Promise<boolean> | null = null;

export function apiBase(): string {
  return resolveApiBase(
    typeof import.meta !== 'undefined' ? import.meta.env?.VITE_API_BASE_URL : undefined,
  );
}

/** Göreli imzalı medya yolunu tam URL yapar (img src için). Sunucunun localhost tabanlı imzasını istemci API köküne çevirir. */
export function resolveMediaUrl(url: string | null | undefined): string {
  if (!url) return '';
  const origin = apiOriginFromBase(apiBase());

  const accessMatch = url.match(/\/api\/v1\/media\/access\?token=[^&\s]+/);
  if (accessMatch) {
    return `${origin}${accessMatch[0]}`;
  }

  if (/^https?:\/\//i.test(url)) {
    try {
      const parsed = new URL(url);
      if (parsed.pathname.includes('/media/access')) {
        return `${origin}${parsed.pathname}${parsed.search}`;
      }
    } catch {
      return url;
    }
    return url;
  }

  if (url.startsWith('/api/v1/media/access')) {
    return `${origin}${url}`;
  }

  return `${origin}${url.startsWith('/') ? url : `/${url}`}`;
}

export function getToken(): string | null {
  return localStorage.getItem('belediye_token');
}

export function getRefreshToken(): string | null {
  return localStorage.getItem('belediye_refresh_token');
}

export function setTokens(accessToken: string, refreshToken: string) {
  localStorage.setItem('belediye_token', accessToken);
  localStorage.setItem('belediye_refresh_token', refreshToken);
}

export function clearTokens() {
  localStorage.removeItem('belediye_token');
  localStorage.removeItem('belediye_refresh_token');
  localStorage.removeItem('belediye_user');
}

export function getSavedUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem('belediye_user');
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
}

export function saveUser(user: AuthUser) {
  localStorage.setItem('belediye_user', JSON.stringify(user));
}

export interface AuthUser {
  userId: string;
  email: string;
  fullName: string;
  roles: string[];
  accessToken: string;
  refreshToken: string;
  district: string | null;
}

export interface PublicTenant {
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
  active: boolean;
  onboarded: boolean;
}

export interface ApiCategory {
  id: string;
  name: string;
  description: string | null;
  iconCode: string | null;
}

export interface ApiReportTemplate {
  id: string;
  templateKey: string;
  title: string;
  descriptionTemplate: string;
  categoryId: string;
  categoryName: string;
  iconCode: string | null;
  sortOrder: number;
  global: boolean;
}

export interface ApiReportList {
  id: string;
  title: string;
  status: string;
  categoryName: string;
  latitude: number;
  longitude: number;
  createdAt: string;
  district?: string | null;
  aiPriority?: string | null;
  aiSlaRisk?: string | null;
}

export interface ApiReportDetail {
  id: string;
  title: string;
  description: string;
  status: string;
  categoryName: string;
  reporterFullName: string;
  assigneeFullName: string | null;
  latitude: number;
  longitude: number;
  createdAt: string;
  updatedAt: string;
  mediaUrls: string[];
  district?: string | null;
  aiPriority?: string | null;
  aiSummary?: string | null;
  aiSuggestedCategory?: string | null;
  aiSlaRisk?: string | null;
  aiReplyDraft?: string | null;
  aiDuplicateHint?: string | null;
  duplicateGroupId?: string | null;
  duplicateGroupSize?: number | null;
}

export interface ReportTimelineEntry {
  at: string;
  oldStatus: string | null;
  newStatus: string | null;
  actorName: string;
  note: string | null;
}

export interface ApiNotification {
  id: string;
  title: string;
  body: string;
  type: string;
  read: boolean;
  reportId: string | null;
  createdAt: string;
}

export interface ApiUserProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string | null;
  roles: string[];
  reputationScore?: number;
  reputationLevel?: string;
  preferredMunicipality?: (PublicTenant & { name?: string }) | null;
}

export type NearbyReportHint = {
  id: string;
  title: string;
  categoryName: string;
  status: string;
  distanceMeters: number;
  createdAt: string;
};

export type WeatherWidget = {
  available: boolean;
  temperatureC: number | null;
  apparentTemperatureC: number | null;
  humidityPercent: number | null;
  windSpeedKmh: number | null;
  precipitationMm: number | null;
  dailyMaxC: number | null;
  dailyMinC: number | null;
  weatherCode: number | null;
  description: string | null;
  usAqi: number | null;
  aqiLabel: string | null;
  pm25: number | null;
  pm10: number | null;
  dataSource: string | null;
};

export type PharmacyWidget = {
  name: string;
  address: string;
  distanceMeters: number | null;
  lat: number | null;
  lng: number | null;
  onDuty: boolean;
  phone: string | null;
  dutyVerified: boolean;
};

export type ReportDraftAnalysis = {
  priority: string;
  summary: string;
  suggestedCategoryName: string;
  categoryCorrect: boolean;
  slaRisk: string;
  priorityRationale: string;
  analysisSource: string;
  steps: string[];
};

export type OutageWidget = {
  id: string;
  outageType: string;
  title: string;
  district: string | null;
  message: string | null;
  startsAt: string | null;
  endsAt: string | null;
};

export type EventWidget = {
  id: string;
  title: string;
  venue: string | null;
  description: string | null;
  startsAt: string;
  endsAt: string | null;
  externalUrl: string | null;
};

export type HomeWidgetsBundle = {
  weather: WeatherWidget;
  pharmacies: PharmacyWidget[];
  pharmacyApiConfigured: boolean;
  pharmacyDataSource: string | null;
  outages: OutageWidget[];
  events: EventWidget[];
};

function isAuthPath(path: string): boolean {
  const base = path.split('?')[0];
  return AUTH_PATHS.some((p) => base === p || base.endsWith(p));
}

async function parseJsonBody(res: Response): Promise<{ success?: boolean; message?: string; data?: unknown }> {
  const text = await res.text();
  if (!text) {
    return { success: false, message: 'Sunucu yanıtı boş' };
  }
  try {
    return JSON.parse(text) as { success?: boolean; message?: string; data?: unknown };
  } catch {
    return { success: false, message: 'Geçersiz sunucu yanıtı' };
  }
}

async function tryRefreshToken(): Promise<boolean> {
  if (refreshInFlight) {
    return refreshInFlight;
  }
  refreshInFlight = (async () => {
    const refresh = getRefreshToken();
    if (!refresh) return false;
    try {
      const res = await fetch(`${apiBase()}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: refresh }),
      });
      const json = await parseJsonBody(res);
      if (!res.ok || !json.success || !json.data) return false;
      const data = json.data as AuthUser;
      setTokens(data.accessToken, data.refreshToken);
      const saved = getSavedUser();
      if (saved) {
        saveUser({ ...saved, accessToken: data.accessToken, refreshToken: data.refreshToken });
      }
      return true;
    } catch {
      return false;
    } finally {
      refreshInFlight = null;
    }
  })();
  return refreshInFlight;
}

async function handleUnauthorized(path: string): Promise<never> {
  if (isAuthPath(path)) {
    throw new Error('Geçersiz kimlik bilgileri veya istek reddedildi.');
  }
  const refreshed = await tryRefreshToken();
  if (!refreshed) {
    clearTokens();
    throw new Error('Oturum süresi doldu, lütfen tekrar giriş yapın.');
  }
  throw new Error('SESSION_REFRESH_RETRY');
}

async function apiFetch<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(opts.headers as Record<string, string> || {}),
  };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const doRequest = async () => {
    const res = await fetch(`${apiBase()}${path}`, { ...opts, headers });
    const json = await parseJsonBody(res);

    if (res.status === 401) {
      await handleUnauthorized(path);
    }

    if (!res.ok || !json.success) {
      throw new Error(json.message || 'Hata oluştu');
    }
    return json.data as T;
  };

  try {
    return await doRequest();
  } catch (e) {
    if (e instanceof Error && e.message === 'SESSION_REFRESH_RETRY') {
      headers['Authorization'] = `Bearer ${getToken()}`;
      return doRequest();
    }
    if (e instanceof Error && e.message.includes('Oturum süresi doldu')) {
      setTimeout(() => { window.location.href = '/'; }, 100);
    }
    throw e;
  }
}

async function publicFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${apiBase()}${path}`, {
    headers: {},
  });
  const json = await parseJsonBody(res);
  if (!res.ok || !json.success) {
    throw new Error(json.message || 'Hata oluştu');
  }
  return json.data as T;
}

export async function fetchPublicMunicipalities(): Promise<PublicTenant[]> {
  return publicFetch('/public/municipalities');
}

export type PublicStatsOverview = {
  totalReports: number;
  resolvedReports: number;
  resolutionRatePercent: number;
  onboardedMunicipalityCount: number;
};

export type PublicMunicipalityStat = {
  municipalityId: string;
  name: string;
  totalReports: number;
  resolvedReports: number;
};

export async function fetchPublicStatsOverview(): Promise<PublicStatsOverview> {
  return publicFetch('/public/stats/overview');
}

export async function fetchPublicMunicipalityStatsList(): Promise<PublicMunicipalityStat[]> {
  return publicFetch('/public/stats/municipalities');
}

export async function resolveMunicipalityByGps(lat: number, lng: number): Promise<PublicTenant | null> {
  try {
    return await publicFetch(`/public/municipality-at?lat=${lat}&lng=${lng}`);
  } catch {
    try {
      return await publicFetch(`/public/municipalities/resolve?lat=${lat}&lng=${lng}`);
    } catch {
      return null;
    }
  }
}

export async function login(email: string, password: string): Promise<AuthUser> {
  const res = await fetch(`${apiBase()}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const json = await parseJsonBody(res);
  if (!res.ok || !json.success) {
    throw new Error(json.message || 'Giriş başarısız');
  }
  const data = json.data as AuthUser;
  setTokens(data.accessToken, data.refreshToken);
  saveUser(data);
  return data;
}

export async function register(
  firstName: string,
  lastName: string,
  email: string,
  password: string,
  phoneNumber?: string,
): Promise<AuthUser> {
  const data = await apiFetch<AuthUser>('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ firstName, lastName, email, password, phoneNumber: phoneNumber || null }),
  });
  setTokens(data.accessToken, data.refreshToken);
  saveUser(data);
  return data;
}

export async function logout() {
  try {
    await apiFetch('/auth/logout', { method: 'POST' });
  } catch {
    /* ignore */
  }
  clearTokens();
}

export async function getCategories(municipalityId?: string): Promise<ApiCategory[]> {
  const q = municipalityId ? `?municipalityId=${encodeURIComponent(municipalityId)}` : '';
  return apiFetch<ApiCategory[]>(`/categories${q}`);
}

export async function getReportTemplates(tenant: { slug: string } | { id: string }): Promise<ApiReportTemplate[]> {
  if ('slug' in tenant && tenant.slug) {
    return publicFetch(`/public/municipalities/${encodeURIComponent(tenant.slug)}/report-templates`);
  }
  const municipalityId = 'id' in tenant ? tenant.id : '';
  return publicFetch(`/public/municipalities/report-templates?municipalityId=${encodeURIComponent(municipalityId)}`);
}

export async function createReport(
  title: string,
  description: string,
  categoryId: string,
  latitude: number,
  longitude: number,
  district?: string,
  mediaUrls: string[] = [],
  targetMunicipalityId?: string | null,
) {
  const body: Record<string, unknown> = {
    title,
    description,
    categoryId,
    latitude,
    longitude,
    district: district ?? null,
    mediaUrls,
  };
  if (targetMunicipalityId) {
    body.targetMunicipalityId = targetMunicipalityId;
  }
  return apiFetch<ApiReportDetail>('/reports', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function uploadMedia(file: File): Promise<string[]> {
  const attempt = async () => {
    const formData = new FormData();
    formData.append('files', file);
    const headers: Record<string, string> = {};
    const token = getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return fetch(`${apiBase()}/reports/upload`, { method: 'POST', headers, body: formData });
  };

  let res = await attempt();
  let json = await parseJsonBody(res);

  if (res.status === 401) {
    if (await tryRefreshToken()) {
      res = await attempt();
      json = await parseJsonBody(res);
    } else {
      clearTokens();
      throw new Error('Oturum süresi doldu, lütfen tekrar giriş yapın.');
    }
  }

  if (!res.ok || !json.success) {
    throw new Error(json.message || 'Resim yüklenemedi');
  }
  return json.data as string[];
}

export async function getMyReports(
  page = 0,
  size = 20,
): Promise<{ content: ApiReportList[]; totalElements: number; totalPages: number }> {
  return apiFetch(`/reports/my?page=${page}&size=${size}&sort=createdAt,desc`);
}

export async function getReportDetail(id: string): Promise<ApiReportDetail> {
  return apiFetch(`/reports/${id}`);
}

export async function getReportTimeline(id: string): Promise<ReportTimelineEntry[]> {
  return apiFetch(`/reports/${id}/timeline`);
}

export async function getNotifications(
  page = 0,
  size = 20,
): Promise<{ content: ApiNotification[]; totalElements: number }> {
  return apiFetch(`/notifications?page=${page}&size=${size}`);
}

export async function getUnreadCount(): Promise<number> {
  return apiFetch<number>('/notifications/unread-count');
}

export async function markAllNotificationsRead(): Promise<void> {
  await apiFetch('/notifications/mark-all-read', { method: 'POST' });
}

export async function getMyProfile(): Promise<ApiUserProfile> {
  return apiFetch('/users/me');
}

export async function setPreferredMunicipality(municipalityId: string): Promise<ApiUserProfile> {
  return apiFetch('/users/me/preferred-municipality', {
    method: 'PATCH',
    body: JSON.stringify({ municipalityId }),
  });
}

export async function fetchNearbyReportHints(
  latitude: number,
  longitude: number,
  municipalityId: string,
  radiusMeters = 75,
): Promise<NearbyReportHint[]> {
  const q = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    municipalityId,
    radiusMeters: String(radiusMeters),
  });
  return apiFetch(`/reports/nearby-hints?${q}`);
}

export async function fetchHomeWidgets(
  municipalityId: string,
  lat: number,
  lng: number,
): Promise<HomeWidgetsBundle> {
  const q = new URLSearchParams({ lat: String(lat), lng: String(lng) });
  return publicFetch(`/public/municipalities/${encodeURIComponent(municipalityId)}/home-widgets?${q}`);
}

export async function analyzeReportDraft(payload: {
  categoryId: string;
  title: string;
  description?: string;
  contentLanguage?: string;
  mediaUrl?: string;
}): Promise<ReportDraftAnalysis> {
  return apiFetch('/reports/analyze-draft', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateFcmToken(fcmToken: string): Promise<void> {
  await apiFetch('/users/fcm-token', {
    method: 'PATCH',
    body: JSON.stringify({ fcmToken }),
  });
}
