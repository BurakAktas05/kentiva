package com.burak.belediyeapp.controller;

import com.burak.belediyeapp.dto.request.report.AssignReportRequest;
import com.burak.belediyeapp.dto.request.report.UpdateReportStatusRequest;
import com.burak.belediyeapp.dto.response.report.ReportResponse;
import com.burak.belediyeapp.repository.IAppUserRepository;
import com.burak.belediyeapp.security.ApiKeyAuthFilter;
import com.burak.belediyeapp.security.JwtAuthenticationSupport;
import com.burak.belediyeapp.service.auth.JwtService;
import com.burak.belediyeapp.service.report.ReportService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(ReportWorkflowController.class)
@AutoConfigureMockMvc(addFilters = false)
class ReportWorkflowControllerWebMvcTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean private ReportService reportService;
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
    void updateStatusSucceeds() throws Exception {
        ReportResponse response = new ReportResponse(
                "report-123",
                "Çukur Var Yolda",
                "Yol ortasında büyük bir çukur var.",
                "PROCESSING",
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

        when(reportService.updateReportStatus(eq("report-123"), any(UpdateReportStatusRequest.class), any())).thenReturn(response);

        mockMvc.perform(patch("/api/v1/reports/report-123/status")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "status": "PROCESSING",
                                  "note": "İhbar işleme alındı, ekipler yönlendiriliyor."
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.status").value("PROCESSING"));
    }

    @Test
    void assignReportSucceeds() throws Exception {
        ReportResponse response = new ReportResponse(
                "report-123",
                "Çukur Var Yolda",
                "Yol ortasında büyük bir çukur var.",
                "PROCESSING",
                "Yol",
                "Citizen User",
                "Field Officer FullName",
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

        when(reportService.assignReport(eq("report-123"), any(AssignReportRequest.class), any())).thenReturn(response);

        mockMvc.perform(post("/api/v1/reports/report-123/assign")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "assigneeId": "officer-456",
                                  "note": "Lütfen kontrol et."
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.assigneeFullName").value("Field Officer FullName"));
    }
}
