package com.burak.belediyeapp.controller;

import com.burak.belediyeapp.repository.IAppUserRepository;
import com.burak.belediyeapp.security.ApiKeyAuthFilter;
import com.burak.belediyeapp.security.JwtAuthenticationSupport;
import com.burak.belediyeapp.service.media.MediaGuardClient;
import com.burak.belediyeapp.service.media.MediaSignedUrlService;
import com.burak.belediyeapp.service.report.ReportDraftAnalysisService;
import com.burak.belediyeapp.service.report.ReportService;
import com.burak.belediyeapp.service.auth.JwtService;
import com.burak.belediyeapp.service.storage.StorageService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(ReportCrudController.class)
@AutoConfigureMockMvc(addFilters = false)
class ReportControllerUploadWebMvcTest {

    @Autowired MockMvc mockMvc;

    @MockitoBean ReportService reportService;
    @MockitoBean ReportDraftAnalysisService reportDraftAnalysisService;
    @MockitoBean StorageService storageService;
    @MockitoBean MediaGuardClient mediaGuardClient;
    @MockitoBean MediaSignedUrlService mediaSignedUrlService;
    @MockitoBean JwtService jwtService;
    @MockitoBean JwtAuthenticationSupport jwtAuthenticationSupport;
    @MockitoBean IAppUserRepository userRepository;
    @MockitoBean ApiKeyAuthFilter apiKeyAuthFilter;
    @MockitoBean com.burak.belediyeapp.service.media.ImageAnonymizationService imageAnonymizationService;
    @MockitoBean com.burak.belediyeapp.security.SubscriptionInterceptor subscriptionInterceptor;
    @MockitoBean com.burak.belediyeapp.security.RateLimitInterceptor rateLimitInterceptor;
    @MockitoBean com.burak.belediyeapp.repository.IMunicipalityRepository municipalityRepository;

    @org.junit.jupiter.api.BeforeEach
    void stubBeans() throws Exception {
        org.mockito.Mockito.when(subscriptionInterceptor.preHandle(
                org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any()))
                .thenReturn(true);
        org.mockito.Mockito.when(rateLimitInterceptor.preHandle(
                org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any()))
                .thenReturn(true);
        org.mockito.Mockito.when(imageAnonymizationService.anonymize(
                org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any()))
                .thenAnswer(inv -> inv.getArgument(0));
    }

    @Test
    void imageUploadValidatesMediaAndReturnsStoredUrl() throws Exception {
        MockMultipartFile file = new MockMultipartFile("files", "photo.jpg", "image/jpeg", new byte[] {1, 2, 3});
        when(storageService.uploadBytes(any(), eq("image/jpeg"), eq("reports"), eq("photo.jpg")))
                .thenReturn("/api/v1/media/access?token=signed");

        mockMvc.perform(multipart("/api/v1/reports/upload").file(file))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data[0]").value("/api/v1/media/access?token=signed"));

        verify(mediaGuardClient).validateImageOrThrow(any(), eq("image/jpeg"));
    }

    @Test
    void nonImageUploadReturnsValidationError() throws Exception {
        MockMultipartFile file = new MockMultipartFile("files", "note.txt", "text/plain", "hello".getBytes());

        mockMvc.perform(multipart("/api/v1/reports/upload").file(file))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("INVALID_MEDIA_TYPE"));
    }
}
