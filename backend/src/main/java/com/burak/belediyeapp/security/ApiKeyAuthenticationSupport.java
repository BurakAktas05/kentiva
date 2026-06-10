package com.burak.belediyeapp.security;

import com.burak.belediyeapp.entity.MunicipalityApiKey;
import com.burak.belediyeapp.integration.ApiKeyHasher;
import com.burak.belediyeapp.integration.ApiKeyScope;
import com.burak.belediyeapp.repository.IMunicipalityApiKeyRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Component
@RequiredArgsConstructor
public class ApiKeyAuthenticationSupport {

    private static final String API_KEY_PREFIX = "bba_";

    private final IMunicipalityApiKeyRepository apiKeyRepository;

    @Transactional
    public Optional<UsernamePasswordAuthenticationToken> authenticate(String rawKey) {
        if (rawKey == null || rawKey.isBlank() || !rawKey.startsWith(API_KEY_PREFIX)) {
            return Optional.empty();
        }
        if (rawKey.length() < 20) {
            return Optional.empty();
        }
        String prefix = rawKey.substring(0, 12);
        List<MunicipalityApiKey> candidates = apiKeyRepository.findActiveByKeyPrefix(prefix);
        for (MunicipalityApiKey candidate : candidates) {
            if (ApiKeyHasher.matches(rawKey, candidate.getKeyHash())) {
                apiKeyRepository.touchLastUsed(candidate.getId(), java.time.LocalDateTime.now());
                ApiKeyPrincipal principal = new ApiKeyPrincipal(
                        candidate.getId(),
                        candidate.getMunicipality().getId(),
                        candidate.getName(),
                        ApiKeyScope.parse(candidate.getScopes())
                );
                return Optional.of(new UsernamePasswordAuthenticationToken(
                        principal,
                        null,
                        principal.getAuthorities()
                ));
            }
        }
        return Optional.empty();
    }

    public static String extractRawKey(String xApiKeyHeader, String authorizationHeader) {
        if (xApiKeyHeader != null && !xApiKeyHeader.isBlank()) {
            return xApiKeyHeader.trim();
        }
        if (authorizationHeader != null && !authorizationHeader.isBlank()) {
            String v = authorizationHeader.trim();
            if (v.regionMatches(true, 0, "ApiKey ", 0, 7)) {
                return v.substring(7).trim();
            }
        }
        return null;
    }
}
