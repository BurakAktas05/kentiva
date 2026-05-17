package com.burak.belediyeapp.controller;

import com.burak.belediyeapp.dto.response.common.ApiResponse;
import com.burak.belediyeapp.dto.response.dashboard.DashboardStatsResponse;
import com.burak.belediyeapp.dto.response.dashboard.PredictiveInsightDto;
import com.burak.belediyeapp.service.analytics.PredictiveMaintenanceService;
import com.burak.belediyeapp.service.dashboard.DashboardService;

import java.util.List;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/dashboard")
@RequiredArgsConstructor
@Tag(name = "Dashboard", description = "Yönetici dashboard istatistikleri")
public class DashboardController {

    private final DashboardService dashboardService;
    private final PredictiveMaintenanceService predictiveMaintenanceService;

    @GetMapping("/stats")
    @PreAuthorize("hasAnyAuthority('ROLE_DEPT_MANAGER','ROLE_ADMIN','ROLE_SUPER_ADMIN')")
    @Operation(summary = "Dashboard istatistiklerini getir")
    public ResponseEntity<ApiResponse<DashboardStatsResponse>> getStats(
            @org.springframework.security.core.annotation.AuthenticationPrincipal com.burak.belediyeapp.entity.AppUser currentUser) {
        return ResponseEntity.ok(ApiResponse.success(dashboardService.getStats(currentUser)));
    }

    @GetMapping("/predictive-insights")
    @PreAuthorize("hasAnyAuthority('ROLE_DEPT_MANAGER','ROLE_ADMIN','ROLE_SUPER_ADMIN')")
    @Operation(summary = "Tahminsel bakım — yoğunluk ve trend uyarıları")
    public ResponseEntity<ApiResponse<List<PredictiveInsightDto>>> predictiveInsights(
            @org.springframework.security.core.annotation.AuthenticationPrincipal com.burak.belediyeapp.entity.AppUser currentUser) {
        return ResponseEntity.ok(ApiResponse.success(predictiveMaintenanceService.getInsights(currentUser)));
    }
}
