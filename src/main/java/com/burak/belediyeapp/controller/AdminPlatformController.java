package com.burak.belediyeapp.controller;

import com.burak.belediyeapp.dto.response.admin.PlatformDashboardResponse;
import com.burak.belediyeapp.dto.response.common.ApiResponse;
import com.burak.belediyeapp.service.admin.PlatformDashboardService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/admin/platform")
@RequiredArgsConstructor
@Tag(name = "Süper admin — Platform", description = "Kentiva operatör dashboard")
public class AdminPlatformController {

    private final PlatformDashboardService platformDashboardService;

    @GetMapping("/dashboard")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    @Operation(summary = "Platform özeti — belediyeler, üyelik, kullanım")
    public ResponseEntity<ApiResponse<PlatformDashboardResponse>> dashboard() {
        return ResponseEntity.ok(ApiResponse.success(platformDashboardService.getDashboard()));
    }
}
