package com.burak.belediyeapp.config;

import java.net.URI;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Railway {@code REDIS_URL} (redis://…) değerini Spring Redis özelliklerine çevirir.
 */
public final class RedisUrlNormalizer {

    private RedisUrlNormalizer() {
    }

    public static Map<String, Object> normalizeFromRedisUrl(String redisUrl) {
        if (redisUrl == null || redisUrl.isBlank()) {
            return Map.of();
        }
        String trimmed = redisUrl.trim();
        if (!trimmed.startsWith("redis://") && !trimmed.startsWith("rediss://")) {
            return Map.of();
        }

        URI uri = URI.create(trimmed.replaceFirst("^rediss:", "redis:").replaceFirst("^redis:", "http:"));
        int port = uri.getPort() > 0 ? uri.getPort() : 6379;
        String userInfo = uri.getUserInfo();
        String password = null;
        if (userInfo != null && !userInfo.isBlank()) {
            int colon = userInfo.indexOf(':');
            password = colon >= 0 ? decode(userInfo.substring(colon + 1)) : decode(userInfo);
        }

        Map<String, Object> props = new LinkedHashMap<>();
        props.put("spring.data.redis.host", uri.getHost());
        props.put("spring.data.redis.port", port);
        if (password != null && !password.isBlank()) {
            props.put("spring.data.redis.password", password);
        }
        return props;
    }

    private static String decode(String value) {
        return URLDecoder.decode(value, StandardCharsets.UTF_8);
    }
}
