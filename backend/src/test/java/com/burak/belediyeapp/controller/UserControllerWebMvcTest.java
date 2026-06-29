package com.burak.belediyeapp.controller;

import com.burak.belediyeapp.dto.request.user.UpdateProfileRequest;
import com.burak.belediyeapp.dto.response.user.UserResponse;
import com.burak.belediyeapp.entity.AppUser;
import com.burak.belediyeapp.repository.IAppUserRepository;
import com.burak.belediyeapp.security.ApiKeyAuthFilter;
import com.burak.belediyeapp.security.JwtAuthenticationSupport;
import com.burak.belediyeapp.service.auth.JwtService;
import com.burak.belediyeapp.service.user.UserService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(UserController.class)
@AutoConfigureMockMvc(addFilters = false)
class UserControllerWebMvcTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean private UserService userService;
    @MockitoBean private JwtService jwtService;
    @MockitoBean private JwtAuthenticationSupport jwtAuthenticationSupport;
    @MockitoBean private IAppUserRepository userRepository;
    @MockitoBean private ApiKeyAuthFilter apiKeyAuthFilter;
    @MockitoBean private com.burak.belediyeapp.security.SubscriptionInterceptor subscriptionInterceptor;
    @MockitoBean private com.burak.belediyeapp.security.RateLimitInterceptor rateLimitInterceptor;

    @BeforeEach
    void setup() throws Exception {
        when(subscriptionInterceptor.preHandle(any(), any(), any())).thenReturn(true);
        when(rateLimitInterceptor.preHandle(any(), any(), any())).thenReturn(true);

        org.springframework.security.core.context.SecurityContext context =
                org.springframework.security.core.context.SecurityContextHolder.createEmptyContext();
        context.setAuthentication(new org.springframework.security.authentication.UsernamePasswordAuthenticationToken(
                mockPrincipal(), null, java.util.Collections.emptyList()));
        org.springframework.security.core.context.SecurityContextHolder.setContext(context);
    }

    @org.junit.jupiter.api.AfterEach
    void clearSecurityContext() {
        org.springframework.security.core.context.SecurityContextHolder.clearContext();
    }

    private AppUser mockPrincipal() {
        AppUser principal = new AppUser();
        principal.setId("user-123");
        principal.setEmail("burak@kentiva.app");
        principal.setFirstName("Burak");
        principal.setLastName("Aktas");
        return principal;
    }

    @Test
    void getMyProfileReturnsUserData() throws Exception {
        UserResponse response = new UserResponse(
                "user-123",
                "Burak",
                "Aktas",
                "burak@kentiva.app",
                "+905555555555",
                List.of("ROLE_CITIZEN"),
                "Kadıköy",
                null,
                null,
                100,
                100,
                "Lvl 1",
                null,
                null,
                null,
                null
        );

        when(userService.getUserProfile(any())).thenReturn(response);

        mockMvc.perform(get("/api/v1/users/me"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.email").value("burak@kentiva.app"))
                .andExpect(jsonPath("$.data.firstName").value("Burak"));
    }

    @Test
    void updateProfileSucceedsWithValidRequest() throws Exception {
        UserResponse response = new UserResponse(
                "user-123",
                "BurakNew",
                "AktasNew",
                "burak@kentiva.app",
                "+905555555556",
                List.of("ROLE_CITIZEN"),
                "Kadıköy",
                null,
                null,
                100,
                100,
                "Lvl 1",
                null,
                null,
                null,
                null
        );

        when(userService.updateProfile(eq("user-123"), any(UpdateProfileRequest.class))).thenReturn(response);

        mockMvc.perform(patch("/api/v1/users/me")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "firstName": "BurakNew",
                                  "lastName": "AktasNew",
                                  "phoneNumber": "+905555555556"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.firstName").value("BurakNew"))
                .andExpect(jsonPath("$.data.phoneNumber").value("+905555555556"));
    }

    @Test
    void deleteMyAccountReturnsSuccess() throws Exception {
        doNothing().when(userService).eraseCitizenAccount("user-123");

        mockMvc.perform(delete("/api/v1/users/me"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("Hesap anonimlestirildi"));
    }
}
