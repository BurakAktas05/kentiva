package com.burak.belediyeapp.security;

import io.github.bucket4j.Bucket;
import io.github.bucket4j.Bucket4j;
import io.github.bucket4j.Refill;
import io.github.bucket4j.Bandwidth;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpStatus;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

import java.time.Duration;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class RateLimitInterceptor implements HandlerInterceptor {

    private final Map<String, Bucket> buckets = new ConcurrentHashMap<>();

    private Bucket createNewBucket() {
        return createNewBucket(60);
    }

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
        String auth = request.getHeader("Authorization");
        if (auth != null && auth.regionMatches(true, 0, "ApiKey ", 0, 7)) {
            String key = auth.substring(7).trim();
            return "apikey:" + key.substring(0, Math.min(12, key.length()));
        }
        if (request.getRequestURI().startsWith("/api/v1/integration/")) {
            return "integration:" + request.getRemoteAddr();
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

        String rateKey = resolveRateLimitKey(request);

        int perMinute = rateKey.startsWith("apikey:") ? 120 : 60;
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
     * Her 5 dakikada bir eski bucket'ları temizle — bellek sızıntısını önler.
     */
    @Scheduled(fixedRate = 300_000)
    public void cleanupBuckets() {
        if (buckets.size() > 10_000) {
            buckets.clear();
        }
    }
}
