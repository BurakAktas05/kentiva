import { describe, expect, it } from 'vitest';
import { getPublicApiBaseFromEnv, resolvePublicApiBase } from './apiBase';

describe('resolvePublicApiBase', () => {
  it('returns default when missing or blank', () => {
    expect(resolvePublicApiBase(undefined, undefined)).toBe('http://localhost:8080/api/v1');
    expect(resolvePublicApiBase('', '')).toBe('http://localhost:8080/api/v1');
    expect(resolvePublicApiBase('   ', undefined)).toBe('http://localhost:8080/api/v1');
  });

  it('prefers primary over legacy env', () => {
    expect(resolvePublicApiBase('https://api.example.com/api/v1', 'https://legacy.example.com')).toBe(
      'https://api.example.com/api/v1',
    );
    expect(resolvePublicApiBase(undefined, 'https://legacy.example.com/api/v1')).toBe(
      'https://legacy.example.com/api/v1',
    );
  });

  it('trims whitespace', () => {
    expect(resolvePublicApiBase('  https://api.example.com/api/v1  ', undefined)).toBe(
      'https://api.example.com/api/v1',
    );
  });

  it('strips trailing slashes', () => {
    expect(resolvePublicApiBase('https://api.example.com/api/v1/', undefined)).toBe(
      'https://api.example.com/api/v1',
    );
    expect(resolvePublicApiBase('https://api.example.com/api/v1///', undefined)).toBe(
      'https://api.example.com/api/v1',
    );
  });
});

describe('getPublicApiBaseFromEnv', () => {
  it('reads VITE_API_BASE', () => {
    expect(
      getPublicApiBaseFromEnv({
        VITE_API_BASE: 'https://api.kentiva.app/api/v1',
      }),
    ).toBe('https://api.kentiva.app/api/v1');
  });
});
