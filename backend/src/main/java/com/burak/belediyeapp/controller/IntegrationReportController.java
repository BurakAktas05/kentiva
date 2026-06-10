package com.burak.belediyeapp.controller;

import com.burak.belediyeapp.dto.response.common.ApiResponse;
import com.burak.belediyeapp.dto.response.report.ReportListResponse;
import com.burak.belediyeapp.dto.response.report.ReportResponse;
import com.burak.belediyeapp.entity.ReportStatus;
import com.burak.belediyeapp.security.ApiKeyPrincipal;
import com.burak.belediyeapp.service.integration.IntegrationReportService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/integration/reports")
@RequiredArgsConstructor
@Tag(name = "Entegrasyon API", description = "ERP/CRM — API anahtarı ile rapor okuma")
public class IntegrationReportController {

    private final IntegrationReportService integrationReportService;

    @GetMapping
    @PreAuthorize("hasRole('API_CLIENT')")
    @Operation(summary = "Belediye raporlarını listele (API anahtarı)")
    public ResponseEntity<ApiResponse<Page<ReportListResponse>>> listReports(
            @AuthenticationPrincipal ApiKeyPrincipal principal,
            @RequestParam(required = false) ReportStatus status,
            @PageableDefault(size = 50, sort = "createdAt") Pageable pageable) {
        Page<ReportListResponse> page = integrationReportService.listReports(principal, status, pageable);
        return ResponseEntity.ok(ApiResponse.success(page));
    }

    @GetMapping("/{reportId}")
    @PreAuthorize("hasRole('API_CLIENT')")
    @Operation(summary = "Rapor detayı (API anahtarı)")
    public ResponseEntity<ApiResponse<ReportResponse>> getReport(
            @AuthenticationPrincipal ApiKeyPrincipal principal,
            @PathVariable String reportId) {
        return ResponseEntity.ok(ApiResponse.success(
                integrationReportService.getReport(principal, reportId)));
    }
}
