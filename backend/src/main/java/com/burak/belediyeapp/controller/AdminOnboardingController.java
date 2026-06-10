package com.burak.belediyeapp.controller;

import com.burak.belediyeapp.dto.request.municipality.MunicipalityOnboardingRequest;
import com.burak.belediyeapp.dto.response.common.ApiResponse;
import com.burak.belediyeapp.dto.response.municipality.MunicipalityOnboardingResponse;
import com.burak.belediyeapp.service.municipality.MunicipalityOnboardingService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/admin/onboarding")
@RequiredArgsConstructor
@PreAuthorize("hasRole('SUPER_ADMIN')")
@Tag(name = "Süper admin — Onboarding", description = "Yeni belediye kurulum sihirbazı")
public class AdminOnboardingController {

    private final MunicipalityOnboardingService municipalityOnboardingService;

    @PostMapping
    @Operation(summary = "Belediye onboarding (belediye + admin + kategoriler)")
    public ResponseEntity<ApiResponse<MunicipalityOnboardingResponse>> onboard(
            @Valid @RequestBody MunicipalityOnboardingRequest request) {
        MunicipalityOnboardingResponse result = municipalityOnboardingService.onboard(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Belediye kurulumu tamamlandı", result));
    }
}
