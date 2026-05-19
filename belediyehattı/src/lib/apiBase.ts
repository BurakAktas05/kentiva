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



/** Tam kök URL (medya imzası vb.) — göreli /api/v1 ise tarayıcı kökü kullanılır. */
export function apiOriginFromBase(base: string): string {
  const b = base.trim();
  if (b.startsWith('/')) {
    if (typeof window !== 'undefined' && window.location?.origin) {
      return window.location.origin;
    }
    return 'http://localhost:3000';
  }
  return b.replace(/\/api\/v1\/?$/i, '') || 'http://localhost:8080';
}

export function resolveApiBase(buildTimeUrl?: string): string {
  const override = getStoredApiBaseOverride();
  if (override) {
    return normalizeApiBase(override);
  }
  // Yerel Vite: aynı origin + proxy → CORS / ölü tünel URL sorunu yok
  if (typeof import.meta !== 'undefined' && import.meta.env?.DEV) {
    return '/api/v1';
  }
  return normalizeApiBase(buildTimeUrl);
}

/** Dev modda kayıtlı API adresi ayakta değilse sıfırla. */
export async function clearStaleApiOverrideIfNeeded(): Promise<void> {
  if (typeof import.meta === 'undefined' || !import.meta.env?.DEV) return;
  const override = getStoredApiBaseOverride();
  if (!override) return;
  const root = apiOriginFromBase(override);
  try {
    const res = await fetch(`${root}/actuator/health`, {
      signal: AbortSignal.timeout(4000),
    });
    const json = await res.json();
    if (res.ok && (json.status === 'UP' || json.status === 'up')) return;
  } catch {
    /* stale */
  }
  setStoredApiBaseOverride(null);
}


