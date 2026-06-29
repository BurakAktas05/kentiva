package com.burak.belediyeapp.security;

import com.burak.belediyeapp.entity.AppUser;
import com.burak.belediyeapp.entity.Municipality;
import com.burak.belediyeapp.entity.SubscriptionPlan;
import com.burak.belediyeapp.dto.response.common.ApiResponse;
import com.burak.belediyeapp.repository.IMunicipalityRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.github.bucket4j.Bucket;
import io.github.bucket4j.Bucket4j;
import io.github.bucket4j.Refill;
import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.ConsumptionProbe;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.method.HandlerMethod;
import org.springframework.web.servlet.HandlerInterceptor;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Duration;
import java.util.concurrent.TimeUnit;
import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;

@Component
@RequiredArgsConstructor
@Slf4j
public class RateLimitInterceptor implements HandlerInterceptor {

    private final IMunicipalityRepository municipalityRepository;
    private final ObjectMapper objectMapper;

    @org.springframework.beans.factory.annotation.Autowired(required = false)
    private org.springframework.data.redis.core.StringRedisTemplate redisTemplate;

    @org.springframework.beans.factory.annotation.Value("${app.cache.type:none}")
    private String cacheType;

    private final Cache<String, Bucket> buckets = Caffeine.newBuilder()
            .expireAfterAccess(Duration.ofMinutes(10))
            .maximumSize(50_000)
            .build();

    private Bucket createNewBucket(int limit, int windowSeconds) {
        return Bucket4j.builder()
                .addLimit(Bandwidth.classic(limit, Refill.intervally(limit, Duration.ofSeconds(windowSeconds))))
                .build();
    }

    private String resolveRateLimitKey(HttpServletRequest request) {
        String apiKey = request.getHeader("X-Api-Key");
        if (apiKey != null && !apiKey.isBlank()) {
            return "apikey:" + digestKey(apiKey);
        }
        String authorization = request.getHeader("Authorization");
        if (authorization != null && authorization.regionMatches(true, 0, "ApiKey ", 0, 7)) {
            String key = authorization.substring(7).trim();
            return "apikey:" + digestKey(key);
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
        Bucket bucket;
        boolean isRedisActive = "redis".equalsIgnoreCase(cacheType) && redisTemplate != null;

        // Endpoint bazlı RateLimit kontrolü
        if (handler instanceof HandlerMethod handlerMethod) {
            RateLimit rateLimit = handlerMethod.getMethodAnnotation(RateLimit.class);
            if (rateLimit == null) {
                rateLimit = handlerMethod.getBeanType().getAnnotation(RateLimit.class);
            }
            if (rateLimit != null) {
                int limit = rateLimit.requests();
                int window = rateLimit.window();
                String methodKey = rateKey + ":" + handlerMethod.getBeanType().getSimpleName() + "." + handlerMethod.getMethod().getName();
                if (isRedisActive) {
                    return tryConsumeRedis(methodKey, limit, window, response);
                } else {
                    bucket = buckets.get(methodKey, k -> createNewBucket(limit, window));
                    return tryConsumeOrReject(bucket, response, limit, window);
                }
            }
        }

        // Global / Abonelik planı bazlı limit
        String keyType = rateKey.split(":", 2)[0];
        SubscriptionPlan plan = resolveSubscriptionPlan(auth);
        int perMinute = computeRateLimit(plan, keyType);

        if (isRedisActive) {
            return tryConsumeRedis(rateKey, perMinute, 60, response);
        } else {
            bucket = buckets.get(rateKey, k -> createNewBucket(perMinute, 60));
            return tryConsumeOrReject(bucket, response, perMinute, 60);
        }
    }

    private boolean tryConsumeRedis(String key, int limit, int windowSeconds, HttpServletResponse response) throws Exception {
        try {
            String redisKey = "ratelimit:" + key;
            Long count = redisTemplate.opsForValue().increment(redisKey);
            if (count != null && count == 1) {
                redisTemplate.expire(redisKey, Duration.ofSeconds(windowSeconds));
            }

            long remaining = Math.max(0, limit - (count != null ? count : 0));
            response.setHeader("X-RateLimit-Limit", String.valueOf(limit));
            response.setHeader("X-RateLimit-Remaining", String.valueOf(remaining));

            Long ttl = redisTemplate.getExpire(redisKey, TimeUnit.SECONDS);
            long resetSeconds = (ttl != null && ttl > 0) ? ttl : windowSeconds;
            response.setHeader("X-RateLimit-Reset", String.valueOf(resetSeconds));

            if (count != null && count <= limit) {
                return true;
            }

            response.setHeader("Retry-After", String.valueOf(resetSeconds));
            writeRateLimitResponse(response);
            return false;
        } catch (Exception e) {
            log.warn("Redis rate limit kullanilamadi, yerel korumaya dusuluyor: {}", e.getMessage());
            Bucket fallbackBucket = buckets.get("redis-fallback:" + key, k -> createNewBucket(limit, windowSeconds));
            return tryConsumeOrReject(fallbackBucket, response, limit, windowSeconds);
        }
    }

    private boolean tryConsumeOrReject(Bucket bucket, HttpServletResponse response, int limit, int windowSeconds) throws Exception {
        ConsumptionProbe probe = bucket.tryConsumeAndReturnRemaining(1);
        applyRateLimitHeaders(response, limit, probe, windowSeconds);
        if (probe.isConsumed()) {
            return true;
        }
        writeRateLimitResponse(response);
        return false;
    }

    private void writeRateLimitResponse(HttpServletResponse response) throws Exception {
        response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
        response.setContentType("application/json;charset=UTF-8");
        ApiResponse<Void> body = ApiResponse.error(
                "\u00c7ok fazla istek g\u00f6nderildi. L\u00fctfen bir s\u00fcre sonra tekrar deneyin.",
                "RATE_LIMIT_EXCEEDED");
        objectMapper.writeValue(response.getWriter(), body);
    }

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

    private void applyRateLimitHeaders(HttpServletResponse response, int limit, ConsumptionProbe probe, int windowSeconds) {
        response.setHeader("X-RateLimit-Limit", String.valueOf(limit));
        response.setHeader("X-RateLimit-Remaining", String.valueOf(Math.max(0, probe.getRemainingTokens())));
        long resetSeconds = probe.getNanosToWaitForRefill() > 0
                ? Math.max(1, TimeUnit.NANOSECONDS.toSeconds(probe.getNanosToWaitForRefill()))
                : windowSeconds;
        response.setHeader("X-RateLimit-Reset", String.valueOf(resetSeconds));
        if (!probe.isConsumed()) {
            response.setHeader("Retry-After", String.valueOf(resetSeconds));
        }
    }

    private String digestKey(String rawValue) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hashed = digest.digest(rawValue.trim().getBytes(StandardCharsets.UTF_8));
            StringBuilder builder = new StringBuilder();
            for (int i = 0; i < Math.min(8, hashed.length); i++) {
                builder.append(String.format("%02x", hashed[i] & 0xff));
            }
            return builder.toString();
        } catch (NoSuchAlgorithmException e) {
            return Integer.toHexString(rawValue.hashCode());
        }
    }

}
