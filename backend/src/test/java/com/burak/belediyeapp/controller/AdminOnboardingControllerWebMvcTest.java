package com.burak.belediyeapp.controller;

import com.burak.belediyeapp.repository.IAppUserRepository;
import com.burak.belediyeapp.security.ApiKeyAuthFilter;
import com.burak.belediyeapp.security.JwtAuthenticationSupport;
import com.burak.belediyeapp.service.auth.JwtService;
import com.burak.belediyeapp.service.geo.OsmBoundaryService;
import com.burak.belediyeapp.service.municipality.MunicipalityOnboardingService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Optional;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(AdminOnboardingController.class)
@AutoConfigureMockMvc(addFilters = false)
class AdminOnboardingControllerWebMvcTest {

    @Autowired MockMvc mockMvc;

    @MockitoBean MunicipalityOnboardingService municipalityOnboardingService;
    @MockitoBean OsmBoundaryService osmBoundaryService;
    @MockitoBean JwtService jwtService;
    @MockitoBean JwtAuthenticationSupport jwtAuthenticationSupport;
    @MockitoBean IAppUserRepository userRepository;
    @MockitoBean ApiKeyAuthFilter apiKeyAuthFilter;
    @MockitoBean com.burak.belediyeapp.security.SubscriptionInterceptor subscriptionInterceptor;
    @MockitoBean com.burak.belediyeapp.security.RateLimitInterceptor rateLimitInterceptor;

    @BeforeEach
    void stubInterceptor() throws Exception {
        Mockito.when(subscriptionInterceptor.preHandle(any(), any(), any())).thenReturn(true);
        Mockito.when(rateLimitInterceptor.preHandle(any(), any(), any())).thenReturn(true);
    }

    @Test
    void fetchOsmBoundaryReturnsGeoJsonWhenFound() throws Exception {
        String mockGeoJson = "{\"type\":\"Polygon\",\"coordinates\":[[[29.0,41.0],[29.1,41.0],[29.1,41.1],[29.0,41.0]]]}";
        when(osmBoundaryService.fetchGeoJson(eq("Kadıköy"), eq("İstanbul"), eq("TR")))
                .thenReturn(Optional.of(mockGeoJson));

        mockMvc.perform(get("/api/v1/admin/onboarding/osm-boundary")
                        .param("districtName", "Kadıköy")
                        .param("cityName", "İstanbul"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data").isString());
    }

    @Test
    void fetchOsmBoundaryReturns404WhenNotFound() throws Exception {
        when(osmBoundaryService.fetchGeoJson(anyString(), anyString(), eq("TR")))
                .thenReturn(Optional.empty());

        mockMvc.perform(get("/api/v1/admin/onboarding/osm-boundary")
                        .param("districtName", "BilinmeyenIlce")
                        .param("cityName", "BilinmeyenIl"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.errorCode").value("OSM_NOT_FOUND"));
    }

    @Test
    void fetchOsmBoundaryWithoutCityNameStillWorks() throws Exception {
        String mockGeoJson = "{\"type\":\"Polygon\",\"coordinates\":[[[29.0,41.0],[29.1,41.0],[29.1,41.1],[29.0,41.0]]]}";
        when(osmBoundaryService.fetchGeoJson(eq("Şişli"), isNull(), eq("TR")))
                .thenReturn(Optional.of(mockGeoJson));

        mockMvc.perform(get("/api/v1/admin/onboarding/osm-boundary")
                        .param("districtName", "Şişli"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }
}
