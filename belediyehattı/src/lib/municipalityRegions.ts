import type { PublicTenant } from '../api';

export function provinceKey(m: PublicTenant): string {
  return (m.provinceName?.trim() || m.displayName).trim();
}

export function groupByProvince(members: PublicTenant[]): Map<string, PublicTenant[]> {
  const map = new Map<string, PublicTenant[]>();
  for (const m of members) {
    const key = provinceKey(m);
    const bucket = map.get(key);
    if (bucket) bucket.push(m);
    else map.set(key, [m]);
  }
  for (const bucket of map.values()) {
    bucket.sort((a, b) => a.displayName.localeCompare(b.displayName, 'tr'));
  }
  return map;
}

export function sortedProvinces(map: Map<string, PublicTenant[]>): string[] {
  return [...map.keys()].sort((a, b) => a.localeCompare(b, 'tr'));
}
