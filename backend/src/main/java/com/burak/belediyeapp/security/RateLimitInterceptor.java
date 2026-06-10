package com.burak.belediyeapp.security;

import com.burak.belediyeapp.entity.AppUser;
import com.burak.belediyeapp.entity.Municipality;
import com.burak.belediyeapp.entity.SubscriptionPlan;
import com.burak.belediyeapp.repository.IMunicipalityRepository;
import io.github.bucket4j.Bucket;
import io.github.bucket4j.Bucket4j;
import io.github.bucket4j.Refill;
import io.github.bucket4j.Bandwidth;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

import java.time.Duration;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Component
@RequiredArgsConstructor
public class RateLimitInterceptor implements HandlerInterceptor {

    private final IMunicipalityRepository municipalityRepository;

    private final Map<String, Bucket> buckets = new ConcurrentHashMap<>();

    private Bucket createNewBucket(int perMinute) {
        return Bucket4j.builder()
                .addLimit(Bandwidth.classic(perMinute, Refill.intervally(perMinute, Duration.ofMinutes(1))))
                .build();
    }

    private String resolveRateLimitKey(HttpServletRequest request) {
        String apiKey = request.getHeader("X-Api-Key");
        if (apiKey != null && !apiKey.isBlank()) {
            return "apikey:" + apiKey.substring(0, Math.min(12, apiKey.length()));
        }
        String authorization = request.getHeader("Authorization");
        if (authorization != null && authorization.regionMatches(true, 0, "ApiKey ", 0, 7)) {
            String key = authorization.substring(7).trim();
            return "apikey:" + key.substring(0, Math.min(12, key.length()));
        }
        if (request.getRequestURI().startsWith("/api/v1/integration/")) {
            return "integration:" + request.getRemoteAddr();
        }
        Authentication securityAuth = SecurityContextHolder.getContext().getAuthentication();
        if (securityAuth != null && securityAuth.isAuthenticated()
                && !"anonymousUser".equals(securityAuth.getPrincipal())) {
            return "user:" + securityAuth.getName();
        }
        String ip = request.getHeader("X-Forwarded-For");
        if (ip == null || ip.isBlank()) {
            ip = request.getRemoteAddr();
        } else {
            ip = ip.split(",")[0].trim();
        }
        return "ip:" + ip;
    }

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws Exception {
        // Sadece API requestlerini limitle
        if (!request.getRequestURI().startsWith("/api/v1")) {
            return true;
        }

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();

        // Super admin bypass
        if (auth != null && auth.isAuthenticated() && auth.getPrincipal() instanceof AppUser user) {
            if (user.hasRole("ROLE_SUPER_ADMIN")) {
                return true;
            }
        }

        String rateKey = resolveRateLimitKey(request);
        String keyType = rateKey.split(":", 2)[0];

        SubscriptionPlan plan = resolveSubscriptionPlan(auth);
        int perMinute = computeRateLimit(plan, keyType);

        Bucket bucket = buckets.computeIfAbsent(rateKey, k -> createNewBucket(perMinute));

        if (bucket.tryConsume(1)) {
            return true;
        } else {
            response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
            response.setContentType("application/json;charset=UTF-8");
            response.getWriter().write("{\"success\":false,\"message\":\"Çok fazla istek gönderildi. Lütfen bir süre sonra tekrar deneyin.\",\"errorCode\":\"RATE_LIMIT_EXCEEDED\"}");
            return false;
        }
    }

    /**
     * Mevcut kimlik doğrulamasından abonelik planını çözümler.
     */
    private SubscriptionPlan resolveSubscriptionPlan(Authentication auth) {
        if (auth == null || !auth.isAuthenticated() || "anonymousUser".equals(auth.getPrincipal())) {
            return null;
        }

        Object principal = auth.getPrincipal();

        if (principal instanceof AppUser user) {
            Municipality m = user.getMunicipality();
            if (m != null) {
                return m.getSubscriptionPlan();
            }
            return null;
        }

        if (principal instanceof ApiKeyPrincipal apiKey) {
            String muniId = apiKey.getMunicipalityId();
            if (muniId != null) {
                return municipalityRepository.findById(muniId)
                        .map(Municipality::getSubscriptionPlan)
                        .orElse(null);
            }
            return null;
        }

        return null;
    }

    /**
     * Abonelik planı ve istek türüne göre dakika başı limit hesaplar.
     */
    private int computeRateLimit(SubscriptionPlan plan, String keyType) {
        if (plan == SubscriptionPlan.ENTERPRISE) {
            return switch (keyType) {
                case "user"        -> 1000;
                case "apikey"      -> 300;
                case "integration" -> 200;
                default            -> 300;
            };
        }

        if (plan == SubscriptionPlan.STANDARD) {
            return switch (keyType) {
                case "user"        -> 300;
                case "apikey"      -> 120;
                case "integration" -> 90;
                default            -> 120;
            };
        }

        // TRIAL or null
        return switch (keyType) {
            case "user"        -> 100;
            case "apikey"      -> 60;
            case "integration" -> 45;
            default            -> 60;
        };
    }

    /**
     * Her 5 dakikada bir eski bucket'ları temizle — bellek sızıntısını önler.
     */
    @Scheduled(fixedRate = 300_000)
    public void cleanupBuckets() {
        if (buckets.size() > 10_000) {
            buckets.clear();
        }
    }
}
