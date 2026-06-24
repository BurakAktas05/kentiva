package com.burak.belediyeapp.controller;

import com.burak.belediyeapp.dto.request.municipality.CreateMunicipalityRequest;
import com.burak.belediyeapp.dto.request.municipality.GenerateNotificationTemplateRequest;
import com.burak.belediyeapp.dto.request.municipality.MunicipalityPatchRequest;
import com.burak.belediyeapp.dto.response.common.ApiResponse;
import com.burak.belediyeapp.dto.response.municipality.MunicipalityDto;
import com.burak.belediyeapp.dto.response.municipality.MunicipalityBoundaryDto;
import com.burak.belediyeapp.dto.response.municipality.NotificationTemplateAiResponse;
import com.burak.belediyeapp.service.geo.MunicipalityBoundaryAutoSyncService;
import com.burak.belediyeapp.service.municipality.MunicipalityManagementService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;

@RestController
@RequestMapping("/api/v1/admin/municipalities")
@RequiredArgsConstructor
@Tag(name = "Süper admin — Belediyeler", description = "Çok kiracılı SaaS yönetimi")
public class AdminMunicipalityController {

    private final MunicipalityManagementService municipalityManagementService;
    private final MunicipalityBoundaryAutoSyncService boundaryAutoSyncService;

    @GetMapping
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    @Operation(summary = "Tüm belediyeler")
    public ResponseEntity<ApiResponse<Page<MunicipalityDto>>> list(Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(municipalityManagementService.listAll(pageable)));
    }

    @GetMapping("/boundaries")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    @Operation(summary = "Tüm belediyelerin sınırlarını GeoJSON olarak getir (süper admin)")
    public ResponseEntity<ApiResponse<List<MunicipalityBoundaryDto>>> getAllBoundaries() {
        return ResponseEntity.ok(ApiResponse.success(municipalityManagementService.getAllBoundariesGeoJson()));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    @Operation(summary = "Belediye detayı")
    public ResponseEntity<ApiResponse<MunicipalityDto>> get(@PathVariable String id) {
        return ResponseEntity.ok(ApiResponse.success(municipalityManagementService.getById(id)));
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

    @PostMapping("/{id}/branding/ai-notification-template")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    @Operation(summary = "AI ile SMS / push şablon metni üret (süper admin)")
    public ResponseEntity<ApiResponse<NotificationTemplateAiResponse>> aiNotificationTemplate(
            @PathVariable String id,
            @Valid @RequestBody GenerateNotificationTemplateRequest request) {
        return ResponseEntity.ok(ApiResponse.success(
                municipalityManagementService.generateNotificationTemplateForSuperAdmin(id, request.kind())));
    }

    @PostMapping(value = "/{id}/branding/logo", consumes = "multipart/form-data")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    @Operation(summary = "Belediye logosu yükle (süper admin)")
    public ResponseEntity<ApiResponse<String>> uploadLogo(
            @PathVariable String id,
            @RequestParam("file") MultipartFile file) {
        String url = municipalityManagementService.uploadLogoBySuperAdmin(id, file);
        return ResponseEntity.ok(ApiResponse.success("Logo yüklendi", url));
    }

    /**
     * Sınırı OpenStreetMap'ten otomatik yeniler — parametre gerekmez.
     * Süper admin tarafında genelde belediye oluşturulduktan sonra otomatik tetiklenir;
     * bu endpoint manuel yenileme içindir.
     */
    @PostMapping("/{id}/boundaries/refresh")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    @Operation(summary = "Sınırı OpenStreetMap'ten yenile (otomatik)")
    public ResponseEntity<ApiResponse<String>> refreshBoundary(@PathVariable String id) {
        boolean ok = boundaryAutoSyncService.syncNow(id);
        if (!ok) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(ApiResponse.error(
                            "OpenStreetMap uzerinde belediye siniri bulunamadi. "
                                    + "Belediye adinin OSM yazimiyla eslestiginden emin olun.",
                            "OSM_NOT_FOUND"));
        }
        return ResponseEntity.ok(ApiResponse.success("Cografi sinir OpenStreetMap'ten alindi ve kaydedildi.", (String) null));
    }

    @PutMapping("/{id}/boundaries")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    @Operation(summary = "Belediye sınırını GeoJSON olarak güncelle (süper admin)")
    public ResponseEntity<ApiResponse<Void>> updateBoundaries(
            @PathVariable String id,
            @RequestBody String geoJson) {
        municipalityManagementService.updateBoundaries(id, geoJson);
        return ResponseEntity.ok(ApiResponse.success("Coğrafi sınır güncellendi", null));
    }

    @GetMapping("/catalog/provinces")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    @Operation(summary = "Katalog illerini listele (süper admin)")
    public ResponseEntity<ApiResponse<List<com.burak.belediyeapp.dto.response.publicapi.PublicProvinceDto>>> listProvinces() {
        return ResponseEntity.ok(ApiResponse.success(municipalityManagementService.listProvincesForAdmin()));
    }

    @GetMapping("/catalog/districts")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    @Operation(summary = "Katalog ilçelerini listele (süper admin)")
    public ResponseEntity<ApiResponse<List<com.burak.belediyeapp.dto.response.municipality.AdminDistrictCatalogDto>>> listDistricts(
            @RequestParam(required = false) String plateCode) {
        return ResponseEntity.ok(ApiResponse.success(municipalityManagementService.listDistrictsForAdmin(plateCode)));
    }

    @GetMapping("/catalog/districts/{id}/boundary")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    @Operation(summary = "Katalog ilçe sınırını GeoJSON olarak getir (süper admin)")
    public ResponseEntity<ApiResponse<String>> getDistrictBoundary(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(municipalityManagementService.getDistrictBoundaryGeoJson(id)));
    }

    @GetMapping("/{id}/boundaries")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    @Operation(summary = "Belediye sınırını GeoJSON olarak getir (süper admin)")
    public ResponseEntity<ApiResponse<String>> getMunicipalityBoundary(@PathVariable String id) {
        return ResponseEntity.ok(ApiResponse.success(municipalityManagementService.getMunicipalityBoundaryGeoJson(id)));
    }


}
