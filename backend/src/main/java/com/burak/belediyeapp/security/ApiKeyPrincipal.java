package com.burak.belediyeapp.security;

import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

import java.util.Collection;
import java.util.Set;
import java.util.stream.Collectors;
import java.util.stream.Stream;

/**
 * API anahtarı ile kimlik doğrulanmış entegrasyon oturumu.
 */
public class ApiKeyPrincipal {

    public static final String ROLE_API_CLIENT = "ROLE_API_CLIENT";

    private final String keyId;
    private final String municipalityId;
    private final String keyName;
    private final Set<String> scopes;

    public ApiKeyPrincipal(String keyId, String municipalityId, String keyName, Set<String> scopes) {
        this.keyId = keyId;
        this.municipalityId = municipalityId;
        this.keyName = keyName;
        this.scopes = scopes == null ? Set.of() : Set.copyOf(scopes);
    }

    public Collection<? extends GrantedAuthority> getAuthorities() {
        return Stream.concat(
                Stream.of(new SimpleGrantedAuthority(ROLE_API_CLIENT)),
                scopes.stream().map(s -> new SimpleGrantedAuthority("SCOPE_" + s.replace(':', '_').toUpperCase()))
        ).collect(Collectors.toList());
    }

    public boolean hasScope(String scope) {
        return scopes.contains(scope);
    }

    public String getKeyId() {
        return keyId;
    }

    public String getMunicipalityId() {
        return municipalityId;
    }

    public String getKeyName() {
        return keyName;
    }

    public Set<String> getScopes() {
        return scopes;
    }

    public String getUsername() {
        return "api-key:" + keyId;
    }
}
