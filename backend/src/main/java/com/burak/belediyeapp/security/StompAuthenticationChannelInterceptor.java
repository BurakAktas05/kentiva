package com.burak.belediyeapp.security;

import com.burak.belediyeapp.entity.AppUser;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.lang.NonNull;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Component;

import java.security.Principal;
import java.util.List;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * STOMP CONNECT ve SUBSCRIBE mesajlarında kimlik ve kiracı kapsamı doğrular.
 */
@Component
@ConditionalOnProperty(name = "app.websocket.enabled", havingValue = "true")
@RequiredArgsConstructor
public class StompAuthenticationChannelInterceptor implements ChannelInterceptor {

    static final Pattern MUNICIPALITY_REPORTS_TOPIC =
            Pattern.compile("^/topic/municipality/([^/]+)/reports$");

    private static final Set<String> ALLOWED_WS_ROLES = Set.of(
            "ROLE_FIELD_OFFICER",
            "ROLE_DEPT_MANAGER",
            "ROLE_ADMIN",
            "ROLE_SUPER_ADMIN"
    );

    private final JwtAuthenticationSupport jwtAuthenticationSupport;

    @Override
    public Message<?> preSend(@NonNull Message<?> message, @NonNull MessageChannel channel) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
        if (accessor == null || accessor.getCommand() == null) {
            return message;
        }

        if (StompCommand.CONNECT.equals(accessor.getCommand())) {
            handleConnect(accessor);
        } else if (StompCommand.SUBSCRIBE.equals(accessor.getCommand())) {
            handleSubscribe(accessor);
        }
        return message;
    }

    private void handleConnect(StompHeaderAccessor accessor) {
        if (accessor.getUser() == null) {
            resolveConnectToken(accessor)
                    .flatMap(jwtAuthenticationSupport::authenticate)
                    .ifPresent(accessor::setUser);
        }

        AppUser user = requireAllowedUser(accessor);
        accessor.setUser(new UsernamePasswordAuthenticationToken(user, null, user.getAuthorities()));
    }

    private void handleSubscribe(StompHeaderAccessor accessor) {
        AppUser user = requireAllowedUser(accessor);
        String destination = accessor.getDestination();
        if (destination == null) {
            throw new AccessDeniedException("Subscription destination required");
        }

        Matcher matcher = MUNICIPALITY_REPORTS_TOPIC.matcher(destination);
        if (!matcher.matches()) {
            throw new AccessDeniedException("Subscription not permitted: " + destination);
        }

        if (user.hasRole("ROLE_SUPER_ADMIN")) {
            return;
        }

        String topicMunicipalityId = matcher.group(1);
        if (user.getMunicipality() == null
                || !topicMunicipalityId.equals(user.getMunicipality().getId())) {
            throw new AccessDeniedException("Cross-tenant subscription denied");
        }
    }

    private AppUser requireAllowedUser(StompHeaderAccessor accessor) {
        AppUser user = extractAppUser(accessor.getUser());
        if (user == null || !hasAllowedWebSocketRole(user)) {
            throw new AccessDeniedException("WebSocket authentication required");
        }
        return user;
    }

    private static java.util.Optional<String> resolveConnectToken(StompHeaderAccessor accessor) {
        List<String> authorization = accessor.getNativeHeader("Authorization");
        if (authorization != null && !authorization.isEmpty()) {
            return java.util.Optional.of(authorization.getFirst());
        }
        List<String> token = accessor.getNativeHeader("token");
        if (token != null && !token.isEmpty()) {
            return java.util.Optional.of(token.getFirst());
        }
        return java.util.Optional.empty();
    }

    private static AppUser extractAppUser(Principal principal) {
        if (principal instanceof UsernamePasswordAuthenticationToken auth
                && auth.getPrincipal() instanceof AppUser user) {
            return user;
        }
        if (principal instanceof Authentication auth
                && auth.getPrincipal() instanceof AppUser user) {
            return user;
        }
        return null;
    }

    private static boolean hasAllowedWebSocketRole(AppUser user) {
        return user.getAuthorities().stream()
                .anyMatch(a -> ALLOWED_WS_ROLES.contains(a.getAuthority()));
    }
}
