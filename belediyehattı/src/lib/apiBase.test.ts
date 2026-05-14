import { describe, expect, it } from 'vitest';
import { normalizeApiBase } from './apiBase';

describe('normalizeApiBase', () => {
  it('returns default when missing or blank', () => {
    expect(normalizeApiBase(undefined)).toBe('http://localhost:8080/api/v1');
    expect(normalizeApiBase('')).toBe('http://localhost:8080/api/v1');
    expect(normalizeApiBase('   ')).toBe('http://localhost:8080/api/v1');
  });

  it('trims whitespace', () => {
    expect(normalizeApiBase('  http://host/api/v1  ')).toBe('http://host/api/v1');
  });

  it('strips trailing slashes', () => {
    expect(normalizeApiBase('http://host/api/v1/')).toBe('http://host/api/v1');
    expect(normalizeApiBase('http://host/api/v1///')).toBe('http://host/api/v1');
  });
});
