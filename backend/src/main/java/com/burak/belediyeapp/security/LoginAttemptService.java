package com.burak.belediyeapp.security;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.TimeUnit;

/**
 * Login brute-force koruması.
 * Belirli sayıda başarısız denemeden sonra IP/email bazlı kilitleme.
 */
@Component
@Slf4j
public class LoginAttemptService {

    @Value("${app.security.login.max-attempts:5}")
    private int maxAttempts;

    @Value("${app.security.login.lock-duration-minutes:15}")
    private int lockDurationMinutes;

    @Value("${app.cache.type:none}")
    private String cacheType;

    @Autowired(required = false)
    private StringRedisTemplate redisTemplate;

    private record AttemptInfo(int count, Instant lastAttempt) {}

    private final Map<String, AttemptInfo> attempts = new ConcurrentHashMap<>();

    /**
     * Başarısız deneme kaydı.
     */
    public void loginFailed(String key) {
        if (isRedisBacked()) {
            try {
                String redisKey = redisKey(key);
                Long count = redisTemplate.opsForValue().increment(redisKey);
                redisTemplate.expire(redisKey, Duration.ofMinutes(lockDurationMinutes));
                if (count != null && count >= maxAttempts) {
                    redisTemplate.expire(redisKey, Duration.ofMinutes(lockDurationMinutes));
                }
                return;
            } catch (Exception e) {
                log.warn("Redis login-attempt sayaci kullanilamadi, yerel sayaca dusuluyor: {}", e.getMessage());
            }
        }
        loginFailedInMemory(key);
    }

    private void loginFailedInMemory(String key) {
        AttemptInfo info = attempts.get(key);
        int newCount = (info == null) ? 1 : info.count() + 1;
        attempts.put(key, new AttemptInfo(newCount, Instant.now()));
    }

    /**
     * Başarılı girişte sayacı sıfırla.
     */
    public void loginSucceeded(String key) {
        if (isRedisBacked()) {
            try {
                redisTemplate.delete(redisKey(key));
            } catch (Exception e) {
                log.warn("Redis login-attempt temizleme kullanilamadi: {}", e.getMessage());
            }
        }
        attempts.remove(key);
    }

    /**
     * Kilitli mi? maxAttempts aşılmışsa ve lock süresi dolmamışsa true.
     */
    public boolean isBlocked(String key) {
        if (isRedisBacked()) {
            try {
                String value = redisTemplate.opsForValue().get(redisKey(key));
                if (value == null) {
                    return false;
                }
                return Integer.parseInt(value) >= maxAttempts;
            } catch (Exception e) {
                log.warn("Redis login-attempt kontrolu kullanilamadi, yerel sayaca dusuluyor: {}", e.getMessage());
            }
        }
        return isBlockedInMemory(key);
    }

    private boolean isBlockedInMemory(String key) {
        AttemptInfo info = attempts.get(key);
        if (info == null) return false;
        if (info.count() < maxAttempts) return false;

        // Kilit süresi dolmuş mu?
        Instant lockExpiry = info.lastAttempt().plusSeconds(lockDurationMinutes * 60L);
        if (Instant.now().isAfter(lockExpiry)) {
            attempts.remove(key);
            return false;
        }
        return true;
    }

    /**
     * Kalan kilit süresi (saniye).
     */
    public long getRemainingLockSeconds(String key) {
        if (isRedisBacked()) {
            try {
                Long ttl = redisTemplate.getExpire(redisKey(key), TimeUnit.SECONDS);
                return ttl != null && ttl > 0 ? ttl : 0;
            } catch (Exception e) {
                log.warn("Redis login-attempt TTL kullanilamadi, yerel sayaca dusuluyor: {}", e.getMessage());
            }
        }
        return getRemainingLockSecondsInMemory(key);
    }

    private long getRemainingLockSecondsInMemory(String key) {
        AttemptInfo info = attempts.get(key);
        if (info == null) return 0;
        Instant lockExpiry = info.lastAttempt().plusSeconds(lockDurationMinutes * 60L);
        long remaining = lockExpiry.getEpochSecond() - Instant.now().getEpochSecond();
        return Math.max(0, remaining);
    }

    private boolean isRedisBacked() {
        return "redis".equalsIgnoreCase(cacheType) && redisTemplate != null;
    }

    private String redisKey(String key) {
        return "security:login-attempt:" + digestKey(key == null ? "" : key.trim().toLowerCase());
    }

    private String digestKey(String value) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hashed = digest.digest(value.getBytes(StandardCharsets.UTF_8));
            StringBuilder hex = new StringBuilder(32);
            for (int i = 0; i < Math.min(16, hashed.length); i++) {
                hex.append(String.format("%02x", hashed[i]));
            }
            return hex.toString();
        } catch (NoSuchAlgorithmException e) {
            return String.valueOf(value.hashCode());
        }
    }
}
