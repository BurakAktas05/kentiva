import { inferMunicipalitySlugFromHostname, publicSiteRootDomain } from './tenantDomains';

export type AuthenticatedPortalUser = {
  fullName: string;
  email: string;
  roles: string[];
  district?: string;
  municipality?: {
    id: string;
    name: string;
    slug?: string;
    displayName?: string | null;
    centerLat: number;
    centerLng: number;
    defaultZoom: number;
    subscriptionPlan?: string;
    subscriptionEndsAt?: string | null;
    daysRemaining?: number | null;
    membershipStatus?: string;
  } | null;
  departmentId?: string | null;
  departmentName?: string | null;
};

export type LoginPortalKind = 'super-admin' | 'municipality';

export const LOGIN_PORTAL_STORAGE_KEY = 'kentiva_login_portal';

export function buildPortalUser(raw: any): AuthenticatedPortalUser {
  const fullName =
    raw?.fullName ||
    [raw?.firstName, raw?.lastName].filter(Boolean).join(' ').trim() ||
    raw?.email ||
    'Kullanici';

  return {
    fullName,
    email: String(raw?.email ?? ''),
    roles: Array.isArray(raw?.roles) ? [...raw.roles] : [],
    district: raw?.district,
    municipality: raw?.municipality ?? null,
    departmentId: raw?.departmentId ?? null,
    departmentName: raw?.departmentName ?? null,
  };
}

export function isPlatformSuperAdmin(user: AuthenticatedPortalUser): boolean {
  return user.roles.includes('ROLE_SUPER_ADMIN') && !user.municipality;
}

export function portalForUser(user: AuthenticatedPortalUser): LoginPortalKind {
  return isPlatformSuperAdmin(user) ? 'super-admin' : 'municipality';
}

export function loginPathForPortal(portal: LoginPortalKind): string {
  return portal === 'super-admin' ? '/super-admin/login' : '/municipality/login';
}

function normalizeHostname(hostname: string): string {
  return hostname.trim().toLowerCase().replace(/^\.+|\.+$/g, '');
}

export function portalForHostname(hostname: string): LoginPortalKind | null {
  const normalized = normalizeHostname(hostname);
  const rootDomain = publicSiteRootDomain();

  if (!normalized || !rootDomain) {
    return null;
  }

  if (inferMunicipalitySlugFromHostname(normalized)) {
    return 'municipality';
  }

  if (normalized === `super-admin.${rootDomain}` || normalized === `superadmin.${rootDomain}`) {
    return 'super-admin';
  }

  return null;
}

export function loginPathForUser(user: AuthenticatedPortalUser): string {
  return loginPathForPortal(portalForUser(user));
}

export function loginPathForCurrentHost(fallbackPortal?: LoginPortalKind): string {
  if (typeof window !== 'undefined') {
    const hostPortal = portalForHostname(window.location.hostname);
    if (hostPortal) {
      return loginPathForPortal(hostPortal);
    }
  }

  return loginPathForPortal(fallbackPortal ?? getPreferredLoginPortal());
}

export function savePreferredLoginPortal(portal: LoginPortalKind) {
  localStorage.setItem(LOGIN_PORTAL_STORAGE_KEY, portal);
}

export function getPreferredLoginPortal(): LoginPortalKind {
  const raw = localStorage.getItem(LOGIN_PORTAL_STORAGE_KEY);
  return raw === 'super-admin' ? 'super-admin' : 'municipality';
}
