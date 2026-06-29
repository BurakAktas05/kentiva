const LOCAL_DEV_API_BASE = 'http://localhost:8080/api/v1';

type EnvLike = {
  VITE_API_BASE?: string;
  VITE_PUBLIC_API_BASE?: string;
  DEV?: boolean;
  MODE?: string;
};

/** Kamu API kökü (örn. https://api.example.com/api/v1). */
export function resolvePublicApiBase(
  apiBase?: string | undefined,
  legacyPublicBase?: string | undefined,
  allowLocalFallback = false,
): string {
  const t = (apiBase ?? legacyPublicBase ?? '').trim();
  if (!t) {
    if (allowLocalFallback) return LOCAL_DEV_API_BASE;
    throw new Error('Missing required env variable: VITE_API_BASE');
  }
  return t.replace(/\/+$/, '');
}

/** Vite ortam değişkenlerinden API kökünü çözümler. */
export function getPublicApiBaseFromEnv(env: EnvLike): string {
  const allowLocalFallback = Boolean(env.DEV) || env.MODE === 'test';
  return resolvePublicApiBase(env.VITE_API_BASE, env.VITE_PUBLIC_API_BASE, allowLocalFallback);
}
