import { describe, expect, it } from 'vitest';
import { DEMO_REQUEST_BODY, demoMailto, marketingConfig } from './marketing';

describe('demoMailto', () => {
  it('includes structured kurum / rol / ölçek body by default', () => {
    const href = demoMailto();
    expect(href.startsWith(`mailto:${marketingConfig.demoEmail}?`)).toBe(true);
    expect(href).toContain(encodeURIComponent('Kentiva Demo Talebi'));
    expect(href).toContain(encodeURIComponent('Kurum:'));
    expect(href).toContain(encodeURIComponent('Rol:'));
    expect(href).toContain(encodeURIComponent('Ölçek (nüfus veya birim sayısı):'));
  });

  it('accepts a custom subject string while keeping the template body', () => {
    const href = demoMailto('Kentiva Bilgi Talebi');
    expect(href).toContain(encodeURIComponent('Kentiva Bilgi Talebi'));
    expect(href).toContain(encodeURIComponent(DEMO_REQUEST_BODY));
  });

  it('allows overriding subject and body via options', () => {
    const href = demoMailto({ subject: 'Özel konu', body: 'Özel gövde' });
    expect(href).toContain(encodeURIComponent('Özel konu'));
    expect(href).toContain(encodeURIComponent('Özel gövde'));
  });
});
