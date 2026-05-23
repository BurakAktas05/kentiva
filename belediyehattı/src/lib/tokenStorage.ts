import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';

// In-memory cache for synchronous access
let cachedToken: string | null = null;
let cachedRefreshToken: string | null = null;
let cachedUserRaw: string | null = null;

let isInitialized = false;

/**
 * Loads tokens from native preferences or localStorage into memory.
 * Should be called and awaited during application startup before any API requests.
 */
export async function initTokenStorage(): Promise<void> {
  if (isInitialized) return;

  if (Capacitor.isNativePlatform()) {
    try {
      const tokenRes = await Preferences.get({ key: 'belediye_token' });
      const refreshRes = await Preferences.get({ key: 'belediye_refresh_token' });
      const userRes = await Preferences.get({ key: 'belediye_user' });

      cachedToken = tokenRes.value;
      cachedRefreshToken = refreshRes.value;
      cachedUserRaw = userRes.value;
    } catch (e) {
      console.error('[TokenStorage] Failed to read native preferences:', e);
      // Fallback to localStorage in case of preferences error
      fallbackToLocalStorage();
    }
  } else {
    fallbackToLocalStorage();
  }

  isInitialized = true;
}

function fallbackToLocalStorage() {
  cachedToken = localStorage.getItem('belediye_token');
  cachedRefreshToken = localStorage.getItem('belediye_refresh_token');
  cachedUserRaw = localStorage.getItem('belediye_user');
}

export function getTokenSync(): string | null {
  return cachedToken;
}

export function getRefreshTokenSync(): string | null {
  return cachedRefreshToken;
}

export function getSavedUserRawSync(): string | null {
  return cachedUserRaw;
}

export function setTokensSync(accessToken: string, refreshToken: string) {
  cachedToken = accessToken;
  cachedRefreshToken = refreshToken;

  if (Capacitor.isNativePlatform()) {
    void Preferences.set({ key: 'belediye_token', value: accessToken });
    void Preferences.set({ key: 'belediye_refresh_token', value: refreshToken });
  } else {
    localStorage.setItem('belediye_token', accessToken);
    localStorage.setItem('belediye_refresh_token', refreshToken);
  }
}

export function clearTokensSync() {
  cachedToken = null;
  cachedRefreshToken = null;
  cachedUserRaw = null;

  if (Capacitor.isNativePlatform()) {
    void Preferences.remove({ key: 'belediye_token' });
    void Preferences.remove({ key: 'belediye_refresh_token' });
    void Preferences.remove({ key: 'belediye_user' });
  } else {
    localStorage.removeItem('belediye_token');
    localStorage.removeItem('belediye_refresh_token');
    localStorage.removeItem('belediye_user');
  }
}

export function saveUserSync(userRaw: string) {
  cachedUserRaw = userRaw;

  if (Capacitor.isNativePlatform()) {
    void Preferences.set({ key: 'belediye_user', value: userRaw });
  } else {
    localStorage.setItem('belediye_user', userRaw);
  }
}
