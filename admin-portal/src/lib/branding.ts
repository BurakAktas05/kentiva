/** Varsayılan marka renkleri (Kentiva mavi tonları). */
export const DEFAULT_PRIMARY = '#0b4f9c';
export const DEFAULT_SECONDARY = '#1e6bb8';
export const DEFAULT_ACCENT = '#f59e0b';

export type BrandingFormValues = {
  displayName: string;
  logoUrl: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  slogan: string;
  contactEmail: string;
  contactPhone: string;
  websiteUrl: string;
  publicStatsEnabled: boolean;
  smsResolvedTemplate: string;
  pushRejectedTitleTemplate: string;
  pushRejectedBodyTemplate: string;
  smsSenderHeader: string;
  smsProcessingTemplate: string;
  pushProcessingTitleTemplate: string;
  pushProcessingBodyTemplate: string;
  smsAssignedTemplate: string;
  pushAssignedTitleTemplate: string;
  pushAssignedBodyTemplate: string;
};

export function emptyBrandingForm(): BrandingFormValues {
  return {
    displayName: '',
    logoUrl: '',
    primaryColor: '',
    secondaryColor: '',
    accentColor: '',
    slogan: '',
    contactEmail: '',
    contactPhone: '',
    websiteUrl: '',
    publicStatsEnabled: false,
    smsResolvedTemplate: '',
    pushRejectedTitleTemplate: '',
    pushRejectedBodyTemplate: '',
    smsSenderHeader: '',
    smsProcessingTemplate: '',
    pushProcessingTitleTemplate: '',
    pushProcessingBodyTemplate: '',
    smsAssignedTemplate: '',
    pushAssignedTitleTemplate: '',
    pushAssignedBodyTemplate: '',
  };
}

/** #RGB veya #RRGGBB — geçersizse null. */
export function normalizeHex(input: string): string | null {
  const t = input.trim();
  if (!t) return null;
  const raw = t.startsWith('#') ? t.slice(1) : t;
  if (/^[0-9a-fA-F]{3}$/.test(raw)) {
    const expanded = raw
      .split('')
      .map((c) => c + c)
      .join('');
    return `#${expanded.toLowerCase()}`;
  }
  if (/^[0-9a-fA-F]{6}$/.test(raw)) {
    return `#${raw.toLowerCase()}`;
  }
  return null;
}

function hexToRgb(hex: string): [number, number, number] | null {
  const n = normalizeHex(hex);
  if (!n) return null;
  const h = n.slice(1);
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

function relativeLuminance([r, g, b]: [number, number, number]): number {
  const lin = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

/** WCAG 2.1 kontrast oranı (1–21). */
export function contrastRatio(foregroundHex: string, backgroundHex: string): number | null {
  const fg = hexToRgb(foregroundHex);
  const bg = hexToRgb(backgroundHex);
  if (!fg || !bg) return null;
  const l1 = relativeLuminance(fg);
  const l2 = relativeLuminance(bg);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

export type ContrastLevel = 'ok' | 'aa-large' | 'fail';

/** Normal metin için AA (4.5:1) kontrolü. */
export function contrastLevelOnPrimary(primaryHex: string, textHex = '#ffffff'): ContrastLevel {
  const ratio = contrastRatio(textHex, primaryHex || DEFAULT_PRIMARY);
  if (ratio == null) return 'fail';
  if (ratio >= 4.5) return 'ok';
  if (ratio >= 3) return 'aa-large';
  return 'fail';
}

export function brandingColor(value: string, fallback: string): string {
  return normalizeHex(value) ?? fallback;
}

export function isValidEmail(value: string): boolean {
  if (!value.trim()) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function isValidUrl(value: string): boolean {
  if (!value.trim()) return true;
  try {
    const u = new URL(value.trim());
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

export function publicSiteBase(): string {
  const fromEnv = import.meta.env.VITE_PUBLIC_SITE_BASE as string | undefined;
  if (fromEnv?.trim()) return fromEnv.replace(/\/$/, '');
  return 'https://kentiva.app';
}

export function municipalityPublicUrl(slug: string): string {
  return `${publicSiteBase()}/belediye/${slug}`;
}
