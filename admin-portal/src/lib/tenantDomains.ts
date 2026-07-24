const DEFAULT_RESERVED_SUBDOMAINS = [
  'www',
  'admin',
  'panel',
  'api',
  'app',
  'super-admin',
  'superadmin',
  'platform',
  'owner',
];

function normalizeDomain(value: string | undefined | null): string | null {
  const trimmed = value?.trim().toLowerCase() ?? '';
  if (!trimmed) return null;
  return trimmed.replace(/^\.+|\.+$/g, '');
}

function safeUrl(value: string | undefined | null): URL | null {
  try {
    return value?.trim() ? new URL(value.trim().replace(/\/$/, '')) : null;
  } catch {
    return null;
  }
}

function inferSlugForRoot(hostname: string, rootDomain: string | null): string | null {
  const normalizedHostname = normalizeDomain(hostname);
  if (!normalizedHostname || !rootDomain || normalizedHostname === rootDomain) return null;
  if (!normalizedHostname.endsWith(`.${rootDomain}`)) return null;

  const left = normalizedHostname.slice(0, -(rootDomain.length + 1));
  if (!left || left.includes('.') || reservedSubdomains().includes(left)) return null;
  return /^[a-z0-9-]+$/.test(left) ? left : null;
}

export function publicSiteBaseUrl(): URL {
  const fromEnv = import.meta.env.VITE_PUBLIC_SITE_BASE as string | undefined;
  try {
    return new URL((fromEnv?.trim() || 'https://kentiva.app').replace(/\/$/, ''));
  } catch {
    return new URL('https://kentiva.app');
  }
}

export function publicSiteRootDomain(): string | null {
  const fromEnv = normalizeDomain(import.meta.env.VITE_PUBLIC_SITE_ROOT_DOMAIN as string | undefined);
  if (fromEnv) return fromEnv;
  const host = publicSiteBaseUrl().hostname;
  return host.startsWith('www.') ? host.slice(4) : host;
}

export function adminPortalBaseUrl(): URL {
  const fromEnv = safeUrl(import.meta.env.VITE_ADMIN_PORTAL_BASE_URL as string | undefined);
  if (fromEnv) return fromEnv;
  if (typeof window !== 'undefined') return new URL(window.location.origin);
  return new URL('https://panel.kentiva.app');
}

export function municipalityPortalRootDomain(): string | null {
  return normalizeDomain(import.meta.env.VITE_MUNICIPALITY_PORTAL_ROOT_DOMAIN as string | undefined);
}

export function reservedSubdomains(): string[] {
  const raw = import.meta.env.VITE_RESERVED_SUBDOMAINS as string | undefined;
  if (!raw?.trim()) {
    return DEFAULT_RESERVED_SUBDOMAINS;
  }
  const merged = new Set(
    raw
      .split(',')
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean),
  );
  DEFAULT_RESERVED_SUBDOMAINS.forEach((item) => merged.add(item));
  return [...merged];
}

export function municipalitySubdomainUrl(slug: string): string | null {
  const rootDomain = publicSiteRootDomain();
  if (!rootDomain) return null;
  const protocol = publicSiteBaseUrl().protocol || 'https:';
  return `${protocol}//${slug}.${rootDomain}`;
}

/**
 * Municipality workspaces may use a wildcard admin domain
 * (for example belediye.panel.kentiva.app). When that infrastructure is not
 * configured, keep every login on the admin origin and scope it with a tenant
 * query parameter. This also makes local development work without DNS hacks.
 */
export function municipalityPortalUrl(slug: string): string {
  const cleanSlug = slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
  const wildcardRoot = municipalityPortalRootDomain();
  const portalBase = adminPortalBaseUrl();

  if (wildcardRoot) {
    return `${portalBase.protocol}//${cleanSlug}.${wildcardRoot}/municipality/login`;
  }

  const target = new URL('/municipality/login', portalBase);
  target.searchParams.set('tenant', cleanSlug);
  return target.toString();
}

export function municipalityPublicUrl(slug: string): string {
  const bySubdomain = municipalitySubdomainUrl(slug);
  if (bySubdomain) return bySubdomain;
  return `${publicSiteBaseUrl().toString()}/belediye/${slug}`;
}

export function departmentPublicUrl(municipalitySlug: string, departmentSlug: string): string {
  const bySubdomain = municipalitySubdomainUrl(municipalitySlug);
  if (bySubdomain) return `${bySubdomain}/departments/${departmentSlug}`;
  return `${municipalityPublicUrl(municipalitySlug)}/departments/${departmentSlug}`;
}

export function inferMunicipalitySlugFromHostname(hostname: string): string | null {
  return (
    inferSlugForRoot(hostname, municipalityPortalRootDomain()) ||
    inferSlugForRoot(hostname, publicSiteRootDomain())
  );
}

export function requestedMunicipalitySlug(
  hostname = typeof window !== 'undefined' ? window.location.hostname : '',
  search = typeof window !== 'undefined' ? window.location.search : '',
): string | null {
  const fromHost = inferMunicipalitySlugFromHostname(hostname);
  if (fromHost) return fromHost;

  const fromQuery = new URLSearchParams(search).get('tenant')?.trim().toLowerCase() ?? '';
  return /^[a-z0-9-]+$/.test(fromQuery) ? fromQuery : null;
}
