import { describe, expect, it } from 'vitest';
import { resolvePublicApiBase } from './apiBase';

describe('resolvePublicApiBase', () => {
  it('returns default when missing or blank', () => {
    expect(resolvePublicApiBase(undefined)).toBe('http://localhost:8080/api/v1');
    expect(resolvePublicApiBase('')).toBe('http://localhost:8080/api/v1');
    expect(resolvePublicApiBase('   ')).toBe('http://localhost:8080/api/v1');
  });

  it('trims whitespace', () => {
    expect(resolvePublicApiBase('  https://api.example.com/api/v1  ')).toBe('https://api.example.com/api/v1');
  });

  it('strips trailing slashes', () => {
    expect(resolvePublicApiBase('https://api.example.com/api/v1/')).toBe('https://api.example.com/api/v1');
    expect(resolvePublicApiBase('https://api.example.com/api/v1///')).toBe('https://api.example.com/api/v1');
  });
});
