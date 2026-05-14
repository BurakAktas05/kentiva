package com.burak.belediyeapp.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

import java.util.Arrays;

/**
 * WebSocket yapılandırması — yalnızca app.websocket.enabled=true ise aktif.
 * Railway gibi serverless ortamlarda WebSocket genelde desteklenmez,
 * bu yüzden varsayılan olarak kapalıdır.
 */
@Configuration
@ConditionalOnProperty(name = "app.websocket.enabled", havingValue = "true")
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    @Value("${app.websocket.allowed-origins:*}")
    private String allowedOrigins;

    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {
        // Mesajların dağıtılacağı prefixler
        config.enableSimpleBroker("/topic");
        // Client'tan server'a gönderilecek mesajların prefix'i
        config.setApplicationDestinationPrefixes("/app");
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        // Bağlantı endpoint'i
        registry.addEndpoint("/ws-belediye")
                .setAllowedOrigins(parseCsv(allowedOrigins))
                .withSockJS();
    }

    private String[] parseCsv(String value) {
        return Arrays.stream(value.split(","))
                .map(String::trim)
                .filter(origin -> !origin.isBlank())
                .toArray(String[]::new);
    }
}
