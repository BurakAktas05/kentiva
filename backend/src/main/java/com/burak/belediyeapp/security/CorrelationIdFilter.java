package com.burak.belediyeapp.security;

import jakarta.servlet.*;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.MDC;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.UUID;

/**
 * Her gelen HTTP isteğine benzersiz bir correlationId atar.
 * logback-spring.xml içinden %mdc{correlationId} ile loglanır.
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class CorrelationIdFilter extends OncePerRequestFilter {

    private static final String CORRELATION_ID_HEADER = "X-Correlation-ID";
    private static final String REQUEST_ID_HEADER = "X-Request-ID";
    private static final String MDC_KEY = "correlationId";
    private static final int MAX_HEADER_LENGTH = 64;
    private static final java.util.regex.Pattern SAFE_HEADER_PATTERN =
            java.util.regex.Pattern.compile("[A-Za-z0-9._\\-]{8,64}");

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        String correlationId = normalizeCorrelationId(request.getHeader(CORRELATION_ID_HEADER));

        MDC.put(MDC_KEY, correlationId);
        response.setHeader(CORRELATION_ID_HEADER, correlationId);
        response.setHeader(REQUEST_ID_HEADER, correlationId);
        applySensitiveCacheHeaders(request, response);

        try {
            filterChain.doFilter(request, response);
        } finally {
            MDC.remove(MDC_KEY);
        }
    }

    private String normalizeCorrelationId(String rawHeader) {
        if (rawHeader == null) {
            return UUID.randomUUID().toString();
        }
        String candidate = rawHeader.trim();
        if (candidate.length() > MAX_HEADER_LENGTH) {
            candidate = candidate.substring(0, MAX_HEADER_LENGTH);
        }
        if (!SAFE_HEADER_PATTERN.matcher(candidate).matches()) {
            return UUID.randomUUID().toString();
        }
        return candidate;
    }

    private void applySensitiveCacheHeaders(HttpServletRequest request, HttpServletResponse response) {
        String uri = request.getRequestURI();
        if (uri == null) {
            return;
        }
        if (uri.startsWith("/api/v1/auth/")
                || uri.startsWith("/api/v1/media/access")
                || uri.startsWith("/api/v1/municipalities/me/api-keys")) {
            response.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
            response.setHeader("Pragma", "no-cache");
            response.setDateHeader("Expires", 0);
        }
    }
}
