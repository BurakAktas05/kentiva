package com.burak.belediyeapp.controller;

import com.burak.belediyeapp.dto.request.municipality.MunicipalityPatchRequest;
import com.burak.belediyeapp.dto.response.common.ApiResponse;
import com.burak.belediyeapp.dto.response.municipality.MunicipalityDto;
import com.burak.belediyeapp.entity.AppUser;
import com.burak.belediyeapp.service.municipality.MunicipalityManagementService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/municipalities")
@RequiredArgsConstructor
@Tag(name = "Belediye ayarları", description = "Kendi belediyesi markalama bilgileri")
public class MunicipalitySettingsController {

    private final MunicipalityManagementService municipalityManagementService;

    @GetMapping("/me")
    @PreAuthorize("hasAnyRole('ADMIN','DEPT_MANAGER','FIELD_OFFICER')")
    @Operation(summary = "Oturum sahibinin belediye kartı")
    public ResponseEntity<ApiResponse<MunicipalityDto>> me(@AuthenticationPrincipal AppUser user) {
        return ResponseEntity.ok(ApiResponse.success(municipalityManagementService.getForCurrentUser(user)));
    }

    @PatchMapping("/me/branding")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Belediye marka ve iletişim alanlarını güncelle")
    public ResponseEntity<ApiResponse<MunicipalityDto>> patchBranding(
            @AuthenticationPrincipal AppUser user,
            @Valid @RequestBody MunicipalityPatchRequest request) {
        return ResponseEntity.ok(ApiResponse.success(municipalityManagementService.patchOwnTenant(user, request)));
    }
}
