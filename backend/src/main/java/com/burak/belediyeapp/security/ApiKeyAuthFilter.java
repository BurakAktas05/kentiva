package com.burak.belediyeapp.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.lang.NonNull;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * X-Api-Key veya Authorization: ApiKey &lt;key&gt; ile entegrasyon kimliği.
 */
@Component
@RequiredArgsConstructor
public class ApiKeyAuthFilter extends OncePerRequestFilter {

    private static final String X_API_KEY = "X-Api-Key";
    private static final String AUTHORIZATION = "Authorization";

    private final ApiKeyAuthenticationSupport apiKeyAuthenticationSupport;

    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain
    ) throws ServletException, IOException {

        if (SecurityContextHolder.getContext().getAuthentication() != null) {
            filterChain.doFilter(request, response);
            return;
        }

        String rawKey = ApiKeyAuthenticationSupport.extractRawKey(
                request.getHeader(X_API_KEY),
                request.getHeader(AUTHORIZATION)
        );

        if (rawKey != null) {
            apiKeyAuthenticationSupport.authenticate(rawKey).ifPresent(auth -> {
                auth.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                SecurityContextHolder.getContext().setAuthentication(auth);
            });
        }

        filterChain.doFilter(request, response);
    }
}
