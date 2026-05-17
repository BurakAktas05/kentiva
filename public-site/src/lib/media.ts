import { getBackendOrigin } from './api';

/** Göreli medya yolunu tam URL yapar (logo vb.). */
export function resolveMediaUrl(url: string | null | undefined): string {
  if (!url) return '';
  if (/^https?:\/\//i.test(url)) return url;
  const origin = getBackendOrigin();
  return `${origin}${url.startsWith('/') ? url : `/${url}`}`;
}
