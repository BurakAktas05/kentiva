import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import { SecureStorage } from '@aparajita/capacitor-secure-storage';

const TOKEN_KEY = 'belediye_token';
const REFRESH_TOKEN_KEY = 'belediye_refresh_token';
const USER_KEY = 'belediye_user';
const SECURE_PREFIX = 'kentiva_auth_';

// In-memory cache for synchronous access
let cachedToken: string | null = null;
let cachedRefreshToken: string | null = null;
let cachedUserRaw: string | null = null;

let isInitialized = false;
let secureStorageReady: Promise<void> | null = null;

/**
 * Loads tokens from native secure storage or browser session storage into memory.
 * Should be called and awaited during application startup before any API requests.
 */
export async function initTokenStorage(): Promise<void> {
  if (isInitialized) return;

  if (Capacitor.isNativePlatform()) {
    try {
      cachedToken = await readNativeValue(TOKEN_KEY);
      cachedRefreshToken = await readNativeValue(REFRESH_TOKEN_KEY);
      cachedUserRaw = await readNativeValue(USER_KEY);
    } catch (e) {
      console.error('[TokenStorage] Failed to read native secure storage:', e);
      fallbackToLocalStorage();
    }
  } else {
    fallbackToLocalStorage();
  }

  isInitialized = true;
}

function fallbackToLocalStorage() {
  cachedToken = sessionStorage.getItem(TOKEN_KEY) ?? localStorage.getItem(TOKEN_KEY);
  cachedRefreshToken = sessionStorage.getItem(REFRESH_TOKEN_KEY) ?? localStorage.getItem(REFRESH_TOKEN_KEY);
  cachedUserRaw = sessionStorage.getItem(USER_KEY) ?? localStorage.getItem(USER_KEY);

  if (cachedToken) {
    sessionStorage.setItem(TOKEN_KEY, cachedToken);
    localStorage.removeItem(TOKEN_KEY);
  }
  if (cachedRefreshToken) {
    sessionStorage.setItem(REFRESH_TOKEN_KEY, cachedRefreshToken);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  }
  if (cachedUserRaw) {
    sessionStorage.setItem(USER_KEY, cachedUserRaw);
    localStorage.removeItem(USER_KEY);
  }
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
    void writeNativeValue(TOKEN_KEY, accessToken);
    void writeNativeValue(REFRESH_TOKEN_KEY, refreshToken);
  } else {
    sessionStorage.setItem(TOKEN_KEY, accessToken);
    sessionStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  }
}

export function clearTokensSync() {
  cachedToken = null;
  cachedRefreshToken = null;
  cachedUserRaw = null;

  if (Capacitor.isNativePlatform()) {
    void removeNativeValue(TOKEN_KEY);
    void removeNativeValue(REFRESH_TOKEN_KEY);
    void removeNativeValue(USER_KEY);
  } else {
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(REFRESH_TOKEN_KEY);
    sessionStorage.removeItem(USER_KEY);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }
}

export function saveUserSync(userRaw: string) {
  cachedUserRaw = userRaw;

  if (Capacitor.isNativePlatform()) {
    void writeNativeValue(USER_KEY, userRaw);
  } else {
    sessionStorage.setItem(USER_KEY, userRaw);
    localStorage.removeItem(USER_KEY);
  }
}

async function ensureSecureStorageConfigured() {
  if (!secureStorageReady) {
    secureStorageReady = SecureStorage.setKeyPrefix(SECURE_PREFIX);
  }
  return secureStorageReady;
}

async function readNativeValue(key: string): Promise<string | null> {
  try {
    await ensureSecureStorageConfigured();
    const secureValue = await SecureStorage.getItem(key);
    if (secureValue != null) {
      return secureValue;
    }
  } catch (e) {
    console.error(`[TokenStorage] Failed to read secure value for ${key}:`, e);
  }

  try {
    const legacyValue = await Preferences.get({ key });
    if (legacyValue.value != null) {
      await migrateLegacyValue(key, legacyValue.value);
      return legacyValue.value;
    }
  } catch (e) {
    console.error(`[TokenStorage] Failed to read legacy value for ${key}:`, e);
  }

  return null;
}

async function writeNativeValue(key: string, value: string) {
  try {
    await ensureSecureStorageConfigured();
    await SecureStorage.setItem(key, value);
    await Preferences.remove({ key });
  } catch (e) {
    console.error(`[TokenStorage] Failed to write secure value for ${key}:`, e);
    void Preferences.set({ key, value }).catch((legacyError) => {
      console.error(`[TokenStorage] Failed to write legacy value for ${key}:`, legacyError);
    });
  }
}

async function removeNativeValue(key: string) {
  try {
    await ensureSecureStorageConfigured();
    await SecureStorage.removeItem(key);
  } catch (e) {
    console.error(`[TokenStorage] Failed to remove secure value for ${key}:`, e);
  }

  try {
    await Preferences.remove({ key });
  } catch (e) {
    console.error(`[TokenStorage] Failed to remove legacy value for ${key}:`, e);
  }
}

async function migrateLegacyValue(key: string, value: string) {
  try {
    await ensureSecureStorageConfigured();
    await SecureStorage.setItem(key, value);
    await Preferences.remove({ key });
  } catch (e) {
    console.error(`[TokenStorage] Failed to migrate legacy value for ${key}:`, e);
  }
}
