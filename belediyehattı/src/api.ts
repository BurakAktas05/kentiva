// ============================================
// BelediyeApp API Service — Backend Integration
// ============================================

import { normalizeApiBase } from './lib/apiBase';

const API_BASE = normalizeApiBase(
  typeof import.meta !== 'undefined' ? import.meta.env?.VITE_API_BASE_URL : undefined,
);

// ── Token Management ───────────────────────
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
  const raw = localStorage.getItem('belediye_user');
  return raw ? JSON.parse(raw) : null;
}

export function saveUser(user: AuthUser) {
  localStorage.setItem('belediye_user', JSON.stringify(user));
}

// ── Types ──────────────────────────────────
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

export interface ApiReportList {
  id: string;
  title: string;
  status: string;
  categoryName: string;
  latitude: number;
  longitude: number;
  createdAt: string;
  district?: string | null;
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
}

// ── API Helper ─────────────────────────────
async function apiFetch<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true',
    ...(opts.headers as Record<string, string> || {}),
  };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...opts, headers });

  if (res.status === 401) {
    console.warn(`401 Unauthorized: ${path}. Attempting refresh...`);
    const refreshed = await tryRefreshToken();
    if (refreshed) {
      console.log('Token refreshed successfully. Retrying request...');
      headers['Authorization'] = `Bearer ${getToken()}`;
      const retry = await fetch(`${API_BASE}${path}`, { ...opts, headers });
      const retryJson = await retry.json();
      if (retry.ok && retryJson.success) return retryJson.data as T;
    }
    
    console.error('Session expired and refresh failed. Clearing tokens and redirecting...');
    clearTokens();
    // Use a slight delay to ensure localStorage is cleared before reload
    setTimeout(() => window.location.href = '/', 100);
    throw new Error('Oturum süresi doldu, lütfen tekrar giriş yapın.');
  }

  const json = await res.json();
  if (!res.ok || !json.success) {
    console.error(`API Error (${path}):`, json.message);
    throw new Error(json.message || 'Hata oluştu');
  }
  return json.data as T;
}

async function publicFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'ngrok-skip-browser-warning': 'true' },
  });
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.message || 'Hata oluştu');
  }
  return json.data as T;
}

export async function fetchPublicMunicipalities(): Promise<PublicTenant[]> {
  return publicFetch<PublicTenant[]>('/public/municipalities');
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

/** Kimlik gerektirmez — kurumsal site ile aynı kamu özet verisi */
export async function fetchPublicStatsOverview(): Promise<PublicStatsOverview> {
  return publicFetch<PublicStatsOverview>('/public/stats');
}

export async function fetchPublicMunicipalityStatsList(): Promise<PublicMunicipalityStat[]> {
  return publicFetch<PublicMunicipalityStat[]>('/public/stats/municipalities');
}

export async function resolveMunicipalityByGps(lat: number, lng: number): Promise<PublicTenant | null> {
  return publicFetch<PublicTenant | null>(`/public/municipalities/resolve?lat=${encodeURIComponent(lat)}&lng=${encodeURIComponent(lng)}`);
}

async function tryRefreshToken(): Promise<boolean> {
  const rt = getRefreshToken();
  if (!rt) return false;
  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
      body: JSON.stringify({ refreshToken: rt }),
    });
    const json = await res.json();
    if (res.ok && json.success) {
      setTokens(json.data.accessToken, json.data.refreshToken);
      return true;
    }
  } catch { /* ignore */ }
  return false;
}

// ── Auth API ───────────────────────────────
export async function login(email: string, password: string): Promise<AuthUser> {
  const data = await apiFetch<AuthUser>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  setTokens(data.accessToken, data.refreshToken);
  saveUser(data);
  return data;
}

export async function register(firstName: string, lastName: string, email: string, password: string, phoneNumber?: string): Promise<AuthUser> {
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
  } catch { /* ignore */ }
  clearTokens();
}

// ── Categories ─────────────────────────────
export async function getCategories(): Promise<ApiCategory[]> {
  return apiFetch<ApiCategory[]>('/categories');
}

/** API zorunlu categoryId istediği için; "Diğer" veya ilk kategori. Gönderim anında da kullanılabilir. */
export async function getDefaultCategoryId(): Promise<string> {
  const cats = await getCategories();
  if (cats.length === 0) {
    throw new Error('Kategori listesi boş');
  }
  const fallback = cats.find((c) => c.name.includes('Diğer')) || cats[0];
  return fallback.id;
}

// ── Reports ────────────────────────────────
export async function createReport(
  title: string,
  description: string,
  categoryId: string,
  latitude: number,
  longitude: number,
  district?: string,
  mediaUrls: string[] = [],
  targetMunicipalityId?: string | null
) {
  return apiFetch<ApiReportDetail>('/reports', {
    method: 'POST',
    body: JSON.stringify({
      title,
      description,
      categoryId,
      latitude,
      longitude,
      district: district ?? null,
      mediaUrls,
      targetMunicipalityId: targetMunicipalityId ?? null,
    }),
  });
}

export async function uploadMedia(file: File): Promise<string[]> {
  const formData = new FormData();
  formData.append('files', file);

  const token = getToken();
  const headers: Record<string, string> = {
    'ngrok-skip-browser-warning': 'true',
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}/reports/upload`, {
    method: 'POST',
    headers,
    body: formData,
  });

  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(json.message || 'Resim yüklenemedi');
  return json.data as string[];
}

export async function getMyReports(page = 0, size = 20): Promise<{ content: ApiReportList[]; totalElements: number; totalPages: number }> {
  return apiFetch(`/reports/my?page=${page}&size=${size}&sort=createdAt,desc`);
}

export async function getReportDetail(id: string): Promise<ApiReportDetail> {
  return apiFetch(`/reports/${id}`);
}

export async function getReportTimeline(id: string): Promise<ReportTimelineEntry[]> {
  return apiFetch(`/reports/${id}/timeline`);
}

// ── Notifications ──────────────────────────
export async function getNotifications(page = 0, size = 20): Promise<{ content: ApiNotification[]; totalElements: number }> {
  return apiFetch(`/notifications?page=${page}&size=${size}`);
}

export async function getUnreadCount(): Promise<number> {
  return apiFetch<number>('/notifications/unread-count');
}

export async function markAllNotificationsRead(): Promise<void> {
  await apiFetch('/notifications/mark-all-read', { method: 'POST' });
}

// ── User ───────────────────────────────────
export async function getMyProfile(): Promise<ApiUserProfile> {
  return apiFetch('/users/me');
}

export async function updateFcmToken(fcmToken: string): Promise<void> {
  await apiFetch('/users/fcm-token', {
    method: 'PATCH',
    body: JSON.stringify({ fcmToken })
  });
}



