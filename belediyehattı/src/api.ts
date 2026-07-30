// ============================================
// BelediyeApp API Service — Backend Integration
// ============================================

import { apiOriginFromBase, clearStaleApiOverrideIfNeeded, resolveApiBase } from './lib/apiBase';
import { getTokenSync, getRefreshTokenSync, getSavedUserRawSync, setTokensSync, clearTokensSync, saveUserSync } from './lib/tokenStorage';
import { storageService } from './lib/storageService';

const AUTH_PATHS = [
  '/auth/login',
  '/auth/register',
  '/auth/register/otp',
  '/auth/refresh',
  '/auth/forgot-password',
  '/auth/reset-password'
];

type ApiEnvelope<T = unknown> = {
  success?: boolean;
  message?: string;
  data?: T;
  errorCode?: string;
  errors?: unknown;
};

const DEFAULT_FRIENDLY_ERROR = 'İşlem tamamlanamadı. Lütfen biraz sonra tekrar deneyin.';

let refreshInFlight: Promise<boolean> | null = null;

export function apiBase(): string {
  return resolveApiBase(
    typeof import.meta !== 'undefined' ? import.meta.env?.VITE_API_BASE_URL : undefined,
  );
}

/** Göreli imzalı medya yolunu tam URL yapar (img src için). Sunucunun localhost tabanlı imzasını istemci API köküne çevirir. */
export function resolveMediaUrl(url: string | null | undefined): string {
  if (!url) return '';

  try {
    const cached = localStorage.getItem('media_cache_' + url);
    if (cached) {
      return cached;
    }
  } catch {
    // ignore
  }

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
  return getTokenSync();
}

export function getRefreshToken(): string | null {
  return getRefreshTokenSync();
}

export function setTokens(accessToken: string, refreshToken: string) {
  setTokensSync(accessToken, refreshToken);
}

export function clearTokens() {
  clearTokensSync();
}

export function getSavedUser(): AuthUser | null {
  try {
    const raw = getSavedUserRawSync();
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
}

export function saveUser(user: AuthUser) {
  saveUserSync(JSON.stringify(user));
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
  provinceName?: string | null;
  parentId?: string | null;
  logoUrl: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  accentColor: string | null;
  slogan: string | null;
  centerLat: number;
  centerLng: number;
  active: boolean;
  onboarded: boolean;
  contactPhone?: string | null;
  contactEmail?: string | null;
  websiteUrl?: string | null;
  reputationDeltaReportCreated?: number;
  reputationDeltaReportResolved?: number;
  reputationDeltaReportRejected?: number;
  reputationDeltaInappropriateMedia?: number;
  autoSuspensionThreshold?: number;
  autoSuspensionDays?: number;
}

export interface PublicDepartment {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  active: boolean;
  municipalityId: string | null;
  municipalityName: string | null;
  municipalitySlug: string | null;
  publicPath: string | null;
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

async function parseJsonBody(res: Response): Promise<ApiEnvelope> {
  const text = await res.text();
  if (!text) {
    return { success: false, message: 'Sunucu yanıtı boş' };
  }
  try {
    return JSON.parse(text) as ApiEnvelope;
  } catch {
    return { success: false, message: 'Geçersiz sunucu yanıtı' };
  }
}

function looksTechnical(message: string): boolean {
  const lower = message.toLowerCase();
  return [
    'exception',
    'java.',
    'stack',
    'trace',
    'sql',
    'constraint',
    'nullpointer',
    'undefined',
    ' at '
  ].some((needle) => lower.includes(needle));
}

function friendlyApiError(status: number, json: ApiEnvelope, fallback = DEFAULT_FRIENDLY_ERROR): string {
  const code = json.errorCode;
  if (code === 'RATE_LIMIT_EXCEEDED' || status === 429) {
    return 'Çok fazla deneme yapıldı. Lütfen biraz sonra tekrar deneyin.';
  }
  if (code === 'INVALID_OTP') {
    return 'Doğrulama kodu geçersiz veya süresi dolmuş.';
  }
  if (code === 'OTP_SEND_FAILED') {
    return 'Doğrulama kodu gönderilemedi. Lütfen biraz sonra tekrar deneyin.';
  }
  if (code === 'PHONE_ALREADY_EXISTS') {
    return 'Bu telefon numarası zaten kullanılıyor.';
  }
  if (code === 'EMAIL_ALREADY_EXISTS') {
    return 'Bu e-posta adresi zaten kullanılıyor.';
  }
  if (code === 'VALIDATION_ERROR') {
    return 'Bilgileri kontrol edip tekrar deneyin.';
  }
  if (code === 'INVALID_CREDENTIALS' || status === 401) {
    return 'E-posta veya şifre hatalı.';
  }
  if (status === 403) {
    return 'Bu işlem için yetkiniz yok.';
  }
  if (status === 413) {
    return 'Dosya boyutu çok büyük. Lütfen daha küçük bir dosya seçin.';
  }
  if (status >= 500) {
    return 'Şu anda işlem tamamlanamadı. Lütfen biraz sonra tekrar deneyin.';
  }

  const message = typeof json.message === 'string' ? json.message.trim() : '';
  if (message && !looksTechnical(message)) {
    return message;
  }
  return fallback;
}

export async function readFriendlyApiError(res: Response, fallback = DEFAULT_FRIENDLY_ERROR): Promise<string> {
  const json = await parseJsonBody(res);
  return friendlyApiError(res.status, json, fallback);
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
        headers: {
          'Content-Type': 'application/json',
          'bypass-tunnel-reminder': 'true'
        },
        body: JSON.stringify({ refreshToken: refresh })
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
    'bypass-tunnel-reminder': 'true',
    ...(opts.headers as Record<string, string> || {})
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
      throw new Error(friendlyApiError(res.status, json));
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
  const normalized = path.startsWith('/') ? path : `/${path}`;
  const res = await fetch(`${apiBase()}${normalized}`, {
    headers: {
      'bypass-tunnel-reminder': 'true'
    }
  });
  const json = await parseJsonBody(res);
  if (!res.ok || !json.success) {
    throw new Error(friendlyApiError(res.status, json));
  }
  return json.data as T;
}

export interface PublicProvince {
  plateCode: string;
  nameTr: string;
  slug: string;
}

export interface PublicDistrict {
  id: number;
  memberId: string;
  plateCode: string;
  districtSlug: string;
  nameTr: string;
  onboarded: boolean;
  municipalityId: string | null;
}

export async function fetchPublicProvinces(): Promise<PublicProvince[]> {
  return publicFetch<PublicProvince[]>('/public/provinces');
}

export async function fetchPublicDistricts(plateCode: string): Promise<PublicDistrict[]> {
  return publicFetch<PublicDistrict[]>(`/public/provinces/${encodeURIComponent(plateCode)}/districts`);
}

export async function fetchPublicMunicipalities(): Promise<PublicTenant[]> {
  return publicFetch<PublicTenant[]>('/public/municipalities');
}

export async function fetchPublicMunicipalityBySlug(slug: string): Promise<PublicTenant> {
  return publicFetch<PublicTenant>(`/public/municipalities/${encodeURIComponent(slug)}`);
}

export async function fetchPublicDepartmentContext(
  municipalitySlug: string,
  departmentSlug: string,
): Promise<PublicDepartment> {
  return publicFetch(
    `/public/municipalities/${encodeURIComponent(municipalitySlug)}/departments/${encodeURIComponent(departmentSlug)}`,
  );
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
    headers: {
      'Content-Type': 'application/json',
      'bypass-tunnel-reminder': 'true'
    },
    body: JSON.stringify({ email, password })
  });
  const json = await parseJsonBody(res);
  if (!res.ok || !json.success) {
    throw new Error(friendlyApiError(res.status, json, 'Giriş başarısız. Lütfen bilgilerinizi kontrol edin.'));
  }
  const data = json.data as AuthUser;
  setTokens(data.accessToken, data.refreshToken);
  saveUser(data);
  return data;
}

export async function sendRegistrationOtp(phoneNumber: string): Promise<{ devOtpCode?: string }> {
  return apiFetch<{ devOtpCode?: string }>('/auth/register/otp', {
    method: 'POST',
    body: JSON.stringify({ phoneNumber })
  });
}

export async function register(
  firstName: string,
  lastName: string,
  email: string,
  password: string,
  phoneNumber: string,
  smsOtpCode: string,
  kvkkApproved: boolean = false,
  tcNo?: string,
  birthYear?: number,
): Promise<AuthUser> {
  const data = await apiFetch<AuthUser>('/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      firstName,
      lastName,
      email,
      password,
      phoneNumber,
      smsOtpCode,
      kvkkApproved,
      tcNo: tcNo || null,
      birthYear: birthYear || null
    })
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

export async function deleteAccount() {
  await apiFetch('/users/me', { method: 'DELETE' });
  clearTokens();
}

export async function getCategories(municipalityId?: string, departmentId?: string): Promise<ApiCategory[]> {
  const params = new URLSearchParams();
  if (municipalityId) params.set('municipalityId', municipalityId);
  if (departmentId) params.set('departmentId', departmentId);
  const q = params.toString() ? `?${params.toString()}` : '';
  return apiFetch<ApiCategory[]>(`/categories${q}`);
}

export async function getReportTemplates(
  tenant: { slug: string } | { id: string },
  opts?: { departmentSlug?: string; departmentId?: string },
): Promise<ApiReportTemplate[]> {
  if ('slug' in tenant && tenant.slug) {
    const params = new URLSearchParams();
    if (opts?.departmentSlug) {
      params.set('departmentSlug', opts.departmentSlug);
    }
    const suffix = params.toString() ? `?${params.toString()}` : '';
    return publicFetch(`/public/municipalities/${encodeURIComponent(tenant.slug)}/report-templates${suffix}`);
  }
  const municipalityId = 'id' in tenant ? tenant.id : '';
  const params = new URLSearchParams({ municipalityId: municipalityId });
  if (opts?.departmentId) {
    params.set('departmentId', opts.departmentId);
  }
  return publicFetch(`/public/municipalities/report-templates?${params.toString()}`);
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
  kvkkApproved: boolean = false,
) {
  const body: Record<string, unknown> = {
    title,
    description,
    categoryId,
    latitude,
    longitude,
    district: district ?? null,
    mediaUrls,
    kvkkApproved
  };
  if (targetMunicipalityId) {
    body.targetMunicipalityId = targetMunicipalityId;
  }
  return apiFetch<ApiReportDetail>('/reports', {
    method: 'POST',
    body: JSON.stringify(body)
  });
}

export async function uploadMedia(file: File): Promise<string[]> {
  const attempt = async () => {
    const formData = new FormData();
    formData.append('files', file);
    const headers: Record<string, string> = {
      'bypass-tunnel-reminder': 'true'
    };
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
    throw new Error(friendlyApiError(res.status, json, 'Resim yüklenemedi. Lütfen tekrar deneyin.'));
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
  try {
    const profile = await apiFetch<ApiUserProfile>('/users/me');
    storageService.setItem('belediye_offline_profile', JSON.stringify(profile));
    return profile;
  } catch (e) {
    // Offline fallback: return cached profile if available
    if (!navigator.onLine) {
      const cached = storageService.getItem('belediye_offline_profile');
      if (cached) {
        try {
          return JSON.parse(cached);
        } catch { /* ignore parse error */ }
      }
    }
    // Online but API failed — propagate error instead of returning mock data
    throw e;
  }
}

export async function setPreferredMunicipality(municipalityId: string): Promise<ApiUserProfile> {
  const token = getToken();
  if (!token) {
    throw new Error('Oturum açılmamış.');
  }

  try {
    const profile = await apiFetch<ApiUserProfile>('/users/me/preferred-municipality', {
      method: 'PATCH',
      body: JSON.stringify({ municipalityId })
    });
    storageService.setItem('belediye_offline_profile', JSON.stringify(profile));
    if (profile.preferredMunicipality) {
      storageService.setItem('belediye_offline_tenant', JSON.stringify(profile.preferredMunicipality));
    }
    return profile;
  } catch (e) {
    // Offline fallback: return cached profile if available
    if (!navigator.onLine) {
      const cached = storageService.getItem('belediye_offline_profile');
      if (cached) {
        try {
          return JSON.parse(cached);
        } catch { /* ignore parse error */ }
      }
    }
    throw e;
  }
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
    radiusMeters: String(radiusMeters)
  });
  return apiFetch(`/reports/nearby-hints?${q}`);
}

export interface ApiReportListResponse {
  id: string;
  title: string;
  status: string;
  categoryName: string;
  latitude: number;
  longitude: number;
  createdAt: string;
  district: string;
}

export async function fetchNearbyReports(
  latitude: number,
  longitude: number,
  radiusMeters = 1000,
): Promise<ApiReportListResponse[]> {
  const q = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    radiusMeters: String(radiusMeters)
  });
  return apiFetch(`/reports/nearby?${q}`);
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
    body: JSON.stringify(payload)
  });
}

export async function updateFcmToken(fcmToken: string): Promise<void> {
  await apiFetch('/users/fcm-token', {
    method: 'PATCH',
    body: JSON.stringify({ fcmToken })
  });
}

export async function deleteMyAccount(): Promise<void> {
  await apiFetch('/users/me', {
    method: 'DELETE'
  });
}

// --- NEW SOCIAL AND NOTIFICATION ENDPOINTS ---

export interface ApiAnnouncement {
  id: string;
  title: string;
  content: string;
  imageUrl: string | null;
  startsAt: string;
  active: boolean;
}

export interface ApiSurvey {
  id: string;
  title: string;
  description: string;
  option1: string;
  option2: string;
  option3: string | null;
  option4: string | null;
  category: string;
  active: boolean;
  voted: boolean;
  votedOption: number | null;
  recommended: boolean;
  option1Count: number;
  option2Count: number;
  option3Count: number;
  option4Count: number;
  totalVotes: number;
}

export interface ApiNotificationPreferences {
  id: string;
  announcementsEnabled: boolean;
  outagesEnabled: boolean;
  surveysEnabled: boolean;
}

export async function getPublicAnnouncements(municipalityId: string): Promise<ApiAnnouncement[]> {
  return apiFetch<ApiAnnouncement[]>(`/public/municipalities/${encodeURIComponent(municipalityId)}/announcements`);
}

export async function getPublicSurveys(municipalityId: string): Promise<ApiSurvey[]> {
  return apiFetch<ApiSurvey[]>(`/public/municipalities/${encodeURIComponent(municipalityId)}/surveys`);
}

export async function voteSurvey(surveyId: string, selectedOption: number): Promise<ApiSurvey> {
  return apiFetch<ApiSurvey>(`/public/surveys/${encodeURIComponent(surveyId)}/vote`, {
    method: 'POST',
    body: JSON.stringify({ selectedOption })
  });
}

export async function getNotificationPreferences(): Promise<ApiNotificationPreferences> {
  return apiFetch<ApiNotificationPreferences>('/users/me/notification-preferences');
}

export async function updateNotificationPreferences(payload: {
  announcementsEnabled: boolean;
  outagesEnabled: boolean;
  surveysEnabled: boolean;
}): Promise<ApiNotificationPreferences> {
  return apiFetch<ApiNotificationPreferences>('/users/me/notification-preferences', {
    method: 'PUT',
    body: JSON.stringify(payload)
  });
}

export async function submitSystemFeedback(rating: number, content: string): Promise<void> {
  await apiFetch('/system-feedback', {
    method: 'POST',
    body: JSON.stringify({ rating, content })
  });
}

// ============================================
//  Ödüller & Gamification API
// ============================================

export interface ApiReward {
  id: string;
  municipalityId: string;
  municipalityName: string;
  title: string;
  description: string | null;
  pointCost: number;
  stock: number;
  imageUrl: string | null;
  active: boolean;
}

export interface ApiRedeemedReward {
  id: string;
  rewardId: string;
  rewardTitle: string;
  rewardImageUrl: string | null;
  redemptionCode: string;
  status: string;
  redeemedAt: string;
  userEmail: string;
  userFullName: string;
  pointCost: number;
}

export async function fetchRewards(municipalityId: string): Promise<ApiReward[]> {
  try {
    return await apiFetch<ApiReward[]>(`/public/municipalities/${encodeURIComponent(municipalityId)}/rewards`);
  } catch {
    return [];
  }
}

export async function fetchRedeemedRewards(): Promise<ApiRedeemedReward[]> {
  try {
    return await apiFetch<ApiRedeemedReward[]>('/users/me/rewards/redeemed');
  } catch {
    return [];
  }
}

export async function redeemReward(rewardId: string): Promise<ApiRedeemedReward> {
  return await apiFetch<ApiRedeemedReward>('/users/me/rewards/redeem', {
    method: 'POST',
    body: JSON.stringify({ rewardId })
  });
}


