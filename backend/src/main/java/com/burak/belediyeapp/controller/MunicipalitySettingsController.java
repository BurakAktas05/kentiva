package com.burak.belediyeapp.controller;

import com.burak.belediyeapp.dto.request.municipality.GenerateNotificationTemplateRequest;
import com.burak.belediyeapp.dto.request.municipality.MunicipalityPatchRequest;
import com.burak.belediyeapp.dto.response.common.ApiResponse;
import com.burak.belediyeapp.dto.response.municipality.MunicipalityDto;
import com.burak.belediyeapp.dto.response.municipality.NotificationTemplateAiResponse;
import com.burak.belediyeapp.entity.AppUser;
import com.burak.belediyeapp.exception.BusinessException;
import com.burak.belediyeapp.service.geo.MunicipalityBoundaryAutoSyncService;
import com.burak.belediyeapp.service.municipality.MunicipalityManagementService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/v1/municipalities")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Belediye ayarları", description = "Kendi belediyesi markalama bilgileri")
public class MunicipalitySettingsController {

    private final MunicipalityManagementService municipalityManagementService;
    private final MunicipalityBoundaryAutoSyncService boundaryAutoSyncService;

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

    /**
     * Belediye sınırı OpenStreetMap'ten otomatik çekilir.
     * Admin'in district / city girmesine gerek yok — belediye adı + parent büyükşehir adı kullanılır.
     */
    @PostMapping("/me/boundaries/refresh")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Sınırı OpenStreetMap'ten yenile (otomatik, parametre gerekmez)")
    public ResponseEntity<ApiResponse<String>> refreshBoundary(@AuthenticationPrincipal AppUser user) {
        if (user.getMunicipality() == null) {
            throw new BusinessException("Bu hesap bir belediyeye bağlı değil", "MUNICIPALITY_NOT_ASSIGNED");
        }
        boolean ok = boundaryAutoSyncService.syncNow(user.getMunicipality().getId());
        if (!ok) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(ApiResponse.error(
                            "OpenStreetMap üzerinde belediye sınırı bulunamadı. "
                                    + "Belediye adının resmi OSM yazımıyla eşleştiğinden emin olun.",
                            "OSM_NOT_FOUND"));
        }
        return ResponseEntity.ok(ApiResponse.success("Coğrafi sınır OpenStreetMap'ten alındı ve kaydedildi.", null));
    }
}
