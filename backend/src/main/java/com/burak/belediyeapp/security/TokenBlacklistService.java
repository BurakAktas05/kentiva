package com.burak.belediyeapp.security;

import com.burak.belediyeapp.service.auth.JwtService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Access token iptal/kara liste yönetim servisi.
 * Redis aktif ise token'ları Redis'e TTL'li olarak yazar.
 * Redis yoksa in-memory ConcurrentHashMap kullanır ve periyodik olarak temizler.
 */
@Service
@Slf4j
public class TokenBlacklistService {

    @Autowired(required = false)
    private RedisTemplate<String, Object> redisTemplate;

    private final JwtService jwtService;
    private final Map<String, Long> localBlacklist = new ConcurrentHashMap<>();

    public TokenBlacklistService(JwtService jwtService) {
        this.jwtService = jwtService;
    }

    public void blacklistToken(String token, long expirationMs) {
        if (token == null || token.isBlank()) {
            return;
        }
        if (expirationMs <= 0) {
            return;
        }
        if (redisTemplate != null) {
            try {
                String key = "blacklist:" + token;
                redisTemplate.opsForValue().set(key, "revoked", Duration.ofMillis(expirationMs));
                log.debug("Token blacklisted in Redis for {} ms", expirationMs);
                return;
            } catch (Exception e) {
                log.warn("Redis blacklist save failed, falling back to local: {}", e.getMessage());
            }
        }
        long expiresAt = System.currentTimeMillis() + expirationMs;
        localBlacklist.put(token, expiresAt);
        log.debug("Token blacklisted in-memory for {} ms", expirationMs);
    }

    public boolean isBlacklisted(String token) {
        if (token == null || token.isBlank()) {
            return false;
        }
        if (redisTemplate != null) {
            try {
                String key = "blacklist:" + token;
                return Boolean.TRUE.equals(redisTemplate.hasKey(key));
            } catch (Exception e) {
                log.warn("Redis blacklist query failed, falling back to local: {}", e.getMessage());
            }
        }
        Long expiresAt = localBlacklist.get(token);
        if (expiresAt == null) {
            return false;
        }
        if (System.currentTimeMillis() > expiresAt) {
            localBlacklist.remove(token);
            return false;
        }
        return true;
    }

    public void blacklistCurrentToken() {
        try {
            var attributes = (org.springframework.web.context.request.ServletRequestAttributes)
                    org.springframework.web.context.request.RequestContextHolder.getRequestAttributes();
            if (attributes != null) {
                String authHeader = attributes.getRequest().getHeader("Authorization");
                if (authHeader != null && authHeader.startsWith("Bearer ")) {
                    String token = authHeader.substring(7).trim();
                    long remainingMs = jwtService.extractExpiration(token).getTime() - System.currentTimeMillis();
                    if (remainingMs > 0) {
                        blacklistToken(token, remainingMs);
                    }
                }
            }
        } catch (Exception e) {
            log.warn("Failed to blacklist current request token: {}", e.getMessage());
        }
    }

    @Scheduled(fixedRate = 60_000)
    public void cleanExpiredLocalBlacklist() {
        long now = System.currentTimeMillis();
        localBlacklist.entrySet().removeIf(entry -> now > entry.getValue());
    }
}
