const envText = (key: keyof ImportMetaEnv, fallback: string): string => {
  const value = import.meta.env[key];
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
};

const joinPortalPath = (baseUrl: string, path: string): string => {
  const cleanBase = baseUrl.replace(/\/+$/, '');
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${cleanBase}${cleanPath}`;
};

const adminPortalUrl = envText('VITE_ADMIN_PORTAL_URL', 'https://admin.kentiva.app');

export const marketingConfig = {
  adminPortalUrl,
  municipalityPortalUrl: envText('VITE_MUNICIPALITY_PORTAL_URL', joinPortalPath(adminPortalUrl, '/login')),
  superAdminPortalUrl: envText('VITE_SUPER_ADMIN_PORTAL_URL', joinPortalPath(adminPortalUrl, '/super-admin/login')),
  citizenAppUrl: (import.meta.env.VITE_CITIZEN_APP_URL as string | undefined)?.trim() || '',
  demoEmail: envText('VITE_DEMO_EMAIL', 'demo@kentiva.app'),
  monthlyPriceLabel: envText('VITE_MONTHLY_PRICE_LABEL', '₺9.999'),
  pilotDurationLabel: envText('VITE_PILOT_DURATION_LABEL', '3 ay'),
};

export function demoMailto(subject = 'Kentiva Demo Talebi'): string {
  return `mailto:${marketingConfig.demoEmail}?subject=${encodeURIComponent(subject)}`;
}
