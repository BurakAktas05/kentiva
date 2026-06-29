import { describe, expect, it } from 'vitest';
import { getPublicApiBaseFromEnv, resolvePublicApiBase } from './apiBase';

describe('resolvePublicApiBase', () => {
  it('returns localhost fallback only when explicitly allowed', () => {
    expect(resolvePublicApiBase(undefined, undefined, true)).toBe('http://localhost:8080/api/v1');
    expect(resolvePublicApiBase('', '', true)).toBe('http://localhost:8080/api/v1');
    expect(resolvePublicApiBase('   ', undefined, true)).toBe('http://localhost:8080/api/v1');
  });

  it('throws when production api env is missing', () => {
    expect(() => resolvePublicApiBase(undefined, undefined)).toThrow('Missing required env variable: VITE_API_BASE');
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

  it('allows localhost fallback in test mode', () => {
    expect(
      getPublicApiBaseFromEnv({
        MODE: 'test',
      }),
    ).toBe('http://localhost:8080/api/v1');
  });
});
