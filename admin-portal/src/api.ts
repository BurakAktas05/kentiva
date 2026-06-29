import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { getApiBase } from './lib/env';
import { loginPathForCurrentHost } from './lib/auth';

const REFRESH_KEY = 'refresh_token';
const TOKEN_KEY = 'token';
const THEME_KEY = 'kentiva_theme';
const LEGACY_KEYS = [TOKEN_KEY, REFRESH_KEY] as const;

const api = axios.create({
  baseURL: getApiBase(),
  headers: {
    'Content-Type': 'application/json',
  },
});

type ApiErrorBody = {
  message?: string;
  errorCode?: string;
  errors?: unknown;
};

let refreshPromise: Promise<boolean> | null = null;

function getSessionStorage(): Storage | null {
  if (typeof window === 'undefined') {
    return null;
  }
  return window.sessionStorage;
}

function getLocalStorage(): Storage | null {
  if (typeof window === 'undefined') {
    return null;
  }
  return window.localStorage;
}

function readAuthValue(key: (typeof LEGACY_KEYS)[number]): string | null {
  const session = getSessionStorage();
  const local = getLocalStorage();
  const sessionValue = session?.getItem(key);
  if (sessionValue) {
    return sessionValue;
  }
  const legacyValue = local?.getItem(key);
  if (legacyValue && session) {
    session.setItem(key, legacyValue);
    local?.removeItem(key);
  }
  return legacyValue ?? null;
}

function writeAuthValue(key: (typeof LEGACY_KEYS)[number], value: string) {
  getSessionStorage()?.setItem(key, value);
  getLocalStorage()?.removeItem(key);
}

function removeAuthValue(key: (typeof LEGACY_KEYS)[number]) {
  getSessionStorage()?.removeItem(key);
  getLocalStorage()?.removeItem(key);
}

function getStoredAccessToken() {
  return readAuthValue(TOKEN_KEY);
}

function getStoredRefreshToken() {
  return readAuthValue(REFRESH_KEY);
}

function setStoredAuthTokens(accessToken: string, refreshToken?: string | null) {
  writeAuthValue(TOKEN_KEY, accessToken);
  if (refreshToken) {
    writeAuthValue(REFRESH_KEY, refreshToken);
  } else {
    removeAuthValue(REFRESH_KEY);
  }
}

async function refreshAccessToken(): Promise<boolean> {
  if (refreshPromise) return refreshPromise;
  refreshPromise = (async () => {
    const refresh = getStoredRefreshToken();
    if (!refresh) return false;
    try {
      const res = await axios.post(`${getApiBase()}/auth/refresh`, { refreshToken: refresh });
      const data = res.data?.data;
      if (!data?.accessToken) return false;
      setStoredAuthTokens(data.accessToken, data.refreshToken ?? refresh);
      return true;
    } catch {
      return false;
    } finally {
      refreshPromise = null;
    }
  })();
  return refreshPromise;
}

function clearAuthStorage() {
  removeAuthValue(TOKEN_KEY);
  removeAuthValue(REFRESH_KEY);
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
    ' at ',
  ].some((needle) => lower.includes(needle));
}

function friendlyApiMessage(status?: number, body?: ApiErrorBody): string {
  const code = body?.errorCode;
  if (code === 'RATE_LIMIT_EXCEEDED' || status === 429) {
    return 'Çok fazla istek gönderildi. Lütfen biraz sonra tekrar deneyin.';
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
  if (status && status >= 500) {
    return 'Şu anda işlem tamamlanamadı. Lütfen biraz sonra tekrar deneyin.';
  }

  const message = typeof body?.message === 'string' ? body.message.trim() : '';
  if (message && !looksTechnical(message)) {
    return message;
  }
  return 'İşlem tamamlanamadı. Lütfen biraz sonra tekrar deneyin.';
}

function normalizeErrorMessage(error: AxiosError) {
  const response = error.response;
  if (!response || typeof response.data !== 'object' || response.data === null) {
    return;
  }
  const data = response.data as ApiErrorBody;
  response.data = {
    ...data,
    message: friendlyApiMessage(response.status, data),
  };
}

function redirectToLogin() {
  const path = loginPathForCurrentHost();
  if (!window.location.pathname.startsWith(path)) {
    window.location.href = path;
  }
}

api.interceptors.request.use((config) => {
  const token = getStoredAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    normalizeErrorMessage(error);
    const config = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    const url = config?.url ?? '';
    if (error.response?.status !== 401 || url.includes('/auth/login')) {
      return Promise.reject(error);
    }
    if (config._retry) {
      clearAuthStorage();
      redirectToLogin();
      return Promise.reject(error);
    }
    const ok = await refreshAccessToken();
    if (!ok) {
      clearAuthStorage();
      redirectToLogin();
      return Promise.reject(error);
    }
    config._retry = true;
    const token = getStoredAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return api.request(config);
  },
);

export { REFRESH_KEY, TOKEN_KEY, THEME_KEY, clearAuthStorage, getStoredAccessToken, setStoredAuthTokens };
export default api;

export interface Stats {
  totalReports: number;
  pendingReports: number;
  processingReports: number;
  resolvedReports: number;
  rejectedReports: number;
  forwardedReports: number;
  outOfJurisdictionReports: number;
  totalUsers: number;
  totalDepartments: number;
  totalCategories: number;
  averageSatisfaction?: number | null;
}

export interface Report {
  id: string;
  title: string;
  description?: string;
  status: 'PENDING' | 'PROCESSING' | 'RESOLVED' | 'REJECTED' | 'FORWARDED' | 'OUT_OF_JURISDICTION';
  categoryName: string;
  reporterFullName?: string;
  assigneeFullName?: string | null;
  district: string;
  createdAt: string;
  latitude: number;
  longitude: number;
  mediaUrls?: string[];
  resolvedMediaUrls?: string[];
  aiPriority?: string | null;
  aiSummary?: string | null;
  aiSuggestedCategory?: string | null;
  aiSlaRisk?: string | null;
  aiReplyDraft?: string | null;
  aiDuplicateHint?: string | null;
  duplicateGroupId?: string | null;
  duplicateGroupSize?: number | null;
  forwardedDepartmentId?: string | null;
  forwardedDepartmentName?: string | null;
  forwardedAt?: string | null;
  forwardedByName?: string | null;
  trackingNumber?: string | null;
  qrCodeBase64?: string | null;
  slaBreached?: boolean | null;
  processedAt?: string | null;
}

export interface ReportTimelineEntry {
  at: string;
  oldStatus: string | null;
  newStatus: string | null;
  actorName: string;
  note: string | null;
}

export interface ReportListItem {
  id: string;
  title: string;
  status: string;
  categoryName: string;
  latitude: number | null;
  longitude: number | null;
  createdAt: string;
  district: string;
  duplicateGroupId?: string | null;
  duplicateGroupSize?: number | null;
  municipalityName?: string | null;
  aiPriority?: string | null;
  processedAt?: string | null;
  slaBreached?: boolean | null;
}

export interface SpringPage<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  roles: string[];
  reputationScore?: number;
  reputationLevel?: string;
  suspendedUntil?: string | null;
  suspensionReason?: string | null;
  departmentId?: string | null;
  departmentName?: string | null;
}

export type ExportFormat = 'EXCEL' | 'PDF';
export type ExportFrequency = 'DAILY' | 'WEEKLY';
export type ExportRunStatus = 'SUCCESS' | 'FAILED';

export interface ExportSchedule {
  id: string;
  municipalityName: string | null;
  format: ExportFormat;
  frequency: ExportFrequency;
  hourOfDay: number;
  enabled: boolean;
  lastRunAt: string | null;
  nextRunAt: string | null;
  createdAt: string;
}

export interface CreateExportScheduleRequest {
  format: ExportFormat;
  frequency: ExportFrequency;
  hourOfDay: number;
}

export interface ExportRun {
  id: string;
  scheduleId: string | null;
  municipalityName: string | null;
  format: ExportFormat;
  fileName: string;
  byteSize: number;
  status: ExportRunStatus;
  errorMessage?: string | null;
  createdAt: string;
}

export type PredictiveRiskLevel = 'HIGH' | 'MEDIUM' | 'LOW';

export interface PredictiveInsight {
  categoryName: string;
  district: string;
  recentCount: number;
  previousCount: number;
  openCount: number;
  trendRatio: number;
  riskLevel: PredictiveRiskLevel;
  recommendation: string;
}

export interface AuditLogEntry {
  id: string;
  username: string;
  userId: string | null;
  action: string;
  description: string | null;
  methodName: string | null;
  ipAddress: string | null;
  municipalityId: string | null;
  entityId: string | null;
  resultSummary: string | null;
  createdAt: string;
}

export interface AuditLogQueryParams {
  page?: number;
  size?: number;
  sort?: string;
  username?: string;
  action?: string;
  entityId?: string;
  from?: string;
  to?: string;
  municipalityId?: string;
}

export interface BulkReportFailure {
  reportId: string;
  message: string;
}

export interface BulkReportOperationResult {
  successCount: number;
  failureCount: number;
  failures: BulkReportFailure[];
}
