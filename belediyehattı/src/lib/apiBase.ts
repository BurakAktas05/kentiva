/** Tekil API kökü; sondaki slash kaldırılır. */
const STORAGE_KEY = 'belediye_api_base_override';

export function normalizeApiBase(raw: string | undefined): string {
  const t = (raw ?? '').trim();
  if (!t) return 'http://localhost:8080/api/v1';
  let base = t.replace(/\/+$/, '');
  if (!base.endsWith('/api/v1')) {
    base = `${base}/api/v1`;
  }
  return base;
}

export function getStoredApiBaseOverride(): string | null {
  if (typeof localStorage === 'undefined') return null;
  const v = localStorage.getItem(STORAGE_KEY)?.trim();
  return v || null;
}

export function setStoredApiBaseOverride(url: string | null): void {
  if (typeof localStorage === 'undefined') return;
  if (!url?.trim()) {
    localStorage.removeItem(STORAGE_KEY);
    return;
  }
  localStorage.setItem(STORAGE_KEY, normalizeApiBase(url));
}

export function resolveApiBase(buildTimeUrl?: string): string {
  return normalizeApiBase(getStoredApiBaseOverride() ?? buildTimeUrl);
}
