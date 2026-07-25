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
  /** Önerilen plan (Profesyonel) — sales-package FIYAT-POLITIKASI ile hizalı */
  monthlyPriceLabel: envText('VITE_MONTHLY_PRICE_LABEL', '₺9.999'),
  starterPriceLabel: envText('VITE_STARTER_PRICE_LABEL', '₺4.990'),
  enterprisePriceLabel: envText('VITE_ENTERPRISE_PRICE_LABEL', 'Teklif'),
  pilotDurationLabel: envText('VITE_PILOT_DURATION_LABEL', '90 gün'),
};

export const publicPlans = [
  {
    id: 'starter',
    name: 'Başlangıç',
    price: marketingConfig.starterPriceLabel,
    hint: 'Küçük ilçe · temel kuyruk',
    popular: false,
    features: [
      'İhbar yönetimi ve Beyaz Masa',
      'En fazla 3 departman',
      'Excel / PDF dışa aktarma',
      'Vatandaş mobil erişimi',
    ],
  },
  {
    id: 'professional',
    name: 'Profesyonel',
    price: marketingConfig.monthlyPriceLabel,
    hint: 'Önerilen · çoğu belediye',
    popular: true,
    features: [
      'Canlı harita ve AI öncelik',
      'KVKK yüz/plaka maskeleme',
      'Anket, duyuru, pazarlama kiti',
      'Sınırsız departman ve başkan özeti',
    ],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: marketingConfig.enterprisePriceLabel,
    hint: 'MIS · API · özel SLA',
    popular: false,
    features: [
      'MIS entegrasyonu',
      'Webhook / API anahtarı',
      'Özel SLA ve öncelikli destek',
      'Özel eğitim ve kurulum',
    ],
  },
] as const;

/** Prefill fields so municipal buyers send kurum / rol / ölçek in one click. */
export const DEMO_REQUEST_BODY = `Merhaba,

Kentiva için demo / pilot görüşmesi talep ediyorum.

Kurum:
Rol:
Ölçek (nüfus veya birim sayısı):

Ek notlar:
`;

export type DemoMailtoOptions = {
  subject?: string;
  body?: string;
};

/**
 * Builds a mailto URL with a structured body for demo requests.
 * Pass a string for subject-only (body still uses the kurum/rol/ölçek template),
 * or an options object to override subject and/or body.
 */
export function demoMailto(subjectOrOptions: string | DemoMailtoOptions = 'Kentiva Demo Talebi'): string {
  const subject =
    typeof subjectOrOptions === 'string'
      ? subjectOrOptions
      : (subjectOrOptions.subject ?? 'Kentiva Demo Talebi');
  const body =
    typeof subjectOrOptions === 'string'
      ? DEMO_REQUEST_BODY
      : (subjectOrOptions.body ?? DEMO_REQUEST_BODY);

  return `mailto:${marketingConfig.demoEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
