package com.burak.belediyeapp.controller;

import com.burak.belediyeapp.dto.response.common.ApiResponse;
import com.burak.belediyeapp.dto.response.pilot.PilotSuccessSummaryResponse;
import com.burak.belediyeapp.entity.AppUser;
import com.burak.belediyeapp.service.pilot.PilotSuccessService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/pilot")
@RequiredArgsConstructor
@Tag(name = "Pilot Basari", description = "Belediye pilot sureci ve satis donusum metrikleri")
public class PilotSuccessController {

    private final PilotSuccessService pilotSuccessService;

    @GetMapping("/summary")
    @PreAuthorize("hasAnyAuthority('ROLE_WHITE_DESK','ROLE_DEPT_MANAGER','ROLE_ADMIN')")
    @Operation(summary = "Pilot basari ozeti")
    public ResponseEntity<ApiResponse<PilotSuccessSummaryResponse>> getSummary(
            @AuthenticationPrincipal AppUser currentUser) {
        return ResponseEntity.ok(ApiResponse.success(pilotSuccessService.getSummary(currentUser)));
    }
}
