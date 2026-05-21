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

export function tenantRootDomain(): string | null {
  const fromEnv = normalizeDomain(import.meta.env.VITE_TENANT_ROOT_DOMAIN as string | undefined);
  if (fromEnv) return fromEnv;
  const publicSiteDomain = normalizeDomain(import.meta.env.VITE_PUBLIC_SITE_ROOT_DOMAIN as string | undefined);
  return publicSiteDomain;
}

export function reservedTenantSubdomains(): string[] {
  const raw = import.meta.env.VITE_RESERVED_SUBDOMAINS as string | undefined;
  if (!raw?.trim()) return DEFAULT_RESERVED_SUBDOMAINS;
  const merged = new Set(
    raw
      .split(',')
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean),
  );
  DEFAULT_RESERVED_SUBDOMAINS.forEach((item) => merged.add(item));
  return [...merged];
}

export function inferMunicipalitySlugFromHostname(hostname: string): string | null {
  const normalizedHostname = normalizeDomain(hostname);
  const rootDomain = tenantRootDomain();
  if (!normalizedHostname || !rootDomain) return null;
  if (normalizedHostname === rootDomain) return null;
  if (!normalizedHostname.endsWith(`.${rootDomain}`)) return null;

  const left = normalizedHostname.slice(0, -(rootDomain.length + 1));
  if (!left || left.includes('.')) return null;
  if (reservedTenantSubdomains().includes(left)) return null;
  if (!/^[a-z0-9-]+$/.test(left)) return null;
  return left;
}

export function municipalityAppUrl(slug: string, pathname = '/'): string | null {
  const rootDomain = tenantRootDomain();
  if (!rootDomain) return null;
  const protocol = typeof window !== 'undefined' ? window.location.protocol : 'https:';
  const normalizedPath = pathname.startsWith('/') ? pathname : `/${pathname}`;
  return `${protocol}//${slug}.${rootDomain}${normalizedPath}`;
}
