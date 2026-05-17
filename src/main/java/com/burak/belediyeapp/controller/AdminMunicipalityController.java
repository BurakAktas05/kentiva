package com.burak.belediyeapp.controller;

import com.burak.belediyeapp.dto.request.municipality.CreateMunicipalityRequest;
import com.burak.belediyeapp.dto.request.municipality.GenerateNotificationTemplateRequest;
import com.burak.belediyeapp.dto.request.municipality.MunicipalityPatchRequest;
import com.burak.belediyeapp.dto.response.common.ApiResponse;
import com.burak.belediyeapp.dto.response.municipality.MunicipalityDto;
import com.burak.belediyeapp.dto.response.municipality.NotificationTemplateAiResponse;
import com.burak.belediyeapp.service.municipality.MunicipalityManagementService;
import com.burak.belediyeapp.service.geo.OsmBoundaryService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/admin/municipalities")
@RequiredArgsConstructor
@Tag(name = "Süper admin — Belediyeler", description = "Çok kiracılı SaaS yönetimi")
public class AdminMunicipalityController {

    private final MunicipalityManagementService municipalityManagementService;
    private final OsmBoundaryService osmBoundaryService;

    @GetMapping
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    @Operation(summary = "Tüm belediyeler")
    public ResponseEntity<ApiResponse<List<MunicipalityDto>>> list() {
        return ResponseEntity.ok(ApiResponse.success(municipalityManagementService.listAll()));
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

    @PostMapping("/{id}/boundaries/fetch-from-osm")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    @Operation(summary = "OSM Nominatim'den cografi sinir otomatik cek ve kaydet")
    public ResponseEntity<ApiResponse<String>> fetchBoundaryFromOsm(
            @PathVariable String id,
            @RequestBody Map<String, String> body) {
        String districtName = body.get("districtName");
        String cityName     = body.get("cityName");
        String countryCode  = body.getOrDefault("countryCode", "TR");

        if (districtName == null || districtName.isBlank()) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("districtName zorunludur.", "MISSING_DISTRICT_NAME"));
        }

        java.util.Optional<String> geoJsonOpt = osmBoundaryService.fetchGeoJson(districtName, cityName, countryCode);
        if (geoJsonOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(ApiResponse.error(
                            "OpenStreetMap'te '" + districtName + "' icin cografi sinir bulunamadi.",
                            "OSM_NOT_FOUND"));
        }
        municipalityManagementService.updateBoundariesFromOsm(id, geoJsonOpt.get());
        return ResponseEntity.ok(ApiResponse.success("Cografi sinir OpenStreetMap'ten alindi ve kaydedildi.", (String) null));
    }

    /**
     * Manuel GeoJSON yukle.
     * Body: { "geoJson": "{ \"type\": \"Polygon\", ... }" }
     */
    @PostMapping("/{id}/boundaries")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    @Operation(summary = "Manuel GeoJSON sinir yukle")
    public ResponseEntity<ApiResponse<String>> uploadBoundary(
            @PathVariable String id,
            @RequestBody Map<String, String> body) {
        String geoJson = body.get("geoJson");
        if (geoJson == null || geoJson.isBlank()) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("geoJson alani zorunludur.", "MISSING_GEOJSON"));
        }
        municipalityManagementService.updateBoundaries(id, geoJson);
        return ResponseEntity.ok(ApiResponse.success("Cografi sinir kaydedildi.", (String) null));
    }
}
