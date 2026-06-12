import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { getApiBase } from './lib/env';
import { loginPathForCurrentHost } from './lib/auth';

const REFRESH_KEY = 'refresh_token';
const TOKEN_KEY = 'token';
const THEME_KEY = 'kentiva_theme';

const api = axios.create({
  baseURL: getApiBase(),
  headers: {
    'Content-Type': 'application/json',
  },
});

let refreshPromise: Promise<boolean> | null = null;

async function refreshAccessToken(): Promise<boolean> {
  if (refreshPromise) return refreshPromise;
  refreshPromise = (async () => {
    const refresh = localStorage.getItem(REFRESH_KEY);
    if (!refresh) return false;
    try {
      const res = await axios.post(`${getApiBase()}/auth/refresh`, { refreshToken: refresh });
      const data = res.data?.data;
      if (!data?.accessToken) return false;
      localStorage.setItem(TOKEN_KEY, data.accessToken);
      if (data.refreshToken) {
        localStorage.setItem(REFRESH_KEY, data.refreshToken);
      }
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
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

function redirectToLogin() {
  const path = loginPathForCurrentHost();
  if (!window.location.pathname.startsWith(path)) {
    window.location.href = path;
  }
}

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
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
    config.headers.Authorization = `Bearer ${localStorage.getItem(TOKEN_KEY)}`;
    return api.request(config);
  },
);

export { REFRESH_KEY, TOKEN_KEY, THEME_KEY, clearAuthStorage };
export default api;

export interface Stats {
  totalReports: number;
  pendingReports: number;
  processingReports: number;
  resolvedReports: number;
  rejectedReports: number;
  forwardedReports: number;
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
