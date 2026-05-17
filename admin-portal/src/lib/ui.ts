import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Canvas / Recharts — mirrors @theme in index.css */
export const themeHex = {
  primary: '#0b4f9c',
  secondary: '#0ea5e9',
  accent: '#e6b422',
  warning: '#d97706',
  success: '#059669',
  danger: '#dc2626',
  muted: '#94a3b8',
} as const;

export const REPORT_STATUS_CHART_COLORS: Record<string, string> = {
  PENDING: themeHex.warning,
  PROCESSING: themeHex.secondary,
  RESOLVED: themeHex.success,
  REJECTED: themeHex.danger,
};

export function reportStatusBadgeClass(status: string): string {
  switch (status) {
    case 'PENDING':
      return 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200';
    case 'PROCESSING':
      return 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-200';
    case 'RESOLVED':
      return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200';
    case 'REJECTED':
      return 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200';
    default:
      return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200';
  }
}

export const heatMapGradient = {
  0.4: themeHex.secondary,
  0.65: themeHex.primary,
  0.9: themeHex.accent,
  1: themeHex.danger,
} as const;
