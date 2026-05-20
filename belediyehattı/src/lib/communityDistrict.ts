import { getSavedUser, resolveMunicipalityByGps, type PublicTenant } from '../api';
import { getDevicePosition } from './deviceLocation';

export type FocusDistrictSource = 'gps' | 'profile' | 'municipality';

export type FocusDistrict = {
  district: string;
  source: FocusDistrictSource;
};

/** Belediye adından ilçe etiketi (ör. Kadıköy Belediyesi → Kadıköy). */
export function districtLabelFromTenant(tenant: PublicTenant | null | undefined): string {
  if (!tenant?.displayName) return '';
  return tenant.displayName.replace(/\s*Belediyesi\s*$/i, '').trim();
}

function normalizeDistrict(value: string): string {
  return value.trim().toLocaleLowerCase('tr-TR');
}

export function districtsMatch(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) return false;
  return normalizeDistrict(a) === normalizeDistrict(b);
}

/**
 * Topluluk ilanları için tek ilçe: önce konum (GPS → belediye), yoksa profil ilçesi, yoksa bağlı belediye.
 */
export async function resolveFocusDistrict(municipality: PublicTenant | null): Promise<FocusDistrict | null> {
  const pos = await getDevicePosition({ timeoutMs: 10000 });
  if (pos.ok) {
    try {
      const resolved = await resolveMunicipalityByGps(pos.coords.lat, pos.coords.lng);
      const fromGps = districtLabelFromTenant(resolved);
      if (fromGps) {
        return { district: fromGps, source: 'gps' };
      }
    } catch {
      /* fall through */
    }
  }

  const profileDistrict = getSavedUser()?.district?.trim();
  if (profileDistrict) {
    return { district: profileDistrict, source: 'profile' };
  }

  const fromMuni = districtLabelFromTenant(municipality);
  if (fromMuni) {
    return { district: fromMuni, source: 'municipality' };
  }

  return null;
}
