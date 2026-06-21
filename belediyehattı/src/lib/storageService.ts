import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';

const cache = new Map<string, string>();
let isInitialized = false;

export async function initStorageService(): Promise<void> {
  if (isInitialized) return;

  if (Capacitor.isNativePlatform()) {
    try {
      const { keys } = await Preferences.keys();
      for (const key of keys) {
        const { value } = await Preferences.get({ key });
        if (value !== null) {
          cache.set(key, value);
        }
      }
    } catch (e) {
      console.error('[StorageService] Error loading native preferences:', e);
      loadWebStorage();
    }
  } else {
    loadWebStorage();
  }

  isInitialized = true;
}

function loadWebStorage() {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        const val = localStorage.getItem(key);
        if (val !== null) {
          cache.set(key, val);
        }
      }
    }
  } catch (e) {
    console.error('[StorageService] Error loading localStorage:', e);
  }
}

export const storageService = {
  getItem(key: string): string | null {
    const val = cache.get(key);
    return val !== undefined ? val : null;
  },

  setItem(key: string, value: string): void {
    cache.set(key, value);
    if (Capacitor.isNativePlatform()) {
      void Preferences.set({ key, value }).catch((err) => {
        console.error(`[StorageService] Error setting native key ${key}:`, err);
      });
    } else {
      try {
        localStorage.setItem(key, value);
      } catch (err) {
        console.error(`[StorageService] Error setting localStorage key ${key}:`, err);
      }
    }
  },

  removeItem(key: string): void {
    cache.delete(key);
    if (Capacitor.isNativePlatform()) {
      void Preferences.remove({ key }).catch((err) => {
        console.error(`[StorageService] Error removing native key ${key}:`, err);
      });
    } else {
      try {
        localStorage.removeItem(key);
      } catch (err) {
        console.error(`[StorageService] Error removing localStorage key ${key}:`, err);
      }
    }
  },

  clear(): void {
    cache.clear();
    if (Capacitor.isNativePlatform()) {
      void Preferences.clear().catch((err) => {
        console.error('[StorageService] Error clearing native preferences:', err);
      });
    } else {
      try {
        localStorage.clear();
      } catch (err) {
        console.error('[StorageService] Error clearing localStorage:', err);
      }
    }
  }
};
