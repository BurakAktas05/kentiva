package com.burak.belediyeapp.controller;

import com.burak.belediyeapp.repository.IAppUserRepository;
import com.burak.belediyeapp.security.ApiKeyAuthFilter;
import com.burak.belediyeapp.security.JwtAuthenticationSupport;
import com.burak.belediyeapp.service.auth.JwtService;
import com.burak.belediyeapp.service.media.MediaSignedUrlService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;

import java.nio.file.Files;
import java.nio.file.Path;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = MediaController.class)
@Import(MediaSignedUrlService.class)
@AutoConfigureMockMvc(addFilters = false)
@TestPropertySource(properties = {
        "app.security.jwt.secret=dGhpcyBpcyBhIHRlc3Qgc2VjcmV0IGtleSB0aGF0IGlzIGxvbmcgZW5vdWdo",
        "app.media.signed-url-expiration-minutes=60",
        "app.storage.type=local"
})
class MediaControllerWebMvcTest {

    @Autowired MockMvc mockMvc;

    @MockitoBean JwtAuthenticationSupport jwtAuthenticationSupport;
    @MockitoBean ApiKeyAuthFilter apiKeyAuthFilter;
    @MockitoBean com.burak.belediyeapp.security.SubscriptionInterceptor subscriptionInterceptor;
    @MockitoBean com.burak.belediyeapp.security.RateLimitInterceptor rateLimitInterceptor;
    @MockitoBean com.burak.belediyeapp.repository.IMunicipalityRepository municipalityRepository;

    @Autowired MediaController mediaController;

    @Autowired MediaSignedUrlService mediaSignedUrlService;

    @MockitoBean JwtService jwtService;
    @MockitoBean IAppUserRepository userRepository;

    @TempDir
    Path uploadRoot;

    @BeforeEach
    void prepareFile() throws Exception {
        org.mockito.Mockito.when(subscriptionInterceptor.preHandle(
                org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any()))
                .thenReturn(true);
        org.mockito.Mockito.when(rateLimitInterceptor.preHandle(
                org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any()))
                .thenReturn(true);
        ReflectionTestUtils.setField(mediaController, "localUploadDir", uploadRoot.toString());
        ReflectionTestUtils.setField(mediaSignedUrlService, "publicBaseUrl", "");
        Path file = uploadRoot.resolve("reports").resolve("photo.jpg");
        Files.createDirectories(file.getParent());
        Files.write(file, new byte[] {1, 2, 3});
    }

    @Test
    void validTokenServesFile() throws Exception {
        String token = mediaSignedUrlService.createToken("reports/photo.jpg");
        mockMvc.perform(get("/api/v1/media/access").queryParam("token", token))
                .andExpect(status().isOk())
                .andExpect(header().string("Content-Type", "image/jpeg"));
    }

    @Test
    void invalidTokenReturnsBadRequest() throws Exception {
        mockMvc.perform(get("/api/v1/media/access").queryParam("token", "invalid"))
                .andExpect(status().isBadRequest());
    }
}
