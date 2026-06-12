package com.burak.belediyeapp.controller;

import com.burak.belediyeapp.dto.request.report.CreateReportRequest;
import com.burak.belediyeapp.dto.response.common.ApiResponse;
import com.burak.belediyeapp.dto.response.report.ReportListResponse;
import com.burak.belediyeapp.dto.response.report.ReportResponse;
import com.burak.belediyeapp.repository.IAppUserRepository;
import com.burak.belediyeapp.security.ApiKeyAuthFilter;
import com.burak.belediyeapp.security.JwtAuthenticationSupport;
import com.burak.belediyeapp.service.auth.JwtService;
import com.burak.belediyeapp.service.media.ImageAnonymizationService;
import com.burak.belediyeapp.service.media.MediaGuardClient;
import com.burak.belediyeapp.service.report.ReportDraftAnalysisService;
import com.burak.belediyeapp.service.report.ReportService;
import com.burak.belediyeapp.service.storage.StorageService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.data.domain.PageImpl;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(ReportCrudController.class)
@AutoConfigureMockMvc(addFilters = false)
class ReportCrudControllerWebMvcTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean private ReportService reportService;
    @MockitoBean private ReportDraftAnalysisService draftAnalysisService;
    @MockitoBean private StorageService storageService;
    @MockitoBean private MediaGuardClient mediaGuardClient;
    @MockitoBean private ImageAnonymizationService imageAnonymizationService;
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
    void createReportSucceedsWithValidRequest() throws Exception {
        ReportResponse response = new ReportResponse(
                "report-123",
                "Çukur Var Yolda",
                "Yol ortasında büyük bir çukur var.",
                "PENDING",
                "Yol",
                "Citizen User",
                null,
                40.99,
                29.02,
                LocalDateTime.now(),
                LocalDateTime.now(),
                List.of(),
                List.of(),
                "Kadıköy",
                "HIGH",
                "Yol hasarı",
                "Yol",
                "LOW",
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                false
        );

        when(reportService.createReport(any(CreateReportRequest.class), any())).thenReturn(response);

        mockMvc.perform(post("/api/v1/reports")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "title": "Çukur Var Yolda",
                                  "description": "Yol ortasında büyük bir çukur var.",
                                  "categoryId": "cat-1",
                                  "latitude": 40.99,
                                  "longitude": 29.02,
                                  "district": "Kadıköy",
                                  "mediaUrls": [],
                                  "targetMunicipalityId": "muni-1",
                                  "kvkkApproved": true
                                }
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.id").value("report-123"))
                .andExpect(jsonPath("$.data.status").value("PENDING"));
    }

    @Test
    void getMyReportsReturnsPageOfReports() throws Exception {
        ReportListResponse item = new ReportListResponse(
                "report-123",
                "Çukur Var Yolda",
                "PENDING",
                "Yol",
                40.99,
                29.02,
                LocalDateTime.now(),
                "Kadıköy",
                "HIGH",
                "LOW",
                null,
                null,
                "Kadıköy Belediyesi",
                null,
                false
        );

        when(reportService.getMyReports(any(), any())).thenReturn(new PageImpl<>(List.of(item)));

        mockMvc.perform(get("/api/v1/reports/my"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.content[0].id").value("report-123"));
    }
}
