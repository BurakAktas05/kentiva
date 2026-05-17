package com.burak.belediyeapp.controller;

import com.burak.belediyeapp.dto.request.municipality.GenerateNotificationTemplateRequest;
import com.burak.belediyeapp.dto.request.municipality.MunicipalityPatchRequest;
import com.burak.belediyeapp.dto.response.common.ApiResponse;
import com.burak.belediyeapp.dto.response.municipality.MunicipalityDto;
import com.burak.belediyeapp.dto.response.municipality.NotificationTemplateAiResponse;
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
import org.springframework.web.multipart.MultipartFile;

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

    @PostMapping("/me/branding/ai-notification-template")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "AI ile SMS / push şablon metni üret")
    public ResponseEntity<ApiResponse<NotificationTemplateAiResponse>> aiNotificationTemplate(
            @AuthenticationPrincipal AppUser user,
            @Valid @RequestBody GenerateNotificationTemplateRequest request) {
        return ResponseEntity.ok(ApiResponse.success(
                municipalityManagementService.generateNotificationTemplate(user, request.kind())));
    }

    @PostMapping(value = "/me/branding/logo", consumes = "multipart/form-data")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Belediye logosu yükle (max 2 MB)")
    public ResponseEntity<ApiResponse<String>> uploadLogo(
            @AuthenticationPrincipal AppUser user,
            @RequestParam("file") MultipartFile file) {
        String url = municipalityManagementService.uploadLogoForTenant(user, file);
        return ResponseEntity.ok(ApiResponse.success("Logo yüklendi", url));
    }

    @PostMapping("/me/boundaries")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Belediye sınırlarını GeoJSON ile güncelle")
    public ResponseEntity<ApiResponse<Void>> uploadBoundaries(
            @AuthenticationPrincipal AppUser user,
            @RequestBody String geoJson) {
        municipalityManagementService.updateBoundaries(user.getMunicipality().getId(), geoJson);
        return ResponseEntity.ok(ApiResponse.success("Belediye sınırları başarıyla güncellendi.", null));
    }
}
