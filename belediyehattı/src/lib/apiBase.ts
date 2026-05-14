/** Tekil API kökü; sondaki slash kaldırılır. */
export function normalizeApiBase(raw: string | undefined): string {
  const t = (raw ?? '').trim();
  if (!t) return 'http://localhost:8080/api/v1';
  return t.replace(/\/+$/, '');
}
