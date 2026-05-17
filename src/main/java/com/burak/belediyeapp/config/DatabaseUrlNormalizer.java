package com.burak.belediyeapp.config;

import java.net.URI;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Railway / Heroku tarzı {@code postgresql://} URL'lerini Spring JDBC formatına çevirir.
 */
public final class DatabaseUrlNormalizer {

    private DatabaseUrlNormalizer() {
    }

    public static Map<String, Object> normalizeFromDatabaseUrl(String databaseUrl) {
        if (databaseUrl == null || databaseUrl.isBlank()) {
            return Map.of();
        }
        String trimmed = databaseUrl.trim();
        if (trimmed.startsWith("jdbc:")) {
            return Map.of();
        }
        if (!trimmed.startsWith("postgres://") && !trimmed.startsWith("postgresql://")) {
            return Map.of();
        }

        URI uri = URI.create(trimmed.replaceFirst("^postgresql:", "postgres:"));
        String userInfo = uri.getUserInfo();
        String username = null;
        String password = null;
        if (userInfo != null && !userInfo.isBlank()) {
            int colon = userInfo.indexOf(':');
            if (colon >= 0) {
                username = decode(userInfo.substring(0, colon));
                password = decode(userInfo.substring(colon + 1));
            } else {
                username = decode(userInfo);
            }
        }

        int port = uri.getPort() > 0 ? uri.getPort() : 5432;
        String path = uri.getPath() != null ? uri.getPath() : "";
        String query = uri.getQuery() != null ? "?" + uri.getQuery() : "";
        String jdbcUrl = "jdbc:postgresql://" + uri.getHost() + ":" + port + path + query;

        Map<String, Object> props = new LinkedHashMap<>();
        props.put("spring.datasource.url", jdbcUrl);
        if (username != null && !username.isBlank()) {
            props.put("spring.datasource.username", username);
        }
        if (password != null && !password.isBlank()) {
            props.put("spring.datasource.password", password);
        }
        return props;
    }

    private static String decode(String value) {
        return URLDecoder.decode(value, StandardCharsets.UTF_8);
    }
}
