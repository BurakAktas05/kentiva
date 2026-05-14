/** Kamu API kökü (örn. https://api.example.com/api/v1). */
export function resolvePublicApiBase(envValue: string | undefined): string {
  const t = (envValue ?? '').trim();
  if (!t) return 'http://localhost:8080/api/v1';
  return t.replace(/\/+$/, '');
}
