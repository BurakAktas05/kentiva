package com.burak.belediyeapp.service.auth;

import com.burak.belediyeapp.entity.AppUser;
import com.burak.belediyeapp.entity.Role;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

class JwtServiceTest {

    private static final String TEST_SECRET = "dGhpcyBpcyBhIHRlc3Qgc2VjcmV0IGtleSB0aGF0IGlzIGxvbmcgZW5vdWdo";

    @Test
    void expiredTokenIsRejected() {
        JwtService jwtService = new JwtService();
        ReflectionTestUtils.setField(jwtService, "secretKey", TEST_SECRET);
        ReflectionTestUtils.setField(jwtService, "accessTokenExpirationMs", -1_000L);

        AppUser user = user("citizen@example.com", "ROLE_CITIZEN");
        String token = jwtService.generateAccessToken(user);

        assertThat(jwtService.isTokenValid(token, user)).isFalse();
    }

    @Test
    void validTokenIsAcceptedForSameUser() {
        JwtService jwtService = new JwtService();
        ReflectionTestUtils.setField(jwtService, "secretKey", TEST_SECRET);
        ReflectionTestUtils.setField(jwtService, "accessTokenExpirationMs", 60_000L);

        AppUser user = user("admin@example.com", "ROLE_ADMIN");
        String token = jwtService.generateAccessToken(user);

        assertThat(jwtService.isTokenValid(token, user)).isTrue();
    }

    private AppUser user(String email, String roleName) {
        Role role = new Role();
        role.setName(roleName);

        AppUser user = new AppUser();
        user.setId("user-1");
        user.setEmail(email);
        user.setRoles(Set.of(role));
        return user;
    }
}
