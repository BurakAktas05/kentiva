package com.burak.belediyeapp.security;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.http.server.ServletServerHttpRequest;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.web.socket.WebSocketHandler;

import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class JwtWebSocketHandshakeInterceptorTest {

    @Mock
    private JwtAuthenticationSupport jwtAuthenticationSupport;

    @Mock
    private ServerHttpResponse response;

    @Mock
    private WebSocketHandler webSocketHandler;

    @InjectMocks
    private JwtWebSocketHandshakeInterceptor interceptor;

    @Test
    void beforeHandshakeAllowsMissingToken() {
        MockHttpServletRequest servletRequest = new MockHttpServletRequest("GET", "/ws-belediye");
        ServerHttpRequest request = new ServletServerHttpRequest(servletRequest);

        boolean allowed = interceptor.beforeHandshake(request, response, webSocketHandler, new java.util.HashMap<>());

        assertThat(allowed).isTrue();
    }

    @Test
    void beforeHandshakeStoresAuthenticationWhenAuthorizationHeaderExists() {
        MockHttpServletRequest servletRequest = new MockHttpServletRequest("GET", "/ws-belediye");
        servletRequest.addHeader("Authorization", "Bearer token-123");
        ServerHttpRequest request = new ServletServerHttpRequest(servletRequest);
        UsernamePasswordAuthenticationToken auth =
                new UsernamePasswordAuthenticationToken("user", null, java.util.List.of());
        Map<String, Object> attributes = new java.util.HashMap<>();

        when(jwtAuthenticationSupport.authenticate("token-123")).thenReturn(Optional.of(auth));

        boolean allowed = interceptor.beforeHandshake(request, response, webSocketHandler, attributes);

        assertThat(allowed).isTrue();
        assertThat(attributes).containsEntry(JwtWebSocketHandshakeInterceptor.AUTH_ATTRIBUTE, auth);
    }
}
