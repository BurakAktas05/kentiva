package com.burak.belediyeapp.controller;

import com.burak.belediyeapp.dto.request.auth.LoginRequest;
import com.burak.belediyeapp.dto.request.auth.RefreshTokenRequest;
import com.burak.belediyeapp.dto.request.auth.RegisterRequest;
import com.burak.belediyeapp.dto.response.auth.AuthResponse;
import com.burak.belediyeapp.repository.IAppUserRepository;
import com.burak.belediyeapp.security.ApiKeyAuthFilter;
import com.burak.belediyeapp.security.JwtAuthenticationSupport;
import com.burak.belediyeapp.security.RateLimit;
import com.burak.belediyeapp.service.auth.AuthService;
import com.burak.belediyeapp.service.auth.JwtService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.lang.reflect.Method;
import java.util.Map;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(AuthController.class)
@AutoConfigureMockMvc(addFilters = false)
class AuthControllerWebMvcTest {

    @Autowired MockMvc mockMvc;

    @MockitoBean AuthService authService;
    @MockitoBean JwtService jwtService;
    @MockitoBean JwtAuthenticationSupport jwtAuthenticationSupport;
    @MockitoBean IAppUserRepository userRepository;
    @MockitoBean ApiKeyAuthFilter apiKeyAuthFilter;
    @MockitoBean com.burak.belediyeapp.security.SubscriptionInterceptor subscriptionInterceptor;
    @MockitoBean com.burak.belediyeapp.security.RateLimitInterceptor rateLimitInterceptor;
    @MockitoBean com.burak.belediyeapp.service.media.MediaSignedUrlService mediaSignedUrlService;

    @org.junit.jupiter.api.BeforeEach
    void stubInterceptor() throws Exception {
        org.mockito.Mockito.when(subscriptionInterceptor.preHandle(
                org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any()))
                .thenReturn(true);
        org.mockito.Mockito.when(rateLimitInterceptor.preHandle(
                org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any()))
                .thenReturn(true);
    }

    @Test
    void loginReturnsAuthResponseForValidRequest() throws Exception {
        when(authService.login(any())).thenReturn(AuthResponse.of(
                "access-token",
                "refresh-token",
                "user-1",
                "admin@example.com",
                "Admin User",
                Set.of("ROLE_ADMIN"),
                "Kadıköy",
                null
        ));

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"admin@example.com","password":"password123"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.tokenType").value("Bearer"))
                .andExpect(jsonPath("$.data.email").value("admin@example.com"));
    }

    @Test
    void loginValidationErrorReturnsConsistentEnvelope() throws Exception {
        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"not-an-email","password":""}
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.errorCode").value("VALIDATION_ERROR"));
    }

    @Test
    void sensitiveAuthEndpointsHaveExplicitRateLimits() throws Exception {
        assertRateLimit("sendRegistrationOtp", new Class<?>[] {Map.class}, 3, 60);
        assertRateLimit("register", new Class<?>[] {RegisterRequest.class}, 5, 300);
        assertRateLimit("login", new Class<?>[] {LoginRequest.class}, 5, 60);
        assertRateLimit("refreshToken", new Class<?>[] {RefreshTokenRequest.class}, 20, 60);
        assertRateLimit("forgotPassword", new Class<?>[] {Map.class}, 3, 60);
        assertRateLimit("resetPassword", new Class<?>[] {Map.class}, 5, 300);
    }

    private void assertRateLimit(String methodName, Class<?>[] parameterTypes, int requests, int window) throws Exception {
        Method method = AuthController.class.getDeclaredMethod(methodName, parameterTypes);
        RateLimit rateLimit = method.getAnnotation(RateLimit.class);
        assertThat(rateLimit).isNotNull();
        assertThat(rateLimit.requests()).isEqualTo(requests);
        assertThat(rateLimit.window()).isEqualTo(window);
    }
}
