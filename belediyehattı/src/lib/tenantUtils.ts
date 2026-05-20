import type { PublicTenant } from '../api';

/** API / profil yanıtını TenantContext ile uyumlu hale getirir. */
export function toPublicTenant(raw: Partial<PublicTenant> & { id: string }): PublicTenant {
  return {
    id: raw.id,
    slug: raw.slug ?? '',
    displayName: raw.displayName ?? '',
    provinceName: raw.provinceName ?? null,
    parentId: raw.parentId ?? null,
    logoUrl: raw.logoUrl ?? null,
    primaryColor: raw.primaryColor ?? null,
    secondaryColor: raw.secondaryColor ?? null,
    accentColor: raw.accentColor ?? null,
    slogan: raw.slogan ?? null,
    centerLat: raw.centerLat ?? 41,
    centerLng: raw.centerLng ?? 29,
    active: Boolean(raw.active),
    onboarded: Boolean(raw.onboarded),
  };
}
