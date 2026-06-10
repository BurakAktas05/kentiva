package com.burak.belediyeapp.integration;

import java.util.Arrays;
import java.util.Set;
import java.util.stream.Collectors;

public enum ApiKeyScope {
    REPORTS_READ("reports:read");

    private final String code;

    ApiKeyScope(String code) {
        this.code = code;
    }

    public String code() {
        return code;
    }

    public static Set<String> defaultScopes() {
        return Set.of(REPORTS_READ.code);
    }

    public static String join(Set<ApiKeyScope> scopes) {
        return scopes.stream().map(ApiKeyScope::code).collect(Collectors.joining(","));
    }

    public static Set<String> parse(String raw) {
        if (raw == null || raw.isBlank()) {
            return defaultScopes();
        }
        return Arrays.stream(raw.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .collect(Collectors.toSet());
    }

    public static boolean isValid(String scope) {
        return Arrays.stream(values()).anyMatch(v -> v.code.equals(scope));
    }
}
