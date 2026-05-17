/** Kamu API kökü (örn. https://api.example.com/api/v1). */
export function resolvePublicApiBase(
  apiBase?: string | undefined,
  legacyPublicBase?: string | undefined,
): string {
  const t = (apiBase ?? legacyPublicBase ?? '').trim();
  if (!t) return 'http://localhost:8080/api/v1';
  return t.replace(/\/+$/, '');
}

/** Vite ortam değişkenlerinden API kökünü çözümler. */
export function getPublicApiBaseFromEnv(env: {
  VITE_API_BASE?: string;
  VITE_PUBLIC_API_BASE?: string;
}): string {
  return resolvePublicApiBase(env.VITE_API_BASE, env.VITE_PUBLIC_API_BASE);
}
