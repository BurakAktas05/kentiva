import axios from 'axios';
import { getApiBase } from './lib/env';

const api = axios.create({
  baseURL: getApiBase(),
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !error.config?.url?.includes('/auth/login')) {
      localStorage.clear();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;

export interface Stats {
  totalReports: number;
  pendingReports: number;
  processingReports: number;
  resolvedReports: number;
  rejectedReports: number;
  totalUsers: number;
  totalDepartments: number;
  totalCategories: number;
}

export interface Report {
  id: string;
  title: string;
  description?: string;
  status: 'PENDING' | 'PROCESSING' | 'RESOLVED' | 'REJECTED';
  categoryName: string;
  reporterFullName?: string;
  assigneeFullName?: string | null;
  district: string;
  createdAt: string;
  latitude: number;
  longitude: number;
  mediaUrls?: string[];
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

export interface ReportListItem {
  id: string;
  title: string;
  status: string;
  categoryName: string;
  latitude: number | null;
  longitude: number | null;
  createdAt: string;
  district: string;
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
}
