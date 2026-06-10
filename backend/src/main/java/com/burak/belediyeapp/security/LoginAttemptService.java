package com.burak.belediyeapp.security;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Login brute-force koruması.
 * Belirli sayıda başarısız denemeden sonra IP/email bazlı kilitleme.
 */
@Component
public class LoginAttemptService {

    @Value("${app.security.login.max-attempts:5}")
    private int maxAttempts;

    @Value("${app.security.login.lock-duration-minutes:15}")
    private int lockDurationMinutes;

    private record AttemptInfo(int count, Instant lastAttempt) {}

    private final Map<String, AttemptInfo> attempts = new ConcurrentHashMap<>();

    /**
     * Başarısız deneme kaydı.
     */
    public void loginFailed(String key) {
        AttemptInfo info = attempts.get(key);
        int newCount = (info == null) ? 1 : info.count() + 1;
        attempts.put(key, new AttemptInfo(newCount, Instant.now()));
    }

    /**
     * Başarılı girişte sayacı sıfırla.
     */
    public void loginSucceeded(String key) {
        attempts.remove(key);
    }

    /**
     * Kilitli mi? maxAttempts aşılmışsa ve lock süresi dolmamışsa true.
     */
    public boolean isBlocked(String key) {
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
        AttemptInfo info = attempts.get(key);
        if (info == null) return 0;
        Instant lockExpiry = info.lastAttempt().plusSeconds(lockDurationMinutes * 60L);
        long remaining = lockExpiry.getEpochSecond() - Instant.now().getEpochSecond();
        return Math.max(0, remaining);
    }
}
