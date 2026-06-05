import { describe, it, expect, beforeEach } from 'vitest';

// Mock localStorage for Node test environment
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = String(value);
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    }
  };
})();
Object.defineProperty(global, 'localStorage', { value: localStorageMock });

import { resolveMediaUrl, getToken, setTokens, clearTokens } from './api';

describe('Citizen API Service Layer', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('manages authentication tokens in localStorage correctly', () => {
    expect(getToken()).toBeNull();
    
    setTokens('mock_access_token', 'mock_refresh_token');
    
    expect(getToken()).toBe('mock_access_token');
    
    clearTokens();
    
    expect(getToken()).toBeNull();
  });

  it('resolves relative media URLs to absolute URLs correctly', () => {
    // Relative path
    const absolute = resolveMediaUrl('/uploads/branding/123/logo.png');
    expect(absolute).toContain('/uploads/branding/123/logo.png');
    
    // Absolute HTTP path should be preserved
    expect(resolveMediaUrl('http://example.com/logo.png')).toBe('http://example.com/logo.png');
    expect(resolveMediaUrl('https://example.com/logo.png')).toBe('https://example.com/logo.png');
  });
});
