package com.burak.belediyeapp.security;

import com.burak.belediyeapp.entity.AppUser;
import com.burak.belediyeapp.entity.Municipality;
import com.burak.belediyeapp.entity.Role;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.MessageBuilder;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;

import java.util.Set;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class StompAuthenticationChannelInterceptorTest {

    @Mock
    private JwtAuthenticationSupport jwtAuthenticationSupport;

    @Mock
    private MessageChannel channel;

    @InjectMocks
    private StompAuthenticationChannelInterceptor interceptor;

    private AppUser adminUser;

    @BeforeEach
    void setUp() {
        Role role = new Role();
        role.setName("ROLE_ADMIN");

        Municipality municipality = new Municipality();
        municipality.setId("muni-1");

        adminUser = new AppUser();
        adminUser.setId("user-1");
        adminUser.setEmail("admin@example.com");
        adminUser.setRoles(Set.of(role));
        adminUser.setMunicipality(municipality);
    }

    @Test
    void subscribeOwnMunicipalityTopicIsAllowed() {
        Message<?> message = subscribeMessage(adminUser, "/topic/municipality/muni-1/reports");
        assertThatCode(() -> interceptor.preSend(message, channel)).doesNotThrowAnyException();
    }

    @Test
    void subscribeOtherMunicipalityTopicIsRejected() {
        Message<?> message = subscribeMessage(adminUser, "/topic/municipality/other-muni/reports");
        assertThatThrownBy(() -> interceptor.preSend(message, channel))
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    void connectWithoutUserIsRejected() {
        StompHeaderAccessor accessor = StompHeaderAccessor.create(StompCommand.CONNECT);
        accessor.setLeaveMutable(true);
        Message<?> message = MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());

        assertThatThrownBy(() -> interceptor.preSend(message, channel))
                .isInstanceOf(AccessDeniedException.class);
    }

    private Message<?> subscribeMessage(AppUser user, String destination) {
        StompHeaderAccessor accessor = StompHeaderAccessor.create(StompCommand.SUBSCRIBE);
        accessor.setLeaveMutable(true);
        accessor.setUser(new UsernamePasswordAuthenticationToken(user, null, user.getAuthorities()));
        accessor.setDestination(destination);
        return MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());
    }
}
