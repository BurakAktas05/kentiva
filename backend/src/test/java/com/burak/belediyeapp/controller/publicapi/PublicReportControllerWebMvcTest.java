package com.burak.belediyeapp.controller.publicapi;

import com.burak.belediyeapp.entity.Municipality;
import com.burak.belediyeapp.entity.Report;
import com.burak.belediyeapp.entity.ReportCategory;
import com.burak.belediyeapp.entity.ReportMedia;
import com.burak.belediyeapp.entity.ReportStatus;
import com.burak.belediyeapp.repository.IAppUserRepository;
import com.burak.belediyeapp.repository.IReportRepository;
import com.burak.belediyeapp.security.ApiKeyAuthFilter;
import com.burak.belediyeapp.security.JwtAuthenticationSupport;
import com.burak.belediyeapp.service.auth.JwtService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(PublicReportController.class)
@AutoConfigureMockMvc(addFilters = false)
class PublicReportControllerWebMvcTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean private IReportRepository reportRepository;
    @MockitoBean private JwtService jwtService;
    @MockitoBean private JwtAuthenticationSupport jwtAuthenticationSupport;
    @MockitoBean private IAppUserRepository userRepository;
    @MockitoBean private ApiKeyAuthFilter apiKeyAuthFilter;
    @MockitoBean private com.burak.belediyeapp.security.SubscriptionInterceptor subscriptionInterceptor;
    @MockitoBean private com.burak.belediyeapp.security.RateLimitInterceptor rateLimitInterceptor;

    @BeforeEach
    void stubInterceptors() throws Exception {
        when(subscriptionInterceptor.preHandle(any(), any(), any())).thenReturn(true);
        when(rateLimitInterceptor.preHandle(any(), any(), any())).thenReturn(true);
    }

    @Test
    void trackReportReturnsStatusWithoutMediaOrNotes() throws Exception {
        Municipality municipality = new Municipality();
        municipality.setId("muni-1");
        municipality.setName("Örnek Belediye");

        ReportCategory category = new ReportCategory();
        category.setId("cat-1");
        category.setName("Yol");

        Report report = new Report();
        report.setId("report-1");
        report.setTrackingNumber("KNT-260724-ABCD");
        report.setTitle("Çukur var");
        report.setReportStatus(ReportStatus.PROCESSING);
        report.setCategory(category);
        report.setMunicipality(municipality);
        report.setDistrict("Kadıköy");
        report.setCreatedAt(LocalDateTime.of(2026, 7, 24, 12, 0));
        report.setMediaList(new ArrayList<>(java.util.List.of(
                ReportMedia.builder().imageUrl("https://cdn.example/secret.jpg").resolvedImage(false).build()
        )));

        when(reportRepository.findByTrackingNumber("KNT-260724-ABCD")).thenReturn(Optional.of(report));

        mockMvc.perform(get("/api/v1/public/reports/track/KNT-260724-ABCD"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.trackingNumber").value("KNT-260724-ABCD"))
                .andExpect(jsonPath("$.data.title").value("Çukur var"))
                .andExpect(jsonPath("$.data.status").value("PROCESSING"))
                .andExpect(jsonPath("$.data.categoryName").value("Yol"))
                .andExpect(jsonPath("$.data.municipalityName").value("Örnek Belediye"))
                .andExpect(jsonPath("$.data.mediaUrls").isArray())
                .andExpect(jsonPath("$.data.mediaUrls").isEmpty())
                .andExpect(jsonPath("$.data.resolvedMediaUrls").isEmpty())
                .andExpect(jsonPath("$.data.resolutionNote").isEmpty());
    }

    @Test
    void trackReportReturnsNotFoundForUnknownTrackingNumber() throws Exception {
        when(reportRepository.findByTrackingNumber("MISSING")).thenReturn(Optional.empty());

        mockMvc.perform(get("/api/v1/public/reports/track/MISSING"))
                .andExpect(status().isNotFound());
    }
}
