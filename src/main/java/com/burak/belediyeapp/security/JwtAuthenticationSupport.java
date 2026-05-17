package com.burak.belediyeapp.security;

import com.burak.belediyeapp.repository.IAppUserRepository;
import com.burak.belediyeapp.service.auth.JwtService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.stereotype.Component;

import java.util.Optional;

/**
 * JWT'den Spring Security Authentication üretir.
 * HTTP filtresi ve WebSocket/STOMP doğrulaması tarafından paylaşılır.
 */
@Component
@RequiredArgsConstructor
public class JwtAuthenticationSupport {

    private static final String BEARER_PREFIX = "Bearer ";

    private final JwtService jwtService;
    private final IAppUserRepository userRepository;

    public Optional<UsernamePasswordAuthenticationToken> authenticate(String rawToken) {
        if (rawToken == null || rawToken.isBlank()) {
            return Optional.empty();
        }
        final String jwt = stripBearer(rawToken.trim());
        try {
            final String email = jwtService.extractUsername(jwt);
            if (email == null) {
                return Optional.empty();
            }
            return userRepository.findByEmailWithMunicipality(email)
                    .filter(user -> user.isEnabled() && jwtService.isTokenValid(jwt, user))
                    .map(user -> new UsernamePasswordAuthenticationToken(
                            user,
                            null,
                            user.getAuthorities()
                    ));
        } catch (Exception e) {
            return Optional.empty();
        }
    }

    public static String stripBearer(String value) {
        if (value.startsWith(BEARER_PREFIX)) {
            return value.substring(BEARER_PREFIX.length());
        }
        return value;
    }
}
