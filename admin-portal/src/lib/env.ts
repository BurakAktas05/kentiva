export const required = (key: string): string => {
  const value = import.meta.env[key];
  if (!value) throw new Error(`Missing required env variable: ${key}`);
  return value;
};

const getEnvWithFallback = (key1: string, key2: string): string => {
  const v1 = import.meta.env[key1];
  if (v1) return v1;
  const v2 = import.meta.env[key2];
  if (v2) return v2;
  throw new Error(`Missing required env variables: ${key1} or ${key2}`);
};

export const API_BASE = getEnvWithFallback('VITE_API_BASE', 'VITE_API_BASE_URL');

/** API base URL including `/api/v1` */
export function getApiBase(): string {
  return (import.meta.env.VITE_API_BASE as string | undefined)?.replace(/\/$/, '') ?? 'http://localhost:8080/api/v1';
}

/** Origin for SockJS (no `/api/v1` path). */
export function getBackendOrigin(): string {
  const base = getApiBase();
  const marker = '/api/';
  const idx = base.indexOf(marker);
  if (idx !== -1) return base.slice(0, idx);
  try {
    return new URL(base).origin;
  } catch {
    return 'http://localhost:8080';
  }
}

export function getSockJsUrl(): string {
  return `${getBackendOrigin().replace(/\/$/, '')}/ws-belediye`;
}

/** Göreli imzalı medya yolunu tam URL yapar (img src için). */
export function resolveMediaUrl(url: string | null | undefined): string {
  if (!url) return '';
  if (/^https?:\/\//i.test(url)) return url;
  const origin = getBackendOrigin();
  return `${origin}${url.startsWith('/') ? url : `/${url}`}`;
}
