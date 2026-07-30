package com.burak.belediyeapp.security;

import com.burak.belediyeapp.entity.AppUser;
import com.burak.belediyeapp.repository.IAppUserRepository;
import com.burak.belediyeapp.service.auth.JwtService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

/**
 * JWT'den Spring Security Authentication üretir.
 * HTTP filtresi ve WebSocket/STOMP doğrulaması tarafından paylaşılır.
 * Veritabanı yükünü azaltmak için 30 saniye ömürlü (TTL) in-memory cache kullanır.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class JwtAuthenticationSupport {

    private static final String BEARER_PREFIX = "Bearer ";
    private static final long CACHE_TTL_MS = 30_000; // 30 seconds

    private final JwtService jwtService;
    private final IAppUserRepository userRepository;
    private final TokenBlacklistService tokenBlacklistService;

    private final Map<String, CachedUser> userCache = new ConcurrentHashMap<>();

    private static class CachedUser {
        final AppUser user;
        final long cachedAt;

        CachedUser(AppUser user) {
            this.user = user;
            this.cachedAt = System.currentTimeMillis();
        }

        boolean isExpired() {
            return System.currentTimeMillis() - cachedAt > CACHE_TTL_MS;
        }
    }

    public void evictCache(String email) {
        if (email != null) {
            userCache.remove(email.trim().toLowerCase());
        }
    }

    public void clearCache() {
        userCache.clear();
    }

    @Scheduled(fixedRate = 60000)
    public void evictExpiredCacheEntries() {
        long now = System.currentTimeMillis();
        userCache.entrySet().removeIf(entry -> now - entry.getValue().cachedAt > CACHE_TTL_MS);
    }

    public Optional<UsernamePasswordAuthenticationToken> authenticate(String rawToken) {
        if (rawToken == null || rawToken.isBlank()) {
            return Optional.empty();
        }
        final String jwt = stripBearer(rawToken.trim());
        if (tokenBlacklistService.isBlacklisted(jwt)) {
            return Optional.empty();
        }
        try {
            final String email = jwtService.extractUsername(jwt);
            if (email == null) {
                return Optional.empty();
            }

            final String cacheKey = email.trim().toLowerCase();
            AppUser user = getCachedOrFetch(cacheKey);

            if (user == null || !user.isEnabled() || !jwtService.isTokenValid(jwt, user)) {
                return Optional.empty();
            }

            return Optional.of(new UsernamePasswordAuthenticationToken(
                    user,
                    null,
                    user.getAuthorities()
            ));
        } catch (io.jsonwebtoken.JwtException | IllegalArgumentException e) {
            log.warn("JWT authentication failed: {}", e.getClass().getSimpleName());
            return Optional.empty();
        } catch (RuntimeException e) {
            log.warn("JWT authentication unexpected failure: {}", e.getClass().getSimpleName());
            return Optional.empty();
        }
    }

    private AppUser getCachedOrFetch(String email) {
        CachedUser cached = userCache.get(email);
        if (cached != null && !cached.isExpired()) {
            return cached.user;
        }

        Optional<AppUser> fetched = userRepository.findByEmailWithMunicipality(email);
        if (fetched.isPresent()) {
            AppUser user = fetched.get();
            userCache.put(email, new CachedUser(user));
            return user;
        } else {
            userCache.remove(email);
            return null;
        }
    }

    public static String stripBearer(String value) {
        if (value.startsWith(BEARER_PREFIX)) {
            return value.substring(BEARER_PREFIX.length());
        }
        return value;
    }
}
