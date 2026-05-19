import { Capacitor } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';
import { isNativeApp } from './nativeShell';

export type DeviceCoords = { lat: number; lng: number };

export type DeviceLocationFailure = {
  ok: false;
  reason: 'unsupported' | 'denied' | 'unavailable' | 'timeout';
};

export type DeviceLocationResult =
  | { ok: true; coords: DeviceCoords }
  | DeviceLocationFailure;

export function isDeviceLocationFailure(r: DeviceLocationResult): r is DeviceLocationFailure {
  return r.ok === false;
}

/** Web Geolocation + Capacitor Geolocation (Android/iOS izin akışı). */
export async function getDevicePosition(
  options: { highAccuracy?: boolean; timeoutMs?: number } = {},
): Promise<DeviceLocationResult> {
  const timeoutMs = options.timeoutMs ?? 12000;
  const highAccuracy = options.highAccuracy ?? false;

  if (isNativeApp()) {
    try {
      const perm = await Geolocation.checkPermissions();
      if (perm.location === 'denied') {
        const req = await Geolocation.requestPermissions();
        if (req.location === 'denied') {
          return { ok: false, reason: 'denied' };
        }
      }
      const pos = await Geolocation.getCurrentPosition({
        enableHighAccuracy: highAccuracy,
        timeout: timeoutMs,
      });
      return { ok: true, coords: { lat: pos.coords.latitude, lng: pos.coords.longitude } };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (/denied|permission/i.test(msg)) return { ok: false, reason: 'denied' };
      if (/timeout/i.test(msg)) return { ok: false, reason: 'timeout' };
      return { ok: false, reason: 'unavailable' };
    }
  }

  if (!navigator.geolocation) {
    return { ok: false, reason: 'unsupported' };
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          ok: true,
          coords: { lat: pos.coords.latitude, lng: pos.coords.longitude },
        }),
      (err) => {
        if (err.code === err.PERMISSION_DENIED) resolve({ ok: false, reason: 'denied' });
        else if (err.code === err.TIMEOUT) resolve({ ok: false, reason: 'timeout' });
        else resolve({ ok: false, reason: 'unavailable' });
      },
      { enableHighAccuracy: highAccuracy, timeout: timeoutMs },
    );
  });
}

/** Harita uygulamasında eczane konumunu aç (native + web). */
export function openMapsNavigation(lat: number, lng: number, label?: string): void {
  const name = encodeURIComponent(label?.trim() || 'Eczane');
  const platform = Capacitor.getPlatform();
  let url: string;
  if (platform === 'ios') {
    url = `maps://?q=${lat},${lng}&ll=${lat},${lng}`;
  } else if (platform === 'android') {
    url = `geo:${lat},${lng}?q=${lat},${lng}(${name})`;
  } else {
    url = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
  }
  window.open(url, '_blank', 'noopener,noreferrer');
}
