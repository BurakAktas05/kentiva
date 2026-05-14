package com.burak.belediyeapp.controller;

import com.burak.belediyeapp.dto.request.municipality.CreateMunicipalityRequest;
import com.burak.belediyeapp.dto.request.municipality.MunicipalityPatchRequest;
import com.burak.belediyeapp.dto.response.common.ApiResponse;
import com.burak.belediyeapp.dto.response.municipality.MunicipalityDto;
import com.burak.belediyeapp.service.municipality.MunicipalityManagementService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/admin/municipalities")
@RequiredArgsConstructor
@Tag(name = "Süper admin — Belediyeler", description = "Çok kiracılı SaaS yönetimi")
public class AdminMunicipalityController {

    private final MunicipalityManagementService municipalityManagementService;

    @GetMapping
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    @Operation(summary = "Tüm belediyeler")
    public ResponseEntity<ApiResponse<List<MunicipalityDto>>> list() {
        return ResponseEntity.ok(ApiResponse.success(municipalityManagementService.listAll()));
    }

    @PostMapping
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    @Operation(summary = "Yeni belediye oluştur")
    public ResponseEntity<ApiResponse<MunicipalityDto>> create(@Valid @RequestBody CreateMunicipalityRequest request) {
        MunicipalityDto dto = municipalityManagementService.create(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success("Belediye oluşturuldu", dto));
    }

    @PatchMapping("/{id}")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    @Operation(summary = "Belediye güncelle (onboarding, slug, marka)")
    public ResponseEntity<ApiResponse<MunicipalityDto>> patch(
            @PathVariable String id,
            @Valid @RequestBody MunicipalityPatchRequest request) {
        return ResponseEntity.ok(ApiResponse.success(municipalityManagementService.patchBySuperAdmin(id, request)));
    }
}
