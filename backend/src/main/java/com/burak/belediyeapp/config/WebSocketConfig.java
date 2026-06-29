package com.burak.belediyeapp.config;

import com.burak.belediyeapp.security.JwtWebSocketHandshakeInterceptor;
import com.burak.belediyeapp.security.StompAuthenticationChannelInterceptor;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;
import org.springframework.web.socket.server.support.DefaultHandshakeHandler;

import java.security.Principal;
import java.util.Arrays;
import java.util.Map;

/**
 * WebSocket yapılandırması — yalnızca app.websocket.enabled=true ise aktif.
 * Railway gibi serverless ortamlarda WebSocket genelde desteklenmez,
 * bu yüzden varsayılan olarak kapalıdır.
 */
@Configuration
@ConditionalOnProperty(name = "app.websocket.enabled", havingValue = "true")
@EnableWebSocketMessageBroker
@RequiredArgsConstructor
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    private final JwtWebSocketHandshakeInterceptor handshakeInterceptor;
    private final StompAuthenticationChannelInterceptor stompAuthenticationChannelInterceptor;

    /**
     * Whitelisted WS origins (CSV). Boş bırakılırsa HİÇBİR origin handshake yapamaz —
     * üretimde APP_WEBSOCKET_ALLOWED_ORIGINS zorunludur. Vahşi joker (*) varsayılan değildir.
     */
    @Value("${app.websocket.allowed-origins:}")
    private String allowedOrigins;

    @Value("${app.websocket.allowed-origin-patterns:}")
    private String allowedOriginPatterns;

    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {
        config.enableSimpleBroker("/topic");
        config.setApplicationDestinationPrefixes("/app");
    }

    @Override
    public void configureClientInboundChannel(ChannelRegistration registration) {
        registration.interceptors(stompAuthenticationChannelInterceptor);
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        var endpoint = registry.addEndpoint("/ws-belediye")
                .addInterceptors(handshakeInterceptor)
                .setHandshakeHandler(new DefaultHandshakeHandler() {
                    @Override
                    protected Principal determineUser(
                            org.springframework.http.server.ServerHttpRequest request,
                            org.springframework.web.socket.WebSocketHandler wsHandler,
                            Map<String, Object> attributes
                    ) {
                        Object auth = attributes.get(JwtWebSocketHandshakeInterceptor.AUTH_ATTRIBUTE);
                        if (auth instanceof UsernamePasswordAuthenticationToken token) {
                            return token;
                        }
                        return null;
                    }
                });

        String[] origins = parseCsv(allowedOrigins);
        if (origins.length > 0) {
            endpoint.setAllowedOrigins(origins);
        }

        String[] originPatterns = parseCsv(allowedOriginPatterns);
        if (originPatterns.length > 0) {
            endpoint.setAllowedOriginPatterns(originPatterns);
        }

        endpoint.withSockJS();
    }

    private String[] parseCsv(String value) {
        return Arrays.stream(value.split(","))
                .map(String::trim)
                .filter(origin -> !origin.isBlank())
                .toArray(String[]::new);
    }
}
