import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  inferMunicipalitySlugFromHostname,
  municipalityPortalUrl,
  requestedMunicipalitySlug,
} from './tenantDomains';

describe('tenant portal adresleri', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('wildcard alan adı yoksa belediye girişini admin origin üzerinde tutar', () => {
    vi.stubEnv('VITE_ADMIN_PORTAL_BASE_URL', 'https://panel.kentiva.app');
    vi.stubEnv('VITE_MUNICIPALITY_PORTAL_ROOT_DOMAIN', '');

    expect(municipalityPortalUrl('Safranbolu')).toBe(
      'https://panel.kentiva.app/municipality/login?tenant=safranbolu',
    );
  });

  it('yapılandırılmış wildcard panel alan adını kullanır', () => {
    vi.stubEnv('VITE_ADMIN_PORTAL_BASE_URL', 'https://panel.kentiva.app');
    vi.stubEnv('VITE_MUNICIPALITY_PORTAL_ROOT_DOMAIN', 'panel.kentiva.app');

    expect(municipalityPortalUrl('safranbolu')).toBe(
      'https://safranbolu.panel.kentiva.app/municipality/login',
    );
    expect(inferMunicipalitySlugFromHostname('safranbolu.panel.kentiva.app')).toBe('safranbolu');
  });

  it('tenant sorgu parametresini doğrular', () => {
    expect(requestedMunicipalitySlug('panel.kentiva.app', '?tenant=gumushacikoy')).toBe('gumushacikoy');
    expect(requestedMunicipalitySlug('panel.kentiva.app', '?tenant=../admin')).toBeNull();
  });
});
