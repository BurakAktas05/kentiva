import { describe, expect, it } from 'vitest';
import { normalizeApiBase } from './apiBase';

describe('normalizeApiBase', () => {
  it('returns localhost fallback only when explicitly allowed', () => {
    expect(normalizeApiBase(undefined, { allowLocalFallback: true })).toBe('http://localhost:8080/api/v1');
    expect(normalizeApiBase('', { allowLocalFallback: true })).toBe('http://localhost:8080/api/v1');
    expect(normalizeApiBase('   ', { allowLocalFallback: true })).toBe('http://localhost:8080/api/v1');
  });

  it('throws when production api env is missing', () => {
    expect(() => normalizeApiBase(undefined)).toThrow('Missing required env variable: VITE_API_BASE_URL');
  });

  it('trims whitespace', () => {
    expect(normalizeApiBase('  http://host/api/v1  ')).toBe('http://host/api/v1');
  });

  it('strips trailing slashes', () => {
    expect(normalizeApiBase('http://host/api/v1/')).toBe('http://host/api/v1');
    expect(normalizeApiBase('http://host/api/v1///')).toBe('http://host/api/v1');
  });
});
