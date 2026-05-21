package com.burak.belediyeapp.entity;

/**
 * Belediye kapsamında izole edilmesi gereken entity'ler için ortak arayüz.
 * TenantIsolationAspect bu arayüzü kullanan entity'leri otomatik denetler.
 */
public interface TenantAware {
    Municipality getMunicipality();
    void setMunicipality(Municipality municipality);
}
