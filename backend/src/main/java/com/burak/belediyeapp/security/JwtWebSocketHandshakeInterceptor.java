package com.burak.belediyeapp.security;

import lombok.RequiredArgsConstructor;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.http.server.ServletServerHttpRequest;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.server.HandshakeInterceptor;

import java.util.List;
import java.util.Map;

/**
 * SockJS/WebSocket HTTP el sıkışmasında JWT doğrular.
 * Geçersiz veya eksik token ile bağlantı reddedilir.
 */
@Component
@ConditionalOnProperty(name = "app.websocket.enabled", havingValue = "true")
@RequiredArgsConstructor
public class JwtWebSocketHandshakeInterceptor implements HandshakeInterceptor {

    public static final String AUTH_ATTRIBUTE = "wsAuthentication";

    private final JwtAuthenticationSupport jwtAuthenticationSupport;

    @Override
    public boolean beforeHandshake(
            @NonNull ServerHttpRequest request,
            @NonNull ServerHttpResponse response,
            @NonNull WebSocketHandler wsHandler,
            @NonNull Map<String, Object> attributes
    ) {
        String token = resolveToken(request);
        if (token == null || token.isBlank()) {
            return true;
        }
        return jwtAuthenticationSupport.authenticate(token)
                .map(auth -> {
                    attributes.put(AUTH_ATTRIBUTE, auth);
                    return true;
                })
                .orElse(false);
    }

    @Override
    public void afterHandshake(
            @NonNull ServerHttpRequest request,
            @NonNull ServerHttpResponse response,
            @NonNull WebSocketHandler wsHandler,
            Exception exception
    ) {
        // no-op
    }

    static String resolveToken(ServerHttpRequest request) {
        List<String> authHeaders = request.getHeaders().get("Authorization");
        if (authHeaders != null && !authHeaders.isEmpty()) {
            String header = authHeaders.getFirst();
            if (header != null && header.startsWith("Bearer ")) {
                return header.substring("Bearer ".length());
            }
        }
        if (request instanceof ServletServerHttpRequest servletRequest) {
            String queryToken = servletRequest.getServletRequest().getParameter("token");
            if (queryToken != null && !queryToken.isBlank()) {
                return queryToken;
            }
        }
        return null;
    }
}
