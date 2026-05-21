const DEFAULT_RESERVED_SUBDOMAINS = [
  'www',
  'admin',
  'api',
  'app',
  'super-admin',
  'superadmin',
  'platform',
];

function normalizeDomain(value: string | undefined | null): string | null {
  const trimmed = value?.trim().toLowerCase() ?? '';
  if (!trimmed) return null;
  return trimmed.replace(/^\.+|\.+$/g, '');
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
  const normalizedHostname = normalizeDomain(hostname);
  const rootDomain = publicSiteRootDomain();
  if (!normalizedHostname || !rootDomain) return null;
  if (normalizedHostname === rootDomain) return null;
  if (!normalizedHostname.endsWith(`.${rootDomain}`)) return null;

  const left = normalizedHostname.slice(0, -(rootDomain.length + 1));
  if (!left || left.includes('.')) return null;
  if (reservedSubdomains().includes(left)) return null;
  if (!/^[a-z0-9-]+$/.test(left)) return null;
  return left;
}
